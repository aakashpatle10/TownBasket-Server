import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { ShopService } from './shop.service.js';
import { getRouteParam } from '../../utils/routeHelpers.js';

const createShop = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new Error('Unauthorized: User not authenticated');
  }
  const owner = req.user.userId;

  const result = await ShopService.createShop({
    ...req.body,
    owner,
  });

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: 'Shop created successfully',
    data: result,
  });
});

const getAllShops = catchAsync(async (_req: Request, res: Response) => {
  const result = await ShopService.getAllShops();

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Shops fetched successfully',
    data: result,
  });
});

const getSingleShop = catchAsync(async (req: Request, res: Response) => {
  const result = await ShopService.getSingleShop(getRouteParam(req, 'id'));

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Shop fetched successfully',
    data: result,
  });
});

export const ShopController = {
  createShop,
  getAllShops,
  getSingleShop,
};