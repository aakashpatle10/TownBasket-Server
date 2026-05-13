import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { ProductService } from './product.service.js';
import { getRouteParam } from '../../utils/routeHelpers.js';

const createProduct = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.createProduct(req.body);

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: 'Product created successfully',
    data: result,
  });
});

const getAllProducts = catchAsync(async (_req: Request, res: Response) => {
  const result = await ProductService.getAllProducts();

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Products fetched successfully',
    data: result,
  });
});

const getSingleProduct = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.getSingleProduct(getRouteParam(req, 'id'));

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Product fetched successfully',
    data: result,
  });
});

const getShopProducts = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.getShopProducts(getRouteParam(req, 'shopId'));

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Shop products fetched successfully',
    data: result,
  });
});

const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.updateProduct(getRouteParam(req, 'id'), req.body);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Product updated successfully',
    data: result,
  });
});

export const ProductController = {
  createProduct,
  getAllProducts,
  getSingleProduct,
  getShopProducts,
  updateProduct,
};
