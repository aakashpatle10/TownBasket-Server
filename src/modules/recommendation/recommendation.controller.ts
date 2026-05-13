import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { getRouteParam } from '../../utils/routeHelpers.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { RecommendationService } from './recommendation.service.js';

const getAuthenticatedUserId = (req: Request): string => {
  if (!req.user) {
    throw new Error('Unauthorized: User not authenticated');
  }

  return req.user.userId;
};

const getLimit = (value: unknown): number | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const getCategories = (value: unknown): string[] | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  return value.split(',').map((category) => category.trim()).filter(Boolean);
};

const recordProductView = catchAsync(async (req: Request, res: Response) => {
  const result = await RecommendationService.recordProductView(
    getAuthenticatedUserId(req),
    getRouteParam(req, 'productId')
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Product view recorded successfully',
    data: result,
  });
});

const getProductRecommendations = catchAsync(async (req: Request, res: Response) => {
  const result = await RecommendationService.getProductRecommendations(getAuthenticatedUserId(req), {
    limit: getLimit(req.query.limit),
    categories: getCategories(req.query.categories),
  });

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Product recommendations fetched successfully',
    data: result,
  });
});

const getTrendingRecommendations = catchAsync(async (req: Request, res: Response) => {
  const result = await RecommendationService.getTrendingRecommendations(getLimit(req.query.limit));

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Trending recommendations fetched successfully',
    data: result,
  });
});

export const RecommendationController = {
  recordProductView,
  getProductRecommendations,
  getTrendingRecommendations,
};
