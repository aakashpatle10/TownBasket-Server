import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { ProductService } from './product.service.js';
import { getRouteParam } from '../../utils/routeHelpers.js';

const getStringQuery = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized || undefined;
};

const getNumberQuery = (value: unknown): number | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const getBooleanQuery = (value: unknown): boolean | undefined => {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return undefined;
};

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

const searchProducts = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.searchProducts({
    q: getStringQuery(req.query.q),
    query: getStringQuery(req.query.query),
    category: getStringQuery(req.query.category),
    shop: getStringQuery(req.query.shop),
    page: getNumberQuery(req.query.page),
    limit: getNumberQuery(req.query.limit),
    inStock: getBooleanQuery(req.query.inStock),
    sortBy: getStringQuery(req.query.sortBy) as
      | 'relevance'
      | 'newest'
      | 'price_asc'
      | 'price_desc'
      | 'rating'
      | 'popular'
      | undefined,
  });

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Product search results fetched successfully',
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
  searchProducts,
  getSingleProduct,
  getShopProducts,
  updateProduct,
};
