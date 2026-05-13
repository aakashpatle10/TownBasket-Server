import mongoose, { Types } from 'mongoose';
import { SYSTEM_ROLES } from '../../constants/permissions.js';
import { getOnlineUserIdsByRole } from '../../socket/presence.manager.js';
import { emitToAdmin } from '../../socket/socket.manager.js';
import { AppError } from '../../utils/AppError.js';
import { Order } from '../order/order.model.js';
import { ORDER_STATUS, OrderStatus } from '../order/order.interface.js';
import { Product } from '../products/product.model.js';
import { PRODUCT_STATUS, ProductStatus } from '../products/product.interface.js';
import { Role } from '../role/role.model.js';
import { Shop } from '../shop/shop.model.js';
import { SOCIAL_MODERATION_STATUS, SocialModerationStatus } from '../social/social.interface.js';
import { SocialPost } from '../social/socialPost.model.js';
import { SocialReel } from '../social/socialReel.model.js';
import { User } from '../user/user.model.js';
import { Report } from './report.model.js';
import { Message } from '../messaging/message.model.js';
import {
  REPORT_STATUS,
  REPORT_TARGET_TYPES,
  ReportStatus,
  ReportTargetType,
} from './report.interface.js';

export const ADMIN_PLATFORM_ACTIVITY_SOCKET_EVENT = 'admin:platform-activity';

type PaginationQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

type ProductModerationQuery = PaginationQuery & {
  status?: ProductStatus;
};

type SocialModerationQuery = PaginationQuery & {
  status?: SocialModerationStatus;
  type?: 'post' | 'reel';
};

type ReportQuery = PaginationQuery & {
  status?: ReportStatus;
  targetType?: ReportTargetType;
};

type CreateReportPayload = {
  targetType: ReportTargetType;
  target: string;
  reason: string;
  description?: string;
};

type UpdateReportPayload = {
  status: ReportStatus;
  adminNote?: string;
};

type UpdateProductModerationPayload = {
  status?: ProductStatus;
  isActive?: boolean;
};

const normalizePage = (page?: number): number => Math.max(1, page ?? 1);

const normalizeLimit = (limit?: number, fallback = 20): number => {
  if (!limit) {
    return fallback;
  }

  return Math.min(Math.max(1, limit), 50);
};

const getPagination = (query: PaginationQuery = {}) => {
  const page = normalizePage(query.page);
  const limit = normalizeLimit(query.limit);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const validateObjectId = (id: string, entity: string) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, `Invalid ${entity} id`);
  }
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getRoleIdsByName = async () => {
  const roles = await Role.find({
    name: {
      $in: Object.values(SYSTEM_ROLES),
    },
  }).select('name').lean();

  return new Map(roles.map((role) => [role.name, role._id]));
};

const buildMeta = (page: number, limit: number, total: number) => {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
  };
};

const getTimestamp = (value?: Date): number => value ? new Date(value).getTime() : 0;

const getUserAnalytics = async () => {
  const roleIds = await getRoleIdsByName();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  const [totalUsers, blockedUsers, newToday, newThisWeek, byRole] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isBlocked: true }),
    User.countDocuments({ createdAt: { $gte: startOfToday } }),
    User.countDocuments({ createdAt: { $gte: startOfWeek } }),
    User.aggregate<{ _id: Types.ObjectId; total: number; blocked: number }>([
      {
        $group: {
          _id: '$role',
          total: { $sum: 1 },
          blocked: {
            $sum: {
              $cond: ['$isBlocked', 1, 0],
            },
          },
        },
      },
    ]),
  ]);

  const roleNameById = new Map(
    [...roleIds.entries()].map(([roleName, roleId]) => [roleId.toString(), roleName])
  );

  return {
    totalUsers,
    activeUsers: totalUsers - blockedUsers,
    blockedUsers,
    newToday,
    newThisWeek,
    byRole: byRole.map((entry) => ({
      role: roleNameById.get(entry._id.toString()) ?? entry._id.toString(),
      total: entry.total,
      blocked: entry.blocked,
      active: entry.total - entry.blocked,
    })),
  };
};

