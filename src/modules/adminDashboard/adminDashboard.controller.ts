import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { getRouteParam } from '../../utils/routeHelpers.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { OrderStatus } from '../order/order.interface.js';
import { ProductStatus } from '../products/product.interface.js';
import { SocialModerationStatus } from '../social/social.interface.js';
import { ReportStatus, ReportTargetType } from './report.interface.js';
import { AdminDashboardService } from './adminDashboard.service.js';

const getAuthenticatedUserId = (req: Request): string => {
  if (!req.user) {
    throw new Error('Unauthorized: User not authenticated');
  }

  return req.user.userId;
};

const getStringQuery = (value: unknown): string | undefined => {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const getNumberQuery = (value: unknown): number | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const getOverview = catchAsync(async (_req: Request, res: Response) => {
  const result = await AdminDashboardService.getOverview();

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Admin dashboard overview fetched successfully',
    data: result,
  });
});

const getUserAnalytics = catchAsync(async (_req: Request, res: Response) => {
  const result = await AdminDashboardService.getUserAnalytics();

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'User analytics fetched successfully',
    data: result,
  });
});

const getSellerAnalytics = catchAsync(async (_req: Request, res: Response) => {
  const result = await AdminDashboardService.getSellerAnalytics();

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Seller analytics fetched successfully',
    data: result,
  });
});

const getRevenueStatistics = catchAsync(async (_req: Request, res: Response) => {
  const result = await AdminDashboardService.getRevenueStatistics();

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Revenue statistics fetched successfully',
    data: result,
  });
});

const getOrderStatistics = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminDashboardService.getOrderStatistics(
    getStringQuery(req.query.status) as OrderStatus | undefined
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Order statistics fetched successfully',
    data: result,
  });
});

const getProductModerationQueue = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminDashboardService.getProductModerationQueue({
    page: getNumberQuery(req.query.page),
    limit: getNumberQuery(req.query.limit),
    status: getStringQuery(req.query.status) as ProductStatus | undefined,
    search: getStringQuery(req.query.search),
  });

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Product moderation queue fetched successfully',
    data: result,
  });
});

const updateProductModeration = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminDashboardService.updateProductModeration(getRouteParam(req, 'id'), req.body);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Product moderation updated successfully',
    data: result,
  });
});

const getPostModerationQueue = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminDashboardService.getPostModerationQueue({
    page: getNumberQuery(req.query.page),
    limit: getNumberQuery(req.query.limit),
    status: getStringQuery(req.query.status) as SocialModerationStatus | undefined,
    type: getStringQuery(req.query.type) as 'post' | 'reel' | undefined,
    search: getStringQuery(req.query.search),
  });

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Post moderation queue fetched successfully',
    data: result,
  });
});

const updatePostModeration = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminDashboardService.updatePostModeration(
    getRouteParam(req, 'type') as 'post' | 'reel',
    getRouteParam(req, 'id'),
    req.body.status
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Social content moderation updated successfully',
    data: result,
  });
});

const blockUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminDashboardService.blockUser(
    getAuthenticatedUserId(req),
    getRouteParam(req, 'id'),
    true
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'User blocked successfully',
    data: result,
  });
});

const unblockUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminDashboardService.blockUser(
    getAuthenticatedUserId(req),
    getRouteParam(req, 'id'),
    false
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'User unblocked successfully',
    data: result,
  });
});

const createReport = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminDashboardService.createReport(getAuthenticatedUserId(req), req.body);

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: 'Report submitted successfully',
    data: result,
  });
});

const getReports = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminDashboardService.getReports({
    page: getNumberQuery(req.query.page),
    limit: getNumberQuery(req.query.limit),
    status: getStringQuery(req.query.status) as ReportStatus | undefined,
    targetType: getStringQuery(req.query.targetType) as ReportTargetType | undefined,
  });

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Reports fetched successfully',
    data: result,
  });
});

const getReportDetail = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminDashboardService.getReportDetail(getRouteParam(req, 'id'));

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Report fetched successfully',
    data: result,
  });
});

const updateReport = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminDashboardService.updateReport(
    getAuthenticatedUserId(req),
    getRouteParam(req, 'id'),
    req.body
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Report updated successfully',
    data: result,
  });
});

const getRealtimePlatformActivityStats = catchAsync(async (_req: Request, res: Response) => {
  const result = await AdminDashboardService.getRealtimePlatformActivityStats();

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Realtime platform activity stats fetched successfully',
    data: result,
  });
});

export const AdminDashboardController = {
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
  unblockUser,
  createReport,
  getReports,
  getReportDetail,
  updateReport,
  getRealtimePlatformActivityStats,
};
