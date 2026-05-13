import mongoose, { ClientSession, Types } from 'mongoose';
import { PERMISSIONS, SYSTEM_ROLES } from '../../constants/permissions.js';
import { AuthJwtPayload } from '../../utils/jwtHelpers.js';
import { AppError } from '../../utils/AppError.js';
import { Address } from '../address/address.model.js';
import { AdminDashboardService } from '../adminDashboard/adminDashboard.service.js';
import { Cart } from '../cart/cart.model.js';
import { NotificationService } from '../notification/notification.service.js';
import { DeliveryAvailabilityService } from '../delivery/deliveryAvailability.service.js';
import { PRODUCT_STATUS } from '../products/product.interface.js';
import { Product } from '../products/product.model.js';
import { getProductEffectivePrice } from '../products/product.service.js';
import { Role } from '../role/role.model.js';
import { Shop } from '../shop/shop.model.js';
import { MessagingService } from '../messaging/messaging.service.js';
import { getSocketServer } from '../../socket/socket.manager.js';
import { emitOrderChatStatus } from '../../socket/socket.chat.js';
import { emitToDelivery, emitToOrder, emitToSeller, emitToUser } from '../../socket/socket.manager.js';
import { User } from '../user/user.model.js';
import { ORDER_FEES } from './order.constants.js';
import {
  DELIVERY_STATUS,
  DeliveryStatus,
  IOrderItem,
  IShippingAddressSnapshot,
  ORDER_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  OrderStatus,
} from './order.interface.js';
import { Order } from './order.model.js';

const validateObjectId = (id: string, entity: string) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, `Invalid ${entity} id`);
  }
};

const isAdminUser = (authUser: AuthJwtPayload): boolean => {
  return authUser.roleName === SYSTEM_ROLES.ADMIN || authUser.permissions.includes(PERMISSIONS.ALL);
};

const assertDeliveryPartnerUser = async (deliveryPartnerId: string) => {
  validateObjectId(deliveryPartnerId, 'delivery partner');

  const deliveryRole = await Role.findOne({ name: SYSTEM_ROLES.DELIVERY }).select('_id').lean();
  if (!deliveryRole) {
    throw new AppError(400, 'Delivery role is not configured');
  }

  const deliveryPartner = await User.exists({
    _id: deliveryPartnerId,
    role: deliveryRole._id,
    isBlocked: false,
  });

  if (!deliveryPartner) {
    throw new AppError(404, 'Delivery partner not found');
  }
};

const buildAddressSnapshot = (address: NonNullable<Awaited<ReturnType<typeof Address.findOne>>>) : IShippingAddressSnapshot => ({
  fullName: address.fullName,
  phone: address.phone,
  pincode: address.pincode,
  city: address.city,
  state: address.state,
  street: address.street,
  landmark: address.landmark,
  location: address.location,
});

const getSellerIdsByProductIds = async (productIds: Types.ObjectId[], session?: ClientSession) => {
  const products = await Product.find({ _id: { $in: productIds } })
    .select('shop')
    .session(session ?? null)
    .lean();
  const shopIds = [...new Set(products.map((product) => product.shop.toString()))];
  const shops = await Shop.find({ _id: { $in: shopIds } })
    .select('owner')
    .session(session ?? null)
    .lean();

  return shops.map((shop) => shop.owner);
};

const triggerOrderStatusNotification = async (
  userId: Types.ObjectId,
  orderId: string,
  previousStatus: OrderStatus,
  currentStatus: OrderStatus
) => {
  if (previousStatus === currentStatus) {
    return;
  }

  if (currentStatus === ORDER_STATUS.CONFIRMED) {
    await NotificationService.notifyOrderAccepted(userId, orderId);
    return;
  }

  if (currentStatus === ORDER_STATUS.CANCELLED) {
    await NotificationService.notifyOrderCancelled(userId, orderId);
    return;
  }

  if (currentStatus === ORDER_STATUS.DELIVERED) {
    await NotificationService.notifyOrderDelivered(userId, orderId);
    return;
  }

  if (currentStatus === ORDER_STATUS.OUT_FOR_DELIVERY) {
    await NotificationService.notifyDeliveryAssigned(userId, orderId);
    return;
  }

  await NotificationService.notifyOrderUpdate(userId, orderId, currentStatus);
};

