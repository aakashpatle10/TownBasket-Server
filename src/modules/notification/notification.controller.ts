import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { getRouteParam } from '../../utils/routeHelpers.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { NotificationService } from './notification.service.js';

const getAuthenticatedUserId = (req: Request): string => {
  if (!req.user) {
    throw new Error('Unauthorized: User not authenticated');
  }

  return req.user.userId;
};

const getNotifications = catchAsync(async (req: Request, res: Response) => {
  const read = req.query.read === 'true' ? true : req.query.read === 'false' ? false : undefined;
  const result = await NotificationService.getUserNotifications(getAuthenticatedUserId(req), {
    read,
  });

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Notifications fetched successfully',
    data: result,
  });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.markAsRead(getAuthenticatedUserId(req), getRouteParam(req, 'id'));

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Notification marked as read',
    data: result,
  });
});

const registerDevice = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.registerDevice(getAuthenticatedUserId(req), req.body);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Device registered successfully',
    data: result,
  });
});

export const NotificationController = {
  getNotifications,
  markAsRead,
  registerDevice,
};
