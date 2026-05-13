import { Request, Response } from 'express';
import { AppError } from '../../utils/AppError.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { uploadBufferToCloudinary, uploadManyToCloudinary } from '../../utils/cloudinaryUploader.js';
import { getRouteParam } from '../../utils/routeHelpers.js';
import { parseStringArray } from '../../utils/textSanitizer.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { SocialService } from './social.service.js';

const getAuthenticatedUserId = (req: Request): string => {
  if (!req.user) {
    throw new AppError(401, 'Unauthorized access');
  }

  return req.user.userId;
};

const getFilesByField = (req: Request, fieldName: string): Express.Multer.File[] => {
  if (!req.files || Array.isArray(req.files)) {
    return [];
  }

  return req.files[fieldName] ?? [];
};

const getQueryPagination = (req: Request) => ({
  page: Number(req.query.page),
  limit: Number(req.query.limit),
});

const createPost = catchAsync(async (req: Request, res: Response) => {
  const uploadedImages = await uploadManyToCloudinary(getFilesByField(req, 'images'), {
    folder: 'quick-commerce/social/posts',
    resource_type: 'image',
  });

  const result = await SocialService.createPost({
    sellerId: getAuthenticatedUserId(req),
    caption: req.body.caption,
    images: uploadedImages,
    imageUrls: parseStringArray(req.body.imageUrls),
    taggedProducts: parseStringArray(req.body.taggedProducts),
    hashtags: parseStringArray(req.body.hashtags),
  });

  sendResponse(res, {
    statusCode: 201,
    message: 'Post created successfully',
    data: result,
  });
});

const updatePost = catchAsync(async (req: Request, res: Response) => {
  const uploadedImages = await uploadManyToCloudinary(getFilesByField(req, 'images'), {
    folder: 'quick-commerce/social/posts',
    resource_type: 'image',
  });

  const result = await SocialService.updatePost(getAuthenticatedUserId(req), getRouteParam(req, 'id'), {
    caption: req.body.caption,
    images: uploadedImages,
    imageUrls: parseStringArray(req.body.imageUrls),
    taggedProducts: req.body.taggedProducts === undefined ? undefined : parseStringArray(req.body.taggedProducts),
    hashtags: req.body.hashtags === undefined ? undefined : parseStringArray(req.body.hashtags),
  });

  sendResponse(res, {
    statusCode: 200,
    message: 'Post updated successfully',
    data: result,
  });
});

const deletePost = catchAsync(async (req: Request, res: Response) => {
  const result = await SocialService.deletePost(getAuthenticatedUserId(req), getRouteParam(req, 'id'));

  sendResponse(res, {
    statusCode: 200,
    message: 'Post deleted successfully',
    data: result,
  });
});

const getPostsFeed = catchAsync(async (req: Request, res: Response) => {
  const result = await SocialService.getPostsFeed(req.user?.userId, getQueryPagination(req));

  sendResponse(res, {
    statusCode: 200,
    message: 'Posts feed fetched successfully',
    data: result,
  });
});

const getCombinedFeed = catchAsync(async (req: Request, res: Response) => {
  const result = await SocialService.getCombinedFeed(req.user?.userId, getQueryPagination(req));

  sendResponse(res, {
    statusCode: 200,
    message: 'Social feed fetched successfully',
    data: result,
  });
});

const getSinglePost = catchAsync(async (req: Request, res: Response) => {
  const result = await SocialService.getSinglePost(getRouteParam(req, 'id'));

  sendResponse(res, {
    statusCode: 200,
    message: 'Post fetched successfully',
    data: result,
  });
});

const togglePostLike = catchAsync(async (req: Request, res: Response) => {
  const result = await SocialService.togglePostLike(getRouteParam(req, 'id'), getAuthenticatedUserId(req));

  sendResponse(res, {
    statusCode: 200,
    message: 'Post like status updated successfully',
    data: result,
  });
});

const commentOnPost = catchAsync(async (req: Request, res: Response) => {
  const result = await SocialService.commentOnPost(getRouteParam(req, 'id'), getAuthenticatedUserId(req), req.body.comment);

  sendResponse(res, {
    statusCode: 201,
    message: 'Post comment added successfully',
    data: result,
  });
});