const getSellerAnalytics = async () => {
  const roleIds = await getRoleIdsByName();
  const sellerRoleId = roleIds.get(SYSTEM_ROLES.SELLER);

  if (!sellerRoleId) {
    return {
      totalSellers: 0,
      activeSellers: 0,
      blockedSellers: 0,
      totalShops: 0,
      totalProducts: 0,
      publishedProducts: 0,
      topSellers: [],
    };
  }

  const [sellerCounts, totalShops, totalProducts, publishedProducts, topSellers] = await Promise.all([
    User.aggregate<{ _id: null; total: number; blocked: number }>([
      { $match: { role: sellerRoleId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          blocked: { $sum: { $cond: ['$isBlocked', 1, 0] } },
        },
      },
    ]),
    Shop.countDocuments(),
    Product.countDocuments(),
    Product.countDocuments({ status: PRODUCT_STATUS.PUBLISHED, isActive: true }),
    Product.aggregate<{ _id: Types.ObjectId; totalSold: number; productCount: number }>([
      {
        $group: {
          _id: '$shop',
          totalSold: { $sum: '$soldCount' },
          productCount: { $sum: 1 },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'shops',
          localField: '_id',
          foreignField: '_id',
          as: 'shop',
        },
      },
      { $unwind: '$shop' },
      {
        $lookup: {
          from: 'users',
          localField: 'shop.owner',
          foreignField: '_id',
          as: 'seller',
        },
      },
      { $unwind: '$seller' },
      {
        $project: {
          sellerId: '$seller._id',
          sellerName: '$seller.name',
          shopId: '$shop._id',
          shopName: '$shop.shopName',
          totalSold: 1,
          productCount: 1,
        },
      },
    ]),
  ]);

  const counts = sellerCounts[0];

  return {
    totalSellers: counts?.total ?? 0,
    activeSellers: (counts?.total ?? 0) - (counts?.blocked ?? 0),
    blockedSellers: counts?.blocked ?? 0,
    totalShops,
    totalProducts,
    publishedProducts,
    topSellers,
  };
};