const DELIVERY_TRACKING_EVENT = 'ORDER_UPDATED';

const getDeliveryStatusLabel = (status: DeliveryStatus): string => {
  if (status === DELIVERY_STATUS.PICKED_UP) {
    return 'picked up';
  }

  if (status === DELIVERY_STATUS.OUT_FOR_DELIVERY) {
    return 'out for delivery';
  }

  return 'delivered';
};

const assertValidDeliveryStatusTransition = (
  currentStatus: DeliveryStatus | undefined,
  nextStatus: DeliveryStatus
) => {
  const transitionOrder = [
    DELIVERY_STATUS.PICKED_UP,
    DELIVERY_STATUS.OUT_FOR_DELIVERY,
    DELIVERY_STATUS.DELIVERED,
  ];

  const currentIndex = currentStatus ? transitionOrder.indexOf(currentStatus) : -1;
  const nextIndex = transitionOrder.indexOf(nextStatus);

  if (nextIndex <= currentIndex) {
    throw new AppError(400, 'Invalid delivery status transition');
  }
};

const emitDeliveryTrackingUpdate = (
  orderId: string,
  buyerId: string,
  sellerIds: Types.ObjectId[],
  deliveryPartnerId: string,
  payload: Record<string, unknown>
) => {
  try {
    emitToOrder(orderId, DELIVERY_TRACKING_EVENT, payload);
    emitToUser(buyerId, DELIVERY_TRACKING_EVENT, payload);
    emitToDelivery(deliveryPartnerId, DELIVERY_TRACKING_EVENT, payload);

    sellerIds.forEach((sellerId) => {
      emitToSeller(sellerId.toString(), DELIVERY_TRACKING_EVENT, payload);
    });
  } catch (_error) {
    // Delivery status is persisted; realtime tracking is best-effort.
  }
};

const placeCodOrder = async (userId: string, addressId: string) => {
  validateObjectId(addressId, 'address');

  const session = await mongoose.startSession();

  try {
    const result = await session.withTransaction(async () => {
      const cart = await Cart.findOne({ user: userId }).session(session);
      if (!cart || cart.items.length === 0) {
        throw new AppError(400, 'Cart is empty');
      }

      const address = await Address.findOne({ _id: addressId, user: userId }).session(session);
      if (!address) {
        throw new AppError(404, 'Address not found');
      }

      const orderItems: IOrderItem[] = [];
      let subtotal = 0;

      for (const item of cart.items) {
        const product = await Product.findOne({
          _id: item.product,
          isActive: true,
          status: PRODUCT_STATUS.PUBLISHED,
        }).session(session);

        if (!product) {
          throw new AppError(400, 'A product in your cart is no longer available');
        }

        if (product.stock < item.quantity) {
          throw new AppError(400, `${product.title} has insufficient stock`);
        }

        const updatedProduct = await Product.findOneAndUpdate(
          {
            _id: product._id,
            stock: { $gte: item.quantity },
            isActive: true,
            status: PRODUCT_STATUS.PUBLISHED,
          },
          {
            $inc: {
              stock: -item.quantity,
              soldCount: item.quantity,
            },
          },
          {
            new: true,
            session,
          }
        );

        if (!updatedProduct) {
          throw new AppError(400, `${product.title} has insufficient stock`);
        }

        const price = getProductEffectivePrice(product);
        subtotal += price * item.quantity;

        orderItems.push({
          product: product._id,
          quantity: item.quantity,
          price,
        });
      }

      const deliveryFee = ORDER_FEES.DELIVERY_FEE;
      const platformFee = ORDER_FEES.PLATFORM_FEE;
      const totalAmount = subtotal + deliveryFee + platformFee;

      const [order] = await Order.create(
        [
          {
            user: userId,
            items: orderItems,
            shippingAddress: buildAddressSnapshot(address),
            paymentMethod: PAYMENT_METHOD.COD,
            paymentStatus: PAYMENT_STATUS.PENDING,
            orderStatus: ORDER_STATUS.PENDING,
            subtotal,
            deliveryFee,
            platformFee,
            totalAmount,
          },
        ],
        { session }
      );

      const sellerIds = await getSellerIdsByProductIds(
        orderItems.map((item) => item.product),
        session
      );

      await MessagingService.createOrderConversation(
        {
          orderId: order._id,
          buyerId: userId,
          sellerIds,
        },
        session
      );

      await Cart.updateOne(
        { user: userId },
        {
          $set: {
            items: [],
            subtotal: 0,
            totalItems: 0,
          },
        },
        { session }
      );

      return {
        order,
        sellerIds,
      };
    });

    await NotificationService.notifyNewOrder(result.sellerIds, result.order.id);
    await AdminDashboardService.emitPlatformActivityStats();

    return result.order.populate('items.product');
  } finally {
    await session.endSession();
  }
};

