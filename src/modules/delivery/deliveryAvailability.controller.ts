import { Request, Response } from 'express';
import { AppError } from '../../utils/AppError.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { DeliveryAvailabilityService } from './deliveryAvailability.service.js';

const getAuthenticatedUserId = (req: Request): string => {
  if (!req.user) {
    throw new AppError(401, 'Unauthorized access');
  }

  return req.user.userId;
};

const goOnline = catchAsync(async (req: Request, res: Response) => {
  const result = await DeliveryAvailabilityService.goOnline(getAuthenticatedUserId(req));

  sendResponse(res, {
    statusCode: 200,
    message: 'Delivery partner is online',
    data: result,
  });
});

const goOffline = catchAsync(async (req: Request, res: Response) => {
  const result = await DeliveryAvailabilityService.goOffline(getAuthenticatedUserId(req));

  sendResponse(res, {
    statusCode: 200,
    message: 'Delivery partner is offline',
    data: result,
  });
});

const getMyStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await DeliveryAvailabilityService.getOrCreateStatus(getAuthenticatedUserId(req));

  sendResponse(res, {
    statusCode: 200,
    message: 'Delivery availability fetched successfully',
    data: result,
  });
});

const getActiveDeliveryPartners = catchAsync(async (_req: Request, res: Response) => {
  const result = await DeliveryAvailabilityService.getActiveDeliveryPartners();

  sendResponse(res, {
    statusCode: 200,
    message: 'Active delivery partners fetched successfully',
    data: result,
  });
});

export const DeliveryAvailabilityController = {
  goOnline,
  goOffline,
  getMyStatus,
  getActiveDeliveryPartners,
};