const createReel = catchAsync(async (req: Request, res: Response) => {
  const videoFile = getFilesByField(req, 'video')[0];
  const thumbnailFile = getFilesByField(req, 'thumbnail')[0];
  const [video, thumbnail] = await Promise.all([
    videoFile
      ? uploadBufferToCloudinary(videoFile, {
          folder: 'quick-commerce/social/reels',
          resource_type: 'video',
        })
      : undefined,
    thumbnailFile
      ? uploadBufferToCloudinary(thumbnailFile, {
          folder: 'quick-commerce/social/reels/thumbnails',
          resource_type: 'image',
        })
      : undefined,
  ]);

  const result = await SocialService.createReel({
    sellerId: getAuthenticatedUserId(req),
    caption: req.body.caption,
    video,
    videoUrl: req.body.videoUrl,
    thumbnail,
    thumbnailUrl: req.body.thumbnailUrl,
    taggedProducts: parseStringArray(req.body.taggedProducts),
    hashtags: parseStringArray(req.body.hashtags),
  });

  sendResponse(res, {
    statusCode: 201,
    message: 'Reel created successfully',
    data: result,
  });
});

const getReelsFeed = catchAsync(async (req: Request, res: Response) => {
  const result = await SocialService.getReelsFeed(req.user?.userId, getQueryPagination(req));

  sendResponse(res, {
    statusCode: 200,
    message: 'Reels feed fetched successfully',
    data: result,
  });
});

const getSellerReels = catchAsync(async (req: Request, res: Response) => {
  const result = await SocialService.getSellerReels(getRouteParam(req, 'sellerId'), getQueryPagination(req));

  sendResponse(res, {
    statusCode: 200,
    message: 'Seller reels fetched successfully',
    data: result,
  });
});

const toggleReelLike = catchAsync(async (req: Request, res: Response) => {
  const result = await SocialService.toggleReelLike(getRouteParam(req, 'id'), getAuthenticatedUserId(req));

  sendResponse(res, {
    statusCode: 200,
    message: 'Reel like status updated successfully',
    data: result,
  });
});

const commentOnReel = catchAsync(async (req: Request, res: Response) => {
  const result = await SocialService.commentOnReel(getRouteParam(req, 'id'), getAuthenticatedUserId(req), req.body.comment);

  sendResponse(res, {
    statusCode: 201,
    message: 'Reel comment added successfully',
    data: result,
  });
});

const shareReel = catchAsync(async (req: Request, res: Response) => {
  const result = await SocialService.shareReel(getRouteParam(req, 'id'));

  sendResponse(res, {
    statusCode: 200,
    message: 'Reel shared successfully',
    data: result,
  });
});

const registerReelView = catchAsync(async (req: Request, res: Response) => {
  const result = await SocialService.registerReelView(getRouteParam(req, 'id'));

  sendResponse(res, {
    statusCode: 200,
    message: 'Reel view registered successfully',
    data: result,
  });
});

const followSeller = catchAsync(async (req: Request, res: Response) => {
  const result = await SocialService.followSeller(getAuthenticatedUserId(req), getRouteParam(req, 'sellerId'));

  sendResponse(res, {
    statusCode: 201,
    message: 'Seller followed successfully',
    data: result,
  });
});

const unfollowSeller = catchAsync(async (req: Request, res: Response) => {
  const result = await SocialService.unfollowSeller(getAuthenticatedUserId(req), getRouteParam(req, 'sellerId'));

  sendResponse(res, {
    statusCode: 200,
    message: 'Seller unfollowed successfully',
    data: result,
  });
});

const getFollowers = catchAsync(async (req: Request, res: Response) => {
  const result = await SocialService.getFollowers(getRouteParam(req, 'sellerId'), getQueryPagination(req));

  sendResponse(res, {
    statusCode: 200,
    message: 'Followers fetched successfully',
    data: result,
  });
});

const getFollowing = catchAsync(async (req: Request, res: Response) => {
  const result = await SocialService.getFollowing(getAuthenticatedUserId(req), getQueryPagination(req));

  sendResponse(res, {
    statusCode: 200,
    message: 'Following fetched successfully',
    data: result,
  });
});

export const SocialController = {
  createPost,
  updatePost,
  deletePost,
  getPostsFeed,
  getCombinedFeed,
  getSinglePost,
  togglePostLike,
  commentOnPost,
  createReel,
  getReelsFeed,
  getSellerReels,
  toggleReelLike,
  commentOnReel,
  shareReel,
  registerReelView,
  followSeller,
  unfollowSeller,
  getFollowers,
  getFollowing,
};
