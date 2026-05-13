import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { getRouteParam } from '../../utils/routeHelpers.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { ReviewService } from './review.service.js';

const getAuthenticatedUserId = (req: Request): string => {
  if (!req.user) {
    throw new Error('Unauthorized: User not authenticated');
  }

  return req.user.userId;
};

const createReview = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.createReview(getAuthenticatedUserId(req), getRouteParam(req, 'productId'), req.body);

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: 'Review created successfully',
    data: result,
  });
});

const getProductReviews = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.getProductReviews(getRouteParam(req, 'productId'));

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Reviews fetched successfully',
    data: result,
  });
});

const updateReview = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.updateReview(getAuthenticatedUserId(req), getRouteParam(req, 'reviewId'), req.body);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Review updated successfully',
    data: result,
  });
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.deleteReview(getAuthenticatedUserId(req), getRouteParam(req, 'reviewId'));

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Review deleted successfully',
    data: result,
  });
});

export const ReviewController = {
  createReview,
  getProductReviews,
  updateReview,
  deleteReview,
};
