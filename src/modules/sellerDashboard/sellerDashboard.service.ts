import mongoose, { Types } from 'mongoose';
import { AppError } from '../../utils/AppError.js';
import { Notification } from '../notification/notification.model.js';
import { SELLER_NEW_ORDER_COUNT_SOCKET_EVENT } from '../notification/notification.service.js';
import { NOTIFICATION_TYPES } from '../notification/notification.interface.js';
import { ORDER_STATUS, OrderStatus, IOrder } from '../order/order.interface.js';
import { Order } from '../order/order.model.js';
import { OrderService } from '../order/order.service.js';
import { Product } from '../products/product.model.js';
import { Shop } from '../shop/shop.model.js';
import { AuthJwtPayload } from '../../utils/jwtHelpers.js';

type SellerOrderQuery = {
  status?: OrderStatus;
  page?: number;
  limit?: number;
  search?: string;
};

type SellerContext = {
  sellerId: string;
  shopIds: Types.ObjectId[];
  shop?: {
    id: string;
    name: string;
    profileImage?: string;
  };
  productIds: Types.ObjectId[];
  productIdSet: Set<string>;
};

type PopulatedUser = {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
};

type PopulatedProduct = {
  _id: Types.ObjectId;
  title: string;
  image?: string;
  images?: string[];
  price: number;
  discountPrice?: number;
  stock: number;
};

type PopulatedOrderItem = {
  product: Types.ObjectId | PopulatedProduct;
  quantity: number;
  price: number;
};

type PopulatedSellerOrder = {
  _id: Types.ObjectId;
  user?: Types.ObjectId | PopulatedUser | null;
  items: PopulatedOrderItem[];
  shippingAddress: {
    fullName: string;
    phone: string;
    city: string;
    state: string;
  };
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: OrderStatus;
  deliveryPartner?: Types.ObjectId;
  deliveryStatus?: string;
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  totalAmount: number;
  createdAt?: Date;
  updatedAt?: Date;
  deliveredAt?: Date;
};

const DEFAULT_ORDER_LIMIT = 10;
const DEFAULT_ACTIVITY_LIMIT = 5;

const normalizePage = (page?: number): number => Math.max(1, page ?? 1);

const normalizeLimit = (limit?: number, fallback = DEFAULT_ORDER_LIMIT, max = 50): number => {
  if (!limit) {
    return fallback;
  }

  return Math.min(Math.max(1, limit), max);
};

const getSellerContext = async (sellerId: string): Promise<SellerContext> => {
  const shops = await Shop.find({ owner: sellerId })
    .select('_id shopName profileImage')
    .lean();

  const shopIds = shops.map((shop) => shop._id);

  if (shopIds.length === 0) {
    return {
      sellerId,
      shopIds,
      productIds: [],
      productIdSet: new Set<string>(),
    };
  }

  const products = await Product.find({ shop: { $in: shopIds } })
    .select('_id')
    .lean();
  const productIds = products.map((product) => product._id);

  return {
    sellerId,
    shopIds,
    shop: {
      id: shops[0]._id.toString(),
      name: shops[0].shopName,
      profileImage: shops[0].profileImage,
    },
    productIds,
    productIdSet: new Set(productIds.map((productId) => productId.toString())),
  };
};

type SellerOrderFilter = Record<string, unknown> & {
  orderStatus?: OrderStatus;
  $or?: Array<Record<string, unknown>>;
};

const buildSellerOrderFilter = (context: SellerContext, query: SellerOrderQuery = {}): SellerOrderFilter => {
  const filter: SellerOrderFilter = {
    'items.product': {
      $in: context.productIds,
    },
  };

  if (query.status) {
    filter.orderStatus = query.status;
  }

  if (query.search?.trim()) {
    const search = query.search.trim();
    const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { 'shippingAddress.fullName': searchRegex },
      { 'shippingAddress.phone': searchRegex },
      { 'shippingAddress.city': searchRegex },
    ];

    if (mongoose.isValidObjectId(search)) {
      filter.$or.push({ _id: new Types.ObjectId(search) });
    }
  }

  return filter;
};

const getProductId = (product: Types.ObjectId | PopulatedProduct): string => {
  if (product instanceof Types.ObjectId) {
    return product.toString();
  }

  return product._id.toString();
};

const getProductSummary = (product: Types.ObjectId | PopulatedProduct) => {
  if (product instanceof Types.ObjectId) {
    return {
      id: product.toString(),
    };
  }

  return {
    id: product._id.toString(),
    title: product.title,
    image: product.image ?? product.images?.[0],
    price: product.price,
    discountPrice: product.discountPrice,
    stock: product.stock,
  };
};

const getUserSummary = (user?: Types.ObjectId | PopulatedUser | null) => {
  if (!user) {
    return null;
  }

  if (user instanceof Types.ObjectId) {
    return {
      id: user.toString(),
    };
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
  };
};

const getSellerItems = (order: PopulatedSellerOrder, productIdSet: Set<string>) => {
  return order.items
    .filter((item) => productIdSet.has(getProductId(item.product)))
    .map((item) => ({
      product: getProductSummary(item.product),
      quantity: item.quantity,
      price: item.price,
      lineTotal: item.price * item.quantity,
    }));
};

