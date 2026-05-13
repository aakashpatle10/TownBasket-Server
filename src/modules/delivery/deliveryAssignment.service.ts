import mongoose, { Types } from 'mongoose';
import { emitToDelivery, emitToOrder, emitToSeller, emitToUser } from '../../socket/socket.manager.js';
import { AppError } from '../../utils/AppError.js';
import { MessagingService } from '../messaging/messaging.service.js';
import { NotificationService } from '../notification/notification.service.js';
import { ORDER_STATUS } from '../order/order.interface.js';
import { Order } from '../order/order.model.js';
import { Product } from '../products/product.model.js';
import { Shop } from '../shop/shop.model.js';
import { DELIVERY_AVAILABILITY_STATUS } from './deliveryAvailability.interface.js';
import { DeliveryAvailability } from './deliveryAvailability.model.js';
import { DeliveryAvailabilityService } from './deliveryAvailability.service.js';
import {
  DELIVERY_ASSIGNMENT_REQUEST_STATUS,
  IDeliveryAssignmentRequest,
} from './deliveryAssignment.interface.js';
import { DeliveryAssignmentRequest } from './deliveryAssignment.model.js';

const DELIVERY_ASSIGNMENT_EVENTS = {
  REQUEST: 'DELIVERY_ASSIGNMENT_REQUEST',
  ACCEPTED: 'DELIVERY_ASSIGNMENT_ACCEPTED',
  REJECTED: 'DELIVERY_ASSIGNMENT_REJECTED',
  CANCELLED: 'DELIVERY_ASSIGNMENT_CANCELLED',
  ORDER_UPDATED: 'ORDER_UPDATED',
} as const;

const validateObjectId = (id: string | Types.ObjectId, entity: string) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, `Invalid ${entity} id`);
  }
};

const getSellerIdsByOrder = async (order: { items: Array<{ product: Types.ObjectId }> }) => {
  const productIds = order.items.map((item) => item.product);
  const products = await Product.find({ _id: { $in: productIds } }).select('shop').lean();
  const shopIds = [...new Set(products.map((product) => product.shop.toString()))];
  const shops = await Shop.find({ _id: { $in: shopIds } }).select('owner').lean();

  return shops.map((shop) => shop.owner);
};

const assertSellerCanRequestDelivery = async (sellerId: string, orderId: string) => {
  validateObjectId(orderId, 'order');

  const order = await Order.findById(orderId).select('items.product orderStatus deliveryPartner').lean();
  if (!order) {
    throw new AppError(404, 'Order not found');
  }

  if (order.deliveryPartner) {
    throw new AppError(400, 'Delivery partner is already assigned to this order');
  }

  if (order.orderStatus === ORDER_STATUS.DELIVERED || order.orderStatus === ORDER_STATUS.CANCELLED) {
    throw new AppError(400, 'Cannot request delivery for a closed order');
  }

  const productIds = order.items.map((item) => item.product);
  const products = await Product.find({ _id: { $in: productIds } }).select('shop').lean();
  const shopIds = [...new Set(products.map((product) => product.shop.toString()))];

  const ownedShopCount = await Shop.countDocuments({
    _id: { $in: shopIds },
    owner: new Types.ObjectId(sellerId),
  });

  if (ownedShopCount !== shopIds.length) {
    throw new AppError(403, 'Forbidden: you cannot request delivery for this order');
  }

  return order;
};

const emitRequestToDeliveryPartner = (request: IDeliveryAssignmentRequest & { _id: Types.ObjectId }) => {
  const payload = {
    requestId: request._id.toString(),
    orderId: request.order.toString(),
    sellerId: request.seller.toString(),
    deliveryPartnerId: request.deliveryPartner.toString(),
    status: request.status,
    createdAt: request.createdAt,
  };

  emitToDelivery(request.deliveryPartner.toString(), DELIVERY_ASSIGNMENT_EVENTS.REQUEST, payload);
  emitToUser(request.deliveryPartner.toString(), DELIVERY_ASSIGNMENT_EVENTS.REQUEST, payload);
};

const emitOrderUpdate = (payload: {
  orderId: string;
  status: string;
  deliveryPartner?: string;
  requestId?: string;
}) => {
  emitToOrder(payload.orderId, DELIVERY_ASSIGNMENT_EVENTS.ORDER_UPDATED, payload);

  if (payload.deliveryPartner) {
    emitToDelivery(payload.deliveryPartner, DELIVERY_ASSIGNMENT_EVENTS.ORDER_UPDATED, payload);
  }
};

const emitCancelledRequests = async (orderId: Types.ObjectId, acceptedRequestId: Types.ObjectId) => {
  const cancelledRequests = await DeliveryAssignmentRequest.find({
    order: orderId,
    _id: { $ne: acceptedRequestId },
    status: DELIVERY_ASSIGNMENT_REQUEST_STATUS.CANCELLED,
  }).select('deliveryPartner');

  cancelledRequests.forEach((request) => {
    emitToDelivery(request.deliveryPartner.toString(), DELIVERY_ASSIGNMENT_EVENTS.CANCELLED, {
      orderId: orderId.toString(),
      requestId: request._id.toString(),
      status: DELIVERY_ASSIGNMENT_REQUEST_STATUS.CANCELLED,
    });
  });
};

