import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { getRouteParam } from '../../utils/routeHelpers.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { CONVERSATION_TYPE } from '../messaging/messaging.interface.js';
import { MessagingService } from '../messaging/messaging.service.js';
import { OrderService } from './order.service.js';

const getAuthenticatedUserId = (req: Request): string => {
  if (!req.user) {
    throw new Error('Unauthorized: User not authenticated');
  }

  return req.user.userId;
};

const placeCodOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderService.placeCodOrder(getAuthenticatedUserId(req), req.body.address);

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: 'Order placed successfully',
    data: result,
  });
});

const getMyOrders = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderService.getMyOrders(getAuthenticatedUserId(req));

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Orders fetched successfully',
    data: result,
  });
});

const getSingleOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderService.getSingleOrder(getAuthenticatedUserId(req), getRouteParam(req, 'id'));

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Order fetched successfully',
    data: result,
  });
});

const getOrderChat = catchAsync(async (req: Request, res: Response) => {
  const result = await MessagingService.getOrderChat(getRouteParam(req, 'id'), getAuthenticatedUserId(req));

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Order chat fetched successfully',
    data: result,
  });
});

const getOrderDeliveryChat = catchAsync(async (req: Request, res: Response) => {
  const result = await MessagingService.getOrderChat(getRouteParam(req, 'id'), getAuthenticatedUserId(req), {
    chatType: CONVERSATION_TYPE.SELLER_DELIVERY,
  });

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Order delivery chat fetched successfully',
    data: result,
  });
});

const updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new Error('Unauthorized: User not authenticated');
  }

  const result = await OrderService.updateOrderStatus(req.user, req.body.order, req.body.status, req.body.deliveryPartner);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Order status updated successfully',
    data: result,
  });
});

const updateDeliveryStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderService.updateDeliveryStatus(
    getAuthenticatedUserId(req),
    getRouteParam(req, 'id'),
    req.body.status
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Delivery status updated successfully',
    data: result,
  });
});

export const OrderController = {
  placeCodOrder,
  getMyOrders,
  getSingleOrder,
  getOrderChat,
  getOrderDeliveryChat,
  updateOrderStatus,
  updateDeliveryStatus,
};