const getSellerAmount = (order: PopulatedSellerOrder, productIdSet: Set<string>): number => {
  return order.items.reduce((total, item) => {
    if (!productIdSet.has(getProductId(item.product))) {
      return total;
    }

    return total + item.price * item.quantity;
  }, 0);
};

const formatOrderForMobile = (order: PopulatedSellerOrder, context: SellerContext, includeItems = true) => {
  const sellerItems = getSellerItems(order, context.productIdSet);
  const canManageStatus = order.items.every((item) => context.productIdSet.has(getProductId(item.product)));

  return {
    id: order._id.toString(),
    customer: getUserSummary(order.user),
    customerSnapshot: {
      name: order.shippingAddress.fullName,
      phone: order.shippingAddress.phone,
      city: order.shippingAddress.city,
      state: order.shippingAddress.state,
    },
    status: order.orderStatus,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    deliveryStatus: order.deliveryStatus,
    itemCount: sellerItems.reduce((total, item) => total + item.quantity, 0),
    sellerAmount: sellerItems.reduce((total, item) => total + item.lineTotal, 0),
    orderTotal: order.totalAmount,
    canManageStatus,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    deliveredAt: order.deliveredAt,
    ...(includeItems ? { items: sellerItems } : {}),
  };
};

const getEmptyAnalytics = () => ({
  totalSales: 0,
  revenue: 0,
  pendingOrders: 0,
  deliveredOrders: 0,
  unitsSold: 0,
});

const getAnalytics = async (sellerId: string) => {
  const context = await getSellerContext(sellerId);

  if (context.productIds.length === 0) {
    return getEmptyAnalytics();
  }

  const [result] = await Order.aggregate<{
    counts: Array<{ _id: OrderStatus; count: number }>;
    sales: Array<{ totalSales: number }>;
    revenue: Array<{ revenue: number; unitsSold: number }>;
  }>([
    {
      $match: {
        'items.product': {
          $in: context.productIds,
        },
      },
    },
    {
      $facet: {
        counts: [
          {
            $group: {
              _id: '$orderStatus',
              count: { $sum: 1 },
            },
          },
        ],
        sales: [
          {
            $match: {
              orderStatus: { $ne: ORDER_STATUS.CANCELLED },
            },
          },
          {
            $count: 'totalSales',
          },
        ],
        revenue: [
          {
            $match: {
              orderStatus: ORDER_STATUS.DELIVERED,
            },
          },
          { $unwind: '$items' },
          {
            $match: {
              'items.product': {
                $in: context.productIds,
              },
            },
          },
          {
            $group: {
              _id: null,
              revenue: {
                $sum: {
                  $multiply: ['$items.price', '$items.quantity'],
                },
              },
              unitsSold: {
                $sum: '$items.quantity',
              },
            },
          },
        ],
      },
    },
  ]);

  const countsByStatus = new Map(result?.counts.map((entry) => [entry._id, entry.count]) ?? []);
  const revenue = result?.revenue[0];

  return {
    totalSales: result?.sales[0]?.totalSales ?? 0,
    revenue: revenue?.revenue ?? 0,
    pendingOrders: countsByStatus.get(ORDER_STATUS.PENDING) ?? 0,
    deliveredOrders: countsByStatus.get(ORDER_STATUS.DELIVERED) ?? 0,
    unitsSold: revenue?.unitsSold ?? 0,
  };
};

const getNewOrderCount = async (sellerId: string) => {
  const context = await getSellerContext(sellerId);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [unreadNewOrders, pendingOrders, todayNewOrders] = await Promise.all([
    Notification.countDocuments({
      userId: sellerId,
      type: NOTIFICATION_TYPES.NEW_ORDER,
      read: false,
    }),
    context.productIds.length === 0
      ? 0
      : Order.countDocuments({
          'items.product': {
            $in: context.productIds,
          },
          orderStatus: ORDER_STATUS.PENDING,
        }),
    context.productIds.length === 0
      ? 0
      : Order.countDocuments({
          'items.product': {
            $in: context.productIds,
          },
          createdAt: {
            $gte: startOfToday,
          },
        }),
  ]);

  return {
    newOrders: unreadNewOrders,
    unreadNewOrders,
    pendingOrders,
    todayNewOrders,
    socketEvent: SELLER_NEW_ORDER_COUNT_SOCKET_EVENT,
  };
};