const getRevenueStatistics = async () => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [summary, today, month, daily] = await Promise.all([
    Order.aggregate<{
      _id: null;
      grossRevenue: number;
      platformFees: number;
      deliveryFees: number;
      orderCount: number;
    }>([
      { $match: { orderStatus: ORDER_STATUS.DELIVERED } },
      {
        $group: {
          _id: null,
          grossRevenue: { $sum: '$totalAmount' },
          platformFees: { $sum: '$platformFee' },
          deliveryFees: { $sum: '$deliveryFee' },
          orderCount: { $sum: 1 },
        },
      },
    ]),
    Order.aggregate<{ _id: null; revenue: number; orders: number }>([
      { $match: { orderStatus: ORDER_STATUS.DELIVERED, deliveredAt: { $gte: startOfToday } } },
      { $group: { _id: null, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
    ]),
    Order.aggregate<{ _id: null; revenue: number; orders: number }>([
      { $match: { orderStatus: ORDER_STATUS.DELIVERED, deliveredAt: { $gte: startOfMonth } } },
      { $group: { _id: null, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
    ]),
    Order.aggregate<{ _id: string; revenue: number; orders: number }>([
      {
        $match: {
          orderStatus: ORDER_STATUS.DELIVERED,
          deliveredAt: {
            $gte: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$deliveredAt',
            },
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const totals = summary[0];

  return {
    grossRevenue: totals?.grossRevenue ?? 0,
    platformFees: totals?.platformFees ?? 0,
    deliveryFees: totals?.deliveryFees ?? 0,
    sellerRevenue: (totals?.grossRevenue ?? 0) - (totals?.platformFees ?? 0) - (totals?.deliveryFees ?? 0),
    deliveredOrders: totals?.orderCount ?? 0,
    averageOrderValue: totals?.orderCount ? totals.grossRevenue / totals.orderCount : 0,
    todayRevenue: today[0]?.revenue ?? 0,
    todayOrders: today[0]?.orders ?? 0,
    monthRevenue: month[0]?.revenue ?? 0,
    monthOrders: month[0]?.orders ?? 0,
    daily,
  };
};

const getOrderStatistics = async (status?: OrderStatus) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [totalOrders, todayOrders, byStatus] = await Promise.all([
    Order.countDocuments(status ? { orderStatus: status } : {}),
    Order.countDocuments({
      ...(status ? { orderStatus: status } : {}),
      createdAt: { $gte: startOfToday },
    }),
    Order.aggregate<{ _id: OrderStatus; count: number }>([
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const counts = new Map(byStatus.map((entry) => [entry._id, entry.count]));

  return {
    totalOrders,
    todayOrders,
    pendingOrders: counts.get(ORDER_STATUS.PENDING) ?? 0,
    deliveredOrders: counts.get(ORDER_STATUS.DELIVERED) ?? 0,
    cancelledOrders: counts.get(ORDER_STATUS.CANCELLED) ?? 0,
    byStatus: byStatus.map((entry) => ({
      status: entry._id,
      count: entry.count,
    })),
  };
};

const getProductModerationQueue = async (query: ProductModerationQuery = {}) => {
  const { page, limit, skip } = getPagination(query);
  const filter: Record<string, unknown> = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.search) {
    filter.title = new RegExp(escapeRegex(query.search), 'i');
  }

  const [total, products] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter)
      .populate({ path: 'shop', select: 'shopName owner', populate: { path: 'owner', select: 'name email' } })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    meta: buildMeta(page, limit, total),
    products,
  };
};

const updateProductModeration = async (productId: string, payload: UpdateProductModerationPayload) => {
  validateObjectId(productId, 'product');

  const product = await Product.findByIdAndUpdate(productId, payload, {
    new: true,
    runValidators: true,
  }).populate('shop');

  if (!product) {
    throw new AppError(404, 'Product not found');
  }

  await emitPlatformActivityStats();

  return product;
};

const buildSocialModerationFilter = (query: SocialModerationQuery) => {
  const filter: Record<string, unknown> = {};

  if (query.status) {
    filter.moderationStatus = query.status;
  }

  if (query.search) {
    filter.caption = new RegExp(escapeRegex(query.search), 'i');
  }

  return filter;
};

const listSocialPosts = async (query: SocialModerationQuery) => {
  const { page, limit, skip } = getPagination(query);
  const filter = buildSocialModerationFilter(query);

  const [total, items] = await Promise.all([
    SocialPost.countDocuments(filter),
    SocialPost.find(filter)
      .populate('seller', 'name email phone')
      .populate('shop', 'shopName')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    meta: buildMeta(page, limit, total),
    items,
  };
};

const listSocialReels = async (query: SocialModerationQuery) => {
  const { page, limit, skip } = getPagination(query);
  const filter = buildSocialModerationFilter(query);

  const [total, items] = await Promise.all([
    SocialReel.countDocuments(filter),
    SocialReel.find(filter)
      .populate('seller', 'name email phone')
      .populate('shop', 'shopName')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    meta: buildMeta(page, limit, total),
    items,
  };
};

const getPostModerationQueue = async (query: SocialModerationQuery = {}) => {
  if (query.type === 'reel') {
    return listSocialReels(query);
  }

  if (query.type === 'post') {
    return listSocialPosts(query);
  }

  const { page, limit } = getPagination(query);
  const [posts, reels] = await Promise.all([
    listSocialPosts({ ...query, limit: Math.ceil(limit / 2) }),
    listSocialReels({ ...query, limit: Math.floor(limit / 2) || 1 }),
  ]);

  return {
    meta: {
      page,
      limit,
      total: posts.meta.total + reels.meta.total,
      totalPages: Math.ceil((posts.meta.total + reels.meta.total) / limit),
      hasNextPage: posts.meta.hasNextPage || reels.meta.hasNextPage,
    },
    items: [
      ...posts.items.map((item) => ({ type: 'post', ...item })),
      ...reels.items.map((item) => ({ type: 'reel', ...item })),
    ].sort((left, right) => getTimestamp(right.updatedAt) - getTimestamp(left.updatedAt)),
  };
};

const updatePostModeration = async (
  contentType: 'post' | 'reel',
  contentId: string,
  status: SocialModerationStatus
) => {
  validateObjectId(contentId, contentType);

  if (contentType !== 'post' && contentType !== 'reel') {
    throw new AppError(400, 'Content type must be post or reel');
  }

  const content = contentType === 'post'
    ? await SocialPost.findByIdAndUpdate(
        contentId,
        { moderationStatus: status },
        { new: true, runValidators: true }
      )
    : await SocialReel.findByIdAndUpdate(
        contentId,
        { moderationStatus: status },
        { new: true, runValidators: true }
      );

  if (!content) {
    throw new AppError(404, `${contentType} not found`);
  }

  await emitPlatformActivityStats();

  return content;
};

const blockUser = async (adminId: string, userId: string, isBlocked: boolean) => {
  validateObjectId(userId, 'user');

  if (adminId === userId) {
    throw new AppError(400, 'You cannot block or unblock your own account');
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { isBlocked },
    { new: true, runValidators: true }
  ).populate('role');

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  await emitPlatformActivityStats();

  return user;
};

const targetExists = async (targetType: ReportTargetType, target: string) => {
  validateObjectId(target, 'target');

  if (targetType === REPORT_TARGET_TYPES.USER) {
    return User.exists({ _id: target });
  }

  if (targetType === REPORT_TARGET_TYPES.PRODUCT) {
    return Product.exists({ _id: target });
  }

  if (targetType === REPORT_TARGET_TYPES.POST) {
    return SocialPost.exists({ _id: target });
  }

  if (targetType === REPORT_TARGET_TYPES.CHAT_MESSAGE) {
    return Message.exists({ _id: target });
  }

  if (targetType === REPORT_TARGET_TYPES.REEL) {
    return SocialReel.exists({ _id: target });
  }

  return Order.exists({ _id: target });
};

const createReport = async (reporterId: string, payload: CreateReportPayload) => {
  const exists = await targetExists(payload.targetType, payload.target);
  if (!exists) {
    throw new AppError(404, 'Report target not found');
  }

  const report = await Report.create({
    reporter: reporterId,
    targetType: payload.targetType,
    target: payload.target,
    reason: payload.reason,
    description: payload.description,
    status: REPORT_STATUS.OPEN,
  });

  await emitPlatformActivityStats();

  return Report.populate(report, { path: 'reporter', select: 'name email phone' });
};

const getReports = async (query: ReportQuery = {}) => {
  const { page, limit, skip } = getPagination(query);
  const filter: Record<string, unknown> = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.targetType) {
    filter.targetType = query.targetType;
  }

  const [total, reports] = await Promise.all([
    Report.countDocuments(filter),
    Report.find(filter)
      .populate('reporter', 'name email phone')
      .populate('handledBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    meta: buildMeta(page, limit, total),
    reports,
  };
};

const getReportDetail = async (reportId: string) => {
  validateObjectId(reportId, 'report');

  const report = await Report.findById(reportId)
    .populate('reporter', 'name email phone')
    .populate('handledBy', 'name email')
    .lean();

  if (!report) {
    throw new AppError(404, 'Report not found');
  }

  return report;
};

const updateReport = async (adminId: string, reportId: string, payload: UpdateReportPayload) => {
  validateObjectId(reportId, 'report');

  const report = await Report.findByIdAndUpdate(
    reportId,
    {
      status: payload.status,
      adminNote: payload.adminNote,
      handledBy: adminId,
      handledAt: new Date(),
    },
    { new: true, runValidators: true }
  )
    .populate('reporter', 'name email phone')
    .populate('handledBy', 'name email');

  if (!report) {
    throw new AppError(404, 'Report not found');
  }

  await emitPlatformActivityStats();

  return report;
};

const getRealtimePlatformActivityStats = async () => {
  const [openReports, pendingOrders, blockedProducts, blockedPosts, blockedReels, users, ordersToday] =
    await Promise.all([
      Report.countDocuments({ status: { $in: [REPORT_STATUS.OPEN, REPORT_STATUS.IN_REVIEW] } }),
      Order.countDocuments({ orderStatus: ORDER_STATUS.PENDING }),
      Product.countDocuments({ status: PRODUCT_STATUS.BLOCKED }),
      SocialPost.countDocuments({ moderationStatus: SOCIAL_MODERATION_STATUS.BLOCKED }),
      SocialReel.countDocuments({ moderationStatus: SOCIAL_MODERATION_STATUS.BLOCKED }),
      User.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
    ]);

  return {
    online: {
      admins: getOnlineUserIdsByRole(SYSTEM_ROLES.ADMIN).length,
      sellers: getOnlineUserIdsByRole(SYSTEM_ROLES.SELLER).length,
      buyers: getOnlineUserIdsByRole(SYSTEM_ROLES.BUYER).length,
      delivery: getOnlineUserIdsByRole(SYSTEM_ROLES.DELIVERY).length,
    },
    openReports,
    pendingOrders,
    blockedProducts,
    blockedSocialContent: blockedPosts + blockedReels,
    users,
    ordersToday,
    updatedAt: new Date(),
    socketEvent: ADMIN_PLATFORM_ACTIVITY_SOCKET_EVENT,
  };
};

const emitPlatformActivityStats = async () => {
  try {
    emitToAdmin(ADMIN_PLATFORM_ACTIVITY_SOCKET_EVENT, await getRealtimePlatformActivityStats());
  } catch (_error) {
    // Admin dashboards can fall back to polling the REST endpoint.
  }
};

const getOverview = async () => {
  const [
    userAnalytics,
    sellerAnalytics,
    revenueStatistics,
    orderStatistics,
    platformActivity,
  ] = await Promise.all([
    getUserAnalytics(),
    getSellerAnalytics(),
    getRevenueStatistics(),
    getOrderStatistics(),
    getRealtimePlatformActivityStats(),
  ]);

  return {
    userAnalytics,
    sellerAnalytics,
    revenueStatistics,
    orderStatistics,
    platformActivity,
  };
};

export const AdminDashboardService = {
  getOverview,
  getUserAnalytics,
  getSellerAnalytics,
  getRevenueStatistics,
  getOrderStatistics,
  getProductModerationQueue,
  updateProductModeration,
  getPostModerationQueue,
  updatePostModeration,
  blockUser,
  createReport,
  getReports,
  getReportDetail,
  updateReport,
  getRealtimePlatformActivityStats,
  emitPlatformActivityStats,
};
