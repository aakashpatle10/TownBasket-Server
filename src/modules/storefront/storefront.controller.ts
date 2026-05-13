import { Request, Response } from 'express';
import { AppError } from '../../utils/AppError.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { uploadBufferToCloudinary } from '../../utils/cloudinaryUploader.js';
import { getRouteParam } from '../../utils/routeHelpers.js';
import { parseStringArray } from '../../utils/textSanitizer.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { StorefrontService } from './storefront.service.js';

const getAuthenticatedUserId = (req: Request): string => {
  if (!req.user) {
    throw new AppError(401, 'Unauthorized access');
  }

  return req.user.userId;
};

const getFileByField = (req: Request, fieldName: string): Express.Multer.File | undefined => {
  if (!req.files || Array.isArray(req.files)) {
    return undefined;
  }

  return req.files[fieldName]?.[0];
};

const getQueryPagination = (req: Request) => ({
  page: Number(req.query.page),
  limit: Number(req.query.limit),
});

const updateMyStorefront = catchAsync(async (req: Request, res: Response) => {
  const bannerFile = getFileByField(req, 'banner');
  const profileImageFile = getFileByField(req, 'profileImage');
  const [banner, profileImage] = await Promise.all([
    bannerFile
      ? uploadBufferToCloudinary(bannerFile, {
          folder: 'quick-commerce/storefront/banners',
          resource_type: 'image',
        })
      : undefined,
    profileImageFile
      ? uploadBufferToCloudinary(profileImageFile, {
          folder: 'quick-commerce/storefront/profile-images',
          resource_type: 'image',
        })
      : undefined,
  ]);

  const result = await StorefrontService.updateMyStorefront({
    sellerId: getAuthenticatedUserId(req),
    bio: req.body.bio,
    banner,
    profileImage,
    featuredProducts: parseStringArray(req.body.featuredProducts),
  });

  sendResponse(res, {
    statusCode: 200,
    message: 'Storefront updated successfully',
    data: result,
  });
});

const getSellerProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await StorefrontService.getSellerProfile(getRouteParam(req, 'sellerId'));

  sendResponse(res, {
    statusCode: 200,
    message: 'Seller storefront fetched successfully',
    data: result,
  });
});

const getSellerProducts = catchAsync(async (req: Request, res: Response) => {
  const result = await StorefrontService.getSellerProducts(getRouteParam(req, 'sellerId'), getQueryPagination(req));

  sendResponse(res, {
    statusCode: 200,
    message: 'Seller storefront products fetched successfully',
    data: result,
  });
});

const getSellerPosts = catchAsync(async (req: Request, res: Response) => {
  const result = await StorefrontService.getSellerPosts(getRouteParam(req, 'sellerId'), getQueryPagination(req));

  sendResponse(res, {
    statusCode: 200,
    message: 'Seller storefront posts fetched successfully',
    data: result,
  });
});

const getSellerReels = catchAsync(async (req: Request, res: Response) => {
  const result = await StorefrontService.getSellerReels(getRouteParam(req, 'sellerId'), getQueryPagination(req));

  sendResponse(res, {
    statusCode: 200,
    message: 'Seller storefront reels fetched successfully',
    data: result,
  });
});

export const StorefrontController = {
  updateMyStorefront,
  getSellerProfile,
  getSellerProducts,
  getSellerPosts,
  getSellerReels,
};