const getNotificationSummary = async (sellerId: string, limit = 5) => {
  const normalizedLimit = normalizeLimit(limit, 5, 10);
  const sellerObjectId = new Types.ObjectId(sellerId);

  const [total, unread, unreadNewOrders, byType, latest] = await Promise.all([
    Notification.countDocuments({ userId: sellerId }),
    Notification.countDocuments({ userId: sellerId, read: false }),
    Notification.countDocuments({
      userId: sellerId,
      type: NOTIFICATION_TYPES.NEW_ORDER,
      read: false,
    }),
    Notification.aggregate<{ _id: string; total: number; unread: number }>([
      {
        $match: {
          userId: sellerObjectId,
        },
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: 1 },
          unread: {
            $sum: {
              $cond: ['$read', 0, 1],
            },
          },
        },
      },
    ]),
    Notification.find({ userId: sellerId })
      .select('title message type read data createdAt')
      .sort({ createdAt: -1 })
      .limit(normalizedLimit)
      .lean(),
  ]);

  return {
    total,
    unread,
    unreadNewOrders,
    byType: byType.map((entry) => ({
      type: entry._id,
      total: entry.total,
      unread: entry.unread,
    })),
    latest: latest.map((notification) => ({
      id: notification._id.toString(),
      title: notification.title,
      message: notification.message,
      type: notification.type,
      read: notification.read,
      data: notification.data,
      createdAt: notification.createdAt,
    })),
  };
};

const getRecentCustomerActivity = async (sellerId: string, limit = DEFAULT_ACTIVITY_LIMIT) => {
  const context = await getSellerContext(sellerId);

  if (context.productIds.length === 0) {
    return [];
  }

  const orders = await Order.find(buildSellerOrderFilter(context))
    .select('user items shippingAddress orderStatus paymentStatus paymentMethod totalAmount createdAt updatedAt deliveredAt')
    .populate('user', 'name email phone')
    .populate('items.product', 'title image images price discountPrice stock')
    .sort({ createdAt: -1 })
    .limit(normalizeLimit(limit, DEFAULT_ACTIVITY_LIMIT, 20))
    .lean();

  return (orders as unknown as PopulatedSellerOrder[]).map((order) => {
    const sellerAmount = getSellerAmount(order, context.productIdSet);
    const activityType =
      order.orderStatus === ORDER_STATUS.DELIVERED
        ? 'order_delivered'
        : order.orderStatus === ORDER_STATUS.CANCELLED
          ? 'order_cancelled'
          : 'order_received';

    return {
      type: activityType,
      orderId: order._id.toString(),
      customer: getUserSummary(order.user),
      customerSnapshot: {
        name: order.shippingAddress.fullName,
        phone: order.shippingAddress.phone,
        city: order.shippingAddress.city,
      },
      status: order.orderStatus,
      sellerAmount,
      itemCount: getSellerItems(order, context.productIdSet).reduce((total, item) => total + item.quantity, 0),
      createdAt: order.createdAt,
    };
  });
};

const getSellerOrders = async (sellerId: string, query: SellerOrderQuery = {}) => {
  const context = await getSellerContext(sellerId);
  const page = normalizePage(query.page);
  const limit = normalizeLimit(query.limit);

  if (context.productIds.length === 0) {
    return {
      meta: {
        page,
        limit,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
      },
      orders: [],
    };
  }

  const filter = buildSellerOrderFilter(context, query);
  const skip = (page - 1) * limit;

  const [total, orders] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter)
      .select('user items shippingAddress orderStatus paymentStatus paymentMethod deliveryStatus totalAmount createdAt updatedAt deliveredAt')
      .populate('user', 'name email phone')
      .populate('items.product', 'title image images price discountPrice stock')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
    },
    orders: (orders as unknown as PopulatedSellerOrder[]).map((order) =>
      formatOrderForMobile(order, context, false)
    ),
  };
};

const getSellerOrderDetail = async (sellerId: string, orderId: string) => {
  if (!mongoose.isValidObjectId(orderId)) {
    throw new AppError(400, 'Invalid order id');
  }

  const context = await getSellerContext(sellerId);

  if (context.productIds.length === 0) {
    throw new AppError(404, 'Order not found');
  }

  const order = await Order.findOne({
    _id: orderId,
    'items.product': {
      $in: context.productIds,
    },
  })
    .populate('user', 'name email phone')
    .populate('items.product', 'title image images price discountPrice stock')
    .lean();

  if (!order) {
    throw new AppError(404, 'Order not found');
  }

  return formatOrderForMobile(order as unknown as PopulatedSellerOrder, context);
};

const updateSellerOrderStatus = async (
  authUser: AuthJwtPayload,
  orderId: string,
  status: OrderStatus,
  deliveryPartnerId?: string
) => {
  return OrderService.updateOrderStatus(authUser, orderId, status, deliveryPartnerId);
};

const getOverview = async (sellerId: string) => {
  const context = await getSellerContext(sellerId);
  const [analytics, realtime, activity, notifications, orders] = await Promise.all([
    getAnalytics(sellerId),
    getNewOrderCount(sellerId),
    getRecentCustomerActivity(sellerId, DEFAULT_ACTIVITY_LIMIT),
    getNotificationSummary(sellerId, 5),
    getSellerOrders(sellerId, {
      page: 1,
      limit: 5,
    }),
  ]);

  return {
    shop: context.shop ?? null,
    analytics,
    realtime,
    recentActivity: activity,
    notifications,
    orders,
  };
};

export const SellerDashboardService = {
  getOverview,
  getAnalytics,
  getNewOrderCount,
  getRecentCustomerActivity,
  getNotificationSummary,
  getSellerOrders,
  getSellerOrderDetail,
  updateSellerOrderStatus,
};
