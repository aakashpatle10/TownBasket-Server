import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { getRouteParam } from '../../utils/routeHelpers.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { AddressService } from './address.service.js';

const getAuthenticatedUserId = (req: Request): string => {
  if (!req.user) {
    throw new Error('Unauthorized: User not authenticated');
  }

  return req.user.userId;
};

const createAddress = catchAsync(async (req: Request, res: Response) => {
  const result = await AddressService.createAddress(getAuthenticatedUserId(req), req.body);

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: 'Address added successfully',
    data: result,
  });
});

const getUserAddresses = catchAsync(async (req: Request, res: Response) => {
  const result = await AddressService.getUserAddresses(getAuthenticatedUserId(req));

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Addresses fetched successfully',
    data: result,
  });
});

const updateAddress = catchAsync(async (req: Request, res: Response) => {
  const result = await AddressService.updateAddress(getAuthenticatedUserId(req), getRouteParam(req, 'id'), req.body);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Address updated successfully',
    data: result,
  });
});

const deleteAddress = catchAsync(async (req: Request, res: Response) => {
  const result = await AddressService.deleteAddress(getAuthenticatedUserId(req), getRouteParam(req, 'id'));

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Address deleted successfully',
    data: result,
  });
});

const setDefaultAddress = catchAsync(async (req: Request, res: Response) => {
  const result = await AddressService.setDefaultAddress(getAuthenticatedUserId(req), getRouteParam(req, 'id'));

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Default address updated successfully',
    data: result,
  });
});

export const AddressController = {
  createAddress,
  getUserAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
