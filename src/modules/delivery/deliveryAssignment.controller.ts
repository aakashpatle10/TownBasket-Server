import { Request, Response } from 'express';
import { AppError } from '../../utils/AppError.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { getRouteParam } from '../../utils/routeHelpers.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { DeliveryAssignmentService } from './deliveryAssignment.service.js';

const getAuthenticatedUserId = (req: Request): string => {
  if (!req.user) {
    throw new AppError(401, 'Unauthorized access');
  }

  return req.user.userId;
};

const requestDeliveryAssignment = catchAsync(async (req: Request, res: Response) => {
  const result = await DeliveryAssignmentService.requestDeliveryAssignment(
    getAuthenticatedUserId(req),
    getRouteParam(req, 'id')
  );

  sendResponse(res, {
    statusCode: 201,
    message: 'Delivery assignment requested successfully',
    data: result,
  });
});

const acceptDeliveryAssignment = catchAsync(async (req: Request, res: Response) => {
  const result = await DeliveryAssignmentService.acceptDeliveryAssignment(
    getAuthenticatedUserId(req),
    getRouteParam(req, 'requestId')
  );

  sendResponse(res, {
    statusCode: 200,
    message: 'Delivery assignment accepted successfully',
    data: result,
  });
});

const rejectDeliveryAssignment = catchAsync(async (req: Request, res: Response) => {
  const result = await DeliveryAssignmentService.rejectDeliveryAssignment(
    getAuthenticatedUserId(req),
    getRouteParam(req, 'requestId')
  );

  sendResponse(res, {
    statusCode: 200,
    message: 'Delivery assignment rejected successfully',
    data: result,
  });
});

const getMyPendingRequests = catchAsync(async (req: Request, res: Response) => {
  const result = await DeliveryAssignmentService.getMyPendingRequests(getAuthenticatedUserId(req));

  sendResponse(res, {
    statusCode: 200,
    message: 'Pending delivery assignment requests fetched successfully',
    data: result,
  });
});

export const DeliveryAssignmentController = {
  requestDeliveryAssignment,
  acceptDeliveryAssignment,
  rejectDeliveryAssignment,
  getMyPendingRequests,
};

