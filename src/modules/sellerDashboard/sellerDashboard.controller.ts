import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { getRouteParam } from '../../utils/routeHelpers.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { OrderStatus } from '../order/order.interface.js';
import { SellerDashboardService } from './sellerDashboard.service.js';

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

const getOverview = catchAsync(async (req: Request, res: Response) => {
  const result = await SellerDashboardService.getOverview(getAuthenticatedUserId(req));

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Seller dashboard overview fetched successfully',
    data: result,
  });
});

const getAnalytics = catchAsync(async (req: Request, res: Response) => {
  const result = await SellerDashboardService.getAnalytics(getAuthenticatedUserId(req));

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Seller analytics fetched successfully',
    data: result,
  });
});

const getNewOrderCount = catchAsync(async (req: Request, res: Response) => {
  const result = await SellerDashboardService.getNewOrderCount(getAuthenticatedUserId(req));

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Seller new order count fetched successfully',
    data: result,
  });
});

const getRecentCustomerActivity = catchAsync(async (req: Request, res: Response) => {
  const result = await SellerDashboardService.getRecentCustomerActivity(
    getAuthenticatedUserId(req),
    getNumberQuery(req.query.limit)
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Recent customer activity fetched successfully',
    data: result,
  });
});

const getNotificationSummary = catchAsync(async (req: Request, res: Response) => {
  const result = await SellerDashboardService.getNotificationSummary(
    getAuthenticatedUserId(req),
    getNumberQuery(req.query.limit)
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Notification summary fetched successfully',
    data: result,
  });
});

const getSellerOrders = catchAsync(async (req: Request, res: Response) => {
  const result = await SellerDashboardService.getSellerOrders(getAuthenticatedUserId(req), {
    status: getStringQuery(req.query.status) as OrderStatus | undefined,
    page: getNumberQuery(req.query.page),
    limit: getNumberQuery(req.query.limit),
    search: getStringQuery(req.query.search),
  });

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Seller orders fetched successfully',
    data: result,
  });
});

const getSellerOrderDetail = catchAsync(async (req: Request, res: Response) => {
  const result = await SellerDashboardService.getSellerOrderDetail(
    getAuthenticatedUserId(req),
    getRouteParam(req, 'id')
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Seller order fetched successfully',
    data: result,
  });
});

const updateSellerOrderStatus = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new Error('Unauthorized: User not authenticated');
  }

  const result = await SellerDashboardService.updateSellerOrderStatus(
    req.user,
    getRouteParam(req, 'id'),
    req.body.status,
    req.body.deliveryPartner
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Seller order status updated successfully',
    data: result,
  });
});

export const SellerDashboardController = {
  getOverview,
  getAnalytics,
  getNewOrderCount,
  getRecentCustomerActivity,
  getNotificationSummary,
  getSellerOrders,
  getSellerOrderDetail,
  updateSellerOrderStatus,
};