const requestDeliveryAssignment = async (sellerId: string, orderId: string) => {
  const order = await assertSellerCanRequestDelivery(sellerId, orderId);

  const activePartners = await DeliveryAvailability.find({
    status: DELIVERY_AVAILABILITY_STATUS.AVAILABLE,
  }).select('deliveryPartner');

  if (activePartners.length === 0) {
    throw new AppError(404, 'No available delivery partners found');
  }

  const requests = await Promise.all(
    activePartners.map(async (availability) => {
      return DeliveryAssignmentRequest.findOneAndUpdate(
        {
          order: orderId,
          deliveryPartner: availability.deliveryPartner,
          status: DELIVERY_ASSIGNMENT_REQUEST_STATUS.PENDING,
        },
        {
          $setOnInsert: {
            order: orderId,
            seller: sellerId,
            deliveryPartner: availability.deliveryPartner,
            status: DELIVERY_ASSIGNMENT_REQUEST_STATUS.PENDING,
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
        }
      );
    })
  );

  requests.forEach((request) => {
    emitRequestToDeliveryPartner(request as IDeliveryAssignmentRequest & { _id: Types.ObjectId });
  });

  await Promise.all(
    requests.map((request) => {
      return NotificationService.notifyDeliveryRequest(request.deliveryPartner, orderId, {
        requestId: request._id.toString(),
        sellerId,
      });
    })
  );

  emitToSeller(sellerId, DELIVERY_ASSIGNMENT_EVENTS.REQUEST, {
    orderId,
    requestedCount: requests.length,
    orderStatus: order.orderStatus,
  });

  return requests;
};

const acceptDeliveryAssignment = async (deliveryPartnerId: string, requestId: string) => {
  validateObjectId(requestId, 'delivery assignment request');

  const request = await DeliveryAssignmentRequest.findOne({
    _id: requestId,
    deliveryPartner: deliveryPartnerId,
    status: DELIVERY_ASSIGNMENT_REQUEST_STATUS.PENDING,
  });

  if (!request) {
    throw new AppError(404, 'Delivery assignment request not found');
  }

  await DeliveryAvailabilityService.markBusyForOrder(deliveryPartnerId, request.order);

  const order = await Order.findOneAndUpdate(
    {
      _id: request.order,
      orderStatus: { $nin: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED] },
      $or: [{ deliveryPartner: { $exists: false } }, { deliveryPartner: null }],
    },
    {
      $set: {
        deliveryPartner: deliveryPartnerId,
        deliveryAssignedAt: new Date(),
        orderStatus: ORDER_STATUS.OUT_FOR_DELIVERY,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!order) {
    await DeliveryAvailabilityService.releaseFromOrder(deliveryPartnerId, request.order);
    throw new AppError(400, 'Order is no longer available for delivery assignment');
  }

  request.status = DELIVERY_ASSIGNMENT_REQUEST_STATUS.ACCEPTED;
  request.respondedAt = new Date();
  await request.save();

  await DeliveryAssignmentRequest.updateMany(
    {
      order: request.order,
      _id: { $ne: request._id },
      status: DELIVERY_ASSIGNMENT_REQUEST_STATUS.PENDING,
    },
    {
      $set: {
        status: DELIVERY_ASSIGNMENT_REQUEST_STATUS.CANCELLED,
        respondedAt: new Date(),
      },
    }
  );
  await emitCancelledRequests(request.order, request._id);

  const sellerIds = await getSellerIdsByOrder(order);
  await MessagingService.getOrCreateSellerDeliveryConversation({
    orderId: order._id,
    sellerIds,
    deliveryPartnerId,
  });

  await NotificationService.notifyDeliveryAssigned(order.user, order._id, {
    deliveryPartnerId,
    requestId,
  });

  const payload = {
    orderId: order._id.toString(),
    requestId,
    deliveryPartner: deliveryPartnerId,
    buyerId: order.user.toString(),
    status: order.orderStatus,
  };

  emitOrderUpdate(payload);
  emitToUser(order.user.toString(), DELIVERY_ASSIGNMENT_EVENTS.ORDER_UPDATED, payload);
  emitToSeller(request.seller.toString(), DELIVERY_ASSIGNMENT_EVENTS.ACCEPTED, payload);
  emitToDelivery(deliveryPartnerId, DELIVERY_ASSIGNMENT_EVENTS.ACCEPTED, payload);

  return {
    request,
    order,
  };
};

const rejectDeliveryAssignment = async (deliveryPartnerId: string, requestId: string) => {
  validateObjectId(requestId, 'delivery assignment request');

  const request = await DeliveryAssignmentRequest.findOneAndUpdate(
    {
      _id: requestId,
      deliveryPartner: deliveryPartnerId,
      status: DELIVERY_ASSIGNMENT_REQUEST_STATUS.PENDING,
    },
    {
      $set: {
        status: DELIVERY_ASSIGNMENT_REQUEST_STATUS.REJECTED,
        respondedAt: new Date(),
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!request) {
    throw new AppError(404, 'Delivery assignment request not found');
  }

  const payload = {
    orderId: request.order.toString(),
    requestId: request._id.toString(),
    deliveryPartner: deliveryPartnerId,
    status: request.status,
  };

  emitToSeller(request.seller.toString(), DELIVERY_ASSIGNMENT_EVENTS.REJECTED, payload);
  emitToDelivery(deliveryPartnerId, DELIVERY_ASSIGNMENT_EVENTS.REJECTED, payload);

  return request;
};

const getMyPendingRequests = async (deliveryPartnerId: string) => {
  return DeliveryAssignmentRequest.find({
    deliveryPartner: deliveryPartnerId,
    status: DELIVERY_ASSIGNMENT_REQUEST_STATUS.PENDING,
  })
    .populate('order')
    .populate('seller', 'name email phone')
    .sort({ createdAt: -1 });
};

export const DeliveryAssignmentService = {
  requestDeliveryAssignment,
  acceptDeliveryAssignment,
  rejectDeliveryAssignment,
  getMyPendingRequests,
};