const getMyOrders = async (userId: string) => {
  return Order.find({ user: userId }).populate('items.product').sort({ createdAt: -1 });
};

const getSingleOrder = async (userId: string, orderId: string) => {
  validateObjectId(orderId, 'order');

  const order = await Order.findOne({ _id: orderId, user: userId }).populate('items.product');
  if (!order) {
    throw new AppError(404, 'Order not found');
  }

  return order;
};

const assertSellerCanManageOrder = async (userId: string, orderId: string) => {
  const order = await Order.findById(orderId).select('items.product').lean();
  if (!order) {
    throw new AppError(404, 'Order not found');
  }

  const productIds = order.items.map((item) => item.product);
  const products = await Product.find({ _id: { $in: productIds } }).select('shop').lean();
  const shopIds = [...new Set(products.map((product) => product.shop.toString()))];

  const ownedShopCount = await Shop.countDocuments({
    _id: { $in: shopIds },
    owner: new Types.ObjectId(userId),
  });

  if (ownedShopCount !== shopIds.length) {
    throw new AppError(403, 'Forbidden: you cannot update this order');
  }
};

const updateOrderStatus = async (
  authUser: AuthJwtPayload,
  orderId: string,
  status: OrderStatus,
  deliveryPartnerId?: string
) => {
  validateObjectId(orderId, 'order');

  if (!isAdminUser(authUser)) {
    await assertSellerCanManageOrder(authUser.userId, orderId);
  }

  const existingOrder = await Order.findById(orderId).select('user orderStatus items.product').lean();
  if (!existingOrder) {
    throw new AppError(404, 'Order not found');
  }

  if (deliveryPartnerId) {
    await assertDeliveryPartnerUser(deliveryPartnerId);
    await DeliveryAvailabilityService.markBusyForOrder(deliveryPartnerId, orderId);
  }

  const updatePayload: {
    orderStatus: OrderStatus;
    deliveryPartner?: Types.ObjectId;
    deliveryAssignedAt?: Date;
  } = {
    orderStatus: status,
  };

  if (deliveryPartnerId) {
    updatePayload.deliveryPartner = new Types.ObjectId(deliveryPartnerId);
    updatePayload.deliveryAssignedAt = new Date();
  }

  const order = await Order.findByIdAndUpdate(
    orderId,
    updatePayload,
    {
      new: true,
      runValidators: true,
    }
  ).populate('items.product');

  if (!order) {
    throw new AppError(404, 'Order not found');
  }

  await triggerOrderStatusNotification(existingOrder.user, order.id, existingOrder.orderStatus, status);

  if (deliveryPartnerId) {
    const sellerIds = await getSellerIdsByProductIds(existingOrder.items.map((item) => item.product));
    await MessagingService.getOrCreateSellerDeliveryConversation({
      orderId: order.id,
      sellerIds,
      deliveryPartnerId,
    });

    await NotificationService.notifyDeliveryRequest(deliveryPartnerId, order.id);
  }

  if (status === ORDER_STATUS.DELIVERED || status === ORDER_STATUS.CANCELLED) {
    const assignedDeliveryPartnerId = order.deliveryPartner?.toString();
    if (assignedDeliveryPartnerId) {
      await DeliveryAvailabilityService.releaseFromOrder(assignedDeliveryPartnerId, order.id);
    }

    const closedConversations = await MessagingService.closeConversationsForOrder(order.id);

    for (const closedConversation of closedConversations) {
      try {
        emitOrderChatStatus(
          getSocketServer(),
          order.id,
          closedConversation.chatType,
          closedConversation.id,
          closedConversation.status,
          false
        );
      } catch (_error) {
        // Chat status persistence should not fail if the socket server is unavailable.
      }
    }
  }

  return order;
};

const updateDeliveryStatus = async (
  deliveryPartnerId: string,
  orderId: string,
  status: DeliveryStatus
) => {
  validateObjectId(orderId, 'order');

  const existingOrder = await Order.findById(orderId).select(
    'user items.product orderStatus deliveryPartner deliveryStatus'
  ).lean();

  if (!existingOrder) {
    throw new AppError(404, 'Order not found');
  }

  if (!existingOrder.deliveryPartner || existingOrder.deliveryPartner.toString() !== deliveryPartnerId) {
    throw new AppError(403, 'Only the assigned delivery partner can update delivery status');
  }

  if (existingOrder.orderStatus === ORDER_STATUS.CANCELLED || existingOrder.orderStatus === ORDER_STATUS.DELIVERED) {
    throw new AppError(400, 'Cannot update delivery status for a closed order');
  }

  assertValidDeliveryStatusTransition(existingOrder.deliveryStatus, status);

  const now = new Date();
  const updatePayload: {
    deliveryStatus: DeliveryStatus;
    orderStatus?: OrderStatus;
    pickedUpAt?: Date;
    outForDeliveryAt?: Date;
    deliveredAt?: Date;
  } = {
    deliveryStatus: status,
  };

  if (status === DELIVERY_STATUS.PICKED_UP) {
    updatePayload.pickedUpAt = now;
  }

  if (status === DELIVERY_STATUS.OUT_FOR_DELIVERY) {
    updatePayload.orderStatus = ORDER_STATUS.OUT_FOR_DELIVERY;
    updatePayload.outForDeliveryAt = now;
  }

  if (status === DELIVERY_STATUS.DELIVERED) {
    updatePayload.orderStatus = ORDER_STATUS.DELIVERED;
    updatePayload.deliveredAt = now;
  }

  const order = await Order.findByIdAndUpdate(orderId, updatePayload, {
    new: true,
    runValidators: true,
  }).populate('items.product');

  if (!order) {
    throw new AppError(404, 'Order not found');
  }

  const sellerIds = await getSellerIdsByProductIds(existingOrder.items.map((item) => item.product));
  const statusLabel = getDeliveryStatusLabel(status);

  await Promise.all([
    NotificationService.notifyOrderUpdate(order.user, order.id, statusLabel, {
      deliveryStatus: status,
    }),
    NotificationService.createNotifications(
      sellerIds.map((sellerId) => ({
        userId: sellerId,
        title: 'Delivery status updated',
        message: `Order delivery status is now ${statusLabel}.`,
        type: 'order_update',
        data: {
          orderId: order.id,
          deliveryStatus: status,
        },
      }))
    ),
  ]);

  const trackingPayload = {
    orderId: order.id,
    orderStatus: order.orderStatus,
    deliveryStatus: order.deliveryStatus,
    deliveryPartner: deliveryPartnerId,
    pickedUpAt: order.pickedUpAt,
    outForDeliveryAt: order.outForDeliveryAt,
    deliveredAt: order.deliveredAt,
    updatedAt: new Date(),
  };

  emitDeliveryTrackingUpdate(order.id, order.user.toString(), sellerIds, deliveryPartnerId, trackingPayload);

  if (status === DELIVERY_STATUS.DELIVERED) {
    await DeliveryAvailabilityService.releaseFromOrder(deliveryPartnerId, order.id);
    const closedConversations = await MessagingService.closeConversationsForOrder(order.id);

    for (const closedConversation of closedConversations) {
      try {
        emitOrderChatStatus(
          getSocketServer(),
          order.id,
          closedConversation.chatType,
          closedConversation.id,
          closedConversation.status,
          false
        );
      } catch (_error) {
        // Chat status persistence should not fail if the socket server is unavailable.
      }
    }
  }

  return order;
};

export const OrderService = {
  placeCodOrder,
  getMyOrders,
  getSingleOrder,
  updateOrderStatus,
  updateDeliveryStatus,
};
