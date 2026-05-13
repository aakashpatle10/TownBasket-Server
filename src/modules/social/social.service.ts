import mongoose, { Types } from 'mongoose';
import { SYSTEM_ROLES } from '../../constants/permissions.js';
import { AppError } from '../../utils/AppError.js';
import { UploadedMedia } from '../../utils/cloudinaryUploader.js';
import { normalizeHashtags, sanitizeText } from '../../utils/textSanitizer.js';
import { MODERATION_TARGET_TYPE } from '../moderation/moderation.interface.js';
import { ModerationService } from '../moderation/moderation.service.js';
import { Product } from '../products/product.model.js';
import { Role } from '../role/role.model.js';
import { Shop } from '../shop/shop.model.js';
import { User } from '../user/user.model.js';
import { Follow, FollowStats } from './follow.model.js';
import { PostComment, PostLike, SocialPost } from './socialPost.model.js';
import { SOCIAL_MODERATION_STATUS } from './social.interface.js';
import { ReelComment, ReelLike, SocialReel } from './socialReel.model.js';

type PaginationQuery = {
  page?: number;
  limit?: number;
};

type CreatePostPayload = {
  sellerId: string;
  caption?: string;
  images: UploadedMedia[];
  imageUrls?: string[];
  taggedProducts?: string[];
  hashtags?: unknown;
};

type UpdatePostPayload = Partial<Omit<CreatePostPayload, 'sellerId'>>;

type CreateReelPayload = {
  sellerId: string;
  caption?: string;
  video?: UploadedMedia;
  videoUrl?: string;
  thumbnail?: UploadedMedia;
  thumbnailUrl?: string;
  taggedProducts?: string[];
  hashtags?: unknown;
};

const toObjectId = (id: string | Types.ObjectId): Types.ObjectId => {
  return id instanceof Types.ObjectId ? id : new Types.ObjectId(id);
};

const validateObjectId = (id: string | Types.ObjectId, entity: string) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, `Invalid ${entity} id`);
  }
};

const getPagination = (query: PaginationQuery = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 50);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const getSellerRoleId = async () => {
  const role = await Role.findOne({ name: SYSTEM_ROLES.SELLER }).select('_id').lean();
  if (!role) {
    throw new AppError(400, 'Seller role is not configured');
  }

  return role._id;
};

const assertSellerUser = async (sellerId: string | Types.ObjectId) => {
  validateObjectId(sellerId, 'seller');

  const sellerRoleId = await getSellerRoleId();
  const seller = await User.exists({
    _id: sellerId,
    role: sellerRoleId,
    isBlocked: false,
  });

  if (!seller) {
    throw new AppError(404, 'Seller not found');
  }
};

const getSellerShop = async (sellerId: string | Types.ObjectId) => {
  await assertSellerUser(sellerId);

  const shop = await Shop.findOne({ owner: sellerId }).select('_id').lean();
  if (!shop) {
    throw new AppError(404, 'Seller shop not found');
  }

  return shop;
};

const assertTaggedProductsBelongToShop = async (productIds: string[] = [], shopId: Types.ObjectId) => {
  const uniqueProductIds = [...new Set(productIds)];

  for (const productId of uniqueProductIds) {
    validateObjectId(productId, 'product');
  }

  if (uniqueProductIds.length === 0) {
    return [];
  }

  const count = await Product.countDocuments({
    _id: { $in: uniqueProductIds },
    shop: shopId,
  });

  if (count !== uniqueProductIds.length) {
    throw new AppError(400, 'Tagged products must belong to your shop');
  }

  return uniqueProductIds.map((productId) => new Types.ObjectId(productId));
};

const buildMediaFromUrls = (urls: string[] = []): UploadedMedia[] => {
  return urls
    .map((url) => sanitizeText(url, 1000))
    .filter(Boolean)
    .map((url) => ({
      url,
      publicId: '',
      resourceType: 'image',
    }));
};

const populatePost = async (post: any): Promise<any> => {
  return SocialPost.populate(post, [
    { path: 'seller', select: 'name email phone' },
    { path: 'shop', select: 'shopName banner profileImage bio' },
    { path: 'taggedProducts', select: 'title image images price discountPrice' },
  ]);
};

const populateReel = async (reel: any): Promise<any> => {
  return SocialReel.populate(reel, [
    { path: 'seller', select: 'name email phone' },
    { path: 'shop', select: 'shopName banner profileImage bio' },
    { path: 'taggedProducts', select: 'title image images price discountPrice' },
  ]);
};

const createPost = async (payload: CreatePostPayload) => {
  const shop = await getSellerShop(payload.sellerId);
  const taggedProducts = await assertTaggedProductsBelongToShop(payload.taggedProducts, shop._id);
  const images = [...payload.images, ...buildMediaFromUrls(payload.imageUrls)];

  if (images.length === 0) {
    throw new AppError(400, 'At least one post image is required');
  }

  const post = await SocialPost.create({
    seller: payload.sellerId,
    shop: shop._id,
    caption: sanitizeText(payload.caption, 2000),
    images,
    taggedProducts,
    hashtags: normalizeHashtags(payload.hashtags),
    likesCount: 0,
    commentsCount: 0,
  });

  await ModerationService.moderateContentSafely({
    targetType: MODERATION_TARGET_TYPE.POST,
    target: post._id,
    user: payload.sellerId,
    text: `${post.caption}\n${post.hashtags.join(' ')}`,
  });

  return populatePost(post);
};

const updatePost = async (sellerId: string, postId: string, payload: UpdatePostPayload) => {
  validateObjectId(postId, 'post');

  const existingPost = await SocialPost.findOne({ _id: postId, seller: sellerId });
  if (!existingPost) {
    throw new AppError(404, 'Post not found');
  }

  const updatePayload: Record<string, unknown> = {};

  if (payload.caption !== undefined) {
    updatePayload.caption = sanitizeText(payload.caption, 2000);
  }

  if (payload.hashtags !== undefined) {
    updatePayload.hashtags = normalizeHashtags(payload.hashtags);
  }

  if (payload.taggedProducts !== undefined) {
    updatePayload.taggedProducts = await assertTaggedProductsBelongToShop(
      payload.taggedProducts,
      existingPost.shop
    );
  }

  const media = [...(payload.images ?? []), ...buildMediaFromUrls(payload.imageUrls)];
  if (media.length > 0) {
    updatePayload.images = media;
  }

  const post = await SocialPost.findByIdAndUpdate(postId, updatePayload, {
    new: true,
    runValidators: true,
  });

  if (post && (payload.caption !== undefined || payload.hashtags !== undefined)) {
    await ModerationService.moderateContentSafely({
      targetType: MODERATION_TARGET_TYPE.POST,
      target: post._id,
      user: sellerId,
      text: `${post.caption}\n${post.hashtags.join(' ')}`,
    });
  }

  return populatePost(post);
};

const deletePost = async (sellerId: string, postId: string) => {
  validateObjectId(postId, 'post');

  const post = await SocialPost.findOneAndDelete({ _id: postId, seller: sellerId });
  if (!post) {
    throw new AppError(404, 'Post not found');
  }

  await Promise.all([
    PostLike.deleteMany({ post: postId }),
    PostComment.deleteMany({ post: postId }),
  ]);

  return post;
};

const getFollowedSellerIds = async (userId?: string): Promise<Types.ObjectId[]> => {
  if (!userId || !mongoose.isValidObjectId(userId)) {
    return [];
  }

  const follows = await Follow.find({ buyer: userId }).select('seller').lean();
  return follows.map((follow) => follow.seller);
};

const getPostsFeed = async (userId: string | undefined, query: PaginationQuery = {}) => {
  const { page, limit, skip } = getPagination(query);
  const followedSellerIds = await getFollowedSellerIds(userId);

  const posts = await SocialPost.aggregate([
    {
      $match: {
        moderationStatus: SOCIAL_MODERATION_STATUS.APPROVED,
      },
    },
    {
      $addFields: {
        followedPriority: {
          $cond: [{ $in: ['$seller', followedSellerIds] }, 1, 0],
        },
      },
    },
    { $sort: { followedPriority: -1, createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
  ]);

  const populatedPosts = await populatePost(posts);

  return {
    data: populatedPosts,
    meta: { page, limit },
  };
};

const getSinglePost = async (postId: string) => {
  validateObjectId(postId, 'post');

  const post = await SocialPost.findOne({
    _id: postId,
    moderationStatus: SOCIAL_MODERATION_STATUS.APPROVED,
  });
  if (!post) {
    throw new AppError(404, 'Post not found');
  }

  return populatePost(post);
};

const togglePostLike = async (postId: string, userId: string) => {
  validateObjectId(postId, 'post');

  const postExists = await SocialPost.exists({
    _id: postId,
    moderationStatus: SOCIAL_MODERATION_STATUS.APPROVED,
  });
  if (!postExists) {
    throw new AppError(404, 'Post not found');
  }

  try {
    await PostLike.create({ post: postId, user: userId });
    const post = await SocialPost.findByIdAndUpdate(postId, { $inc: { likesCount: 1 } }, { new: true });

    return { liked: true, likesCount: post?.likesCount ?? 0 };
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) {
      throw error;
    }

    const deleted = await PostLike.deleteOne({ post: postId, user: userId });
    if (deleted.deletedCount > 0) {
      const post = await SocialPost.findByIdAndUpdate(
        postId,
        { $inc: { likesCount: -1 } },
        { new: true }
      );

      return { liked: false, likesCount: post?.likesCount ?? 0 };
    }

    return { liked: false, likesCount: 0 };
  }
};

const commentOnPost = async (postId: string, userId: string, comment: string) => {
  validateObjectId(postId, 'post');

  const sanitizedComment = sanitizeText(comment, 1000);
  if (!sanitizedComment) {
    throw new AppError(400, 'Comment is required');
  }

  const postExists = await SocialPost.exists({
    _id: postId,
    moderationStatus: SOCIAL_MODERATION_STATUS.APPROVED,
  });
  if (!postExists) {
    throw new AppError(404, 'Post not found');
  }

  const createdComment = await PostComment.create({
    post: postId,
    user: userId,
    comment: sanitizedComment,
  });

  await SocialPost.updateOne({ _id: postId }, { $inc: { commentsCount: 1 } });

  return PostComment.populate(createdComment, { path: 'user', select: 'name email' });
};

const createReel = async (payload: CreateReelPayload) => {
  const shop = await getSellerShop(payload.sellerId);
  const taggedProducts = await assertTaggedProductsBelongToShop(payload.taggedProducts, shop._id);
  const videoUrl = payload.video?.url ?? sanitizeText(payload.videoUrl, 1000);

  if (!videoUrl) {
    throw new AppError(400, 'Reel video is required');
  }

  const reel = await SocialReel.create({
    seller: payload.sellerId,
    shop: shop._id,
    caption: sanitizeText(payload.caption, 2000),
    video: {
      url: videoUrl,
      publicId: payload.video?.publicId,
    },
    thumbnail: payload.thumbnail?.url || payload.thumbnailUrl
      ? {
          url: payload.thumbnail?.url ?? sanitizeText(payload.thumbnailUrl, 1000),
          publicId: payload.thumbnail?.publicId,
        }
      : undefined,
    taggedProducts,
    hashtags: normalizeHashtags(payload.hashtags),
    viewsCount: 0,
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
  });

  return populateReel(reel);
};

const getReelsFeed = async (userId: string | undefined, query: PaginationQuery = {}) => {
  const { page, limit, skip } = getPagination(query);
  const followedSellerIds = await getFollowedSellerIds(userId);

  const reels = await SocialReel.aggregate([
    {
      $match: {
        moderationStatus: SOCIAL_MODERATION_STATUS.APPROVED,
      },
    },
    {
      $addFields: {
        followedPriority: {
          $cond: [{ $in: ['$seller', followedSellerIds] }, 1, 0],
        },
      },
    },
    { $sort: { followedPriority: -1, createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
  ]);

  const populatedReels = await populateReel(reels);

  return {
    data: populatedReels,
    meta: { page, limit },
  };
};

const getSellerReels = async (sellerId: string, query: PaginationQuery = {}) => {
  validateObjectId(sellerId, 'seller');
  const { page, limit, skip } = getPagination(query);

  const reels = await SocialReel.find({
    seller: sellerId,
    moderationStatus: SOCIAL_MODERATION_STATUS.APPROVED,
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    data: await populateReel(reels),
    meta: { page, limit },
  };
};

const toggleReelLike = async (reelId: string, userId: string) => {
  validateObjectId(reelId, 'reel');

  const reelExists = await SocialReel.exists({
    _id: reelId,
    moderationStatus: SOCIAL_MODERATION_STATUS.APPROVED,
  });
  if (!reelExists) {
    throw new AppError(404, 'Reel not found');
  }

  try {
    await ReelLike.create({ reel: reelId, user: userId });
    const reel = await SocialReel.findByIdAndUpdate(reelId, { $inc: { likesCount: 1 } }, { new: true });

    return { liked: true, likesCount: reel?.likesCount ?? 0 };
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) {
      throw error;
    }

    const deleted = await ReelLike.deleteOne({ reel: reelId, user: userId });
    if (deleted.deletedCount > 0) {
      const reel = await SocialReel.findByIdAndUpdate(
        reelId,
        { $inc: { likesCount: -1 } },
        { new: true }
      );

      return { liked: false, likesCount: reel?.likesCount ?? 0 };
    }

    return { liked: false, likesCount: 0 };
  }
};

const commentOnReel = async (reelId: string, userId: string, comment: string) => {
  validateObjectId(reelId, 'reel');

  const sanitizedComment = sanitizeText(comment, 1000);
  if (!sanitizedComment) {
    throw new AppError(400, 'Comment is required');
  }

  const reelExists = await SocialReel.exists({
    _id: reelId,
    moderationStatus: SOCIAL_MODERATION_STATUS.APPROVED,
  });
  if (!reelExists) {
    throw new AppError(404, 'Reel not found');
  }

  const createdComment = await ReelComment.create({
    reel: reelId,
    user: userId,
    comment: sanitizedComment,
  });

  await SocialReel.updateOne({ _id: reelId }, { $inc: { commentsCount: 1 } });

  return ReelComment.populate(createdComment, { path: 'user', select: 'name email' });
};

const shareReel = async (reelId: string) => {
  validateObjectId(reelId, 'reel');

  const reel = await SocialReel.findOneAndUpdate(
    {
      _id: reelId,
      moderationStatus: SOCIAL_MODERATION_STATUS.APPROVED,
    },
    { $inc: { sharesCount: 1 } },
    { new: true }
  );
  if (!reel) {
    throw new AppError(404, 'Reel not found');
  }

  return { sharesCount: reel.sharesCount };
};

const registerReelView = async (reelId: string) => {
  validateObjectId(reelId, 'reel');

  const reel = await SocialReel.findOneAndUpdate(
    {
      _id: reelId,
      moderationStatus: SOCIAL_MODERATION_STATUS.APPROVED,
    },
    { $inc: { viewsCount: 1 } },
    { new: true }
  );
  if (!reel) {
    throw new AppError(404, 'Reel not found');
  }

  return { viewsCount: reel.viewsCount };
};

const followSeller = async (buyerId: string, sellerId: string) => {
  validateObjectId(sellerId, 'seller');

  if (buyerId === sellerId) {
    throw new AppError(400, 'You cannot follow yourself');
  }

  await assertSellerUser(sellerId);

  try {
    await Follow.create({ buyer: buyerId, seller: sellerId });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      throw new AppError(400, 'Seller already followed');
    }

    throw error;
  }

  await Promise.all([
    FollowStats.findOneAndUpdate(
      { user: sellerId },
      { $inc: { followersCount: 1 }, $setOnInsert: { followingCount: 0 } },
      { upsert: true, new: true, runValidators: true }
    ),
    FollowStats.findOneAndUpdate(
      { user: buyerId },
      { $inc: { followingCount: 1 }, $setOnInsert: { followersCount: 0 } },
      { upsert: true, new: true, runValidators: true }
    ),
  ]);

  return { following: true };
};

const unfollowSeller = async (buyerId: string, sellerId: string) => {
  validateObjectId(sellerId, 'seller');

  const deleted = await Follow.deleteOne({ buyer: buyerId, seller: sellerId });
  if (deleted.deletedCount === 0) {
    throw new AppError(404, 'Follow relationship not found');
  }

  await Promise.all([
    FollowStats.findOneAndUpdate(
      { user: sellerId },
      { $inc: { followersCount: -1 } },
      { new: true, runValidators: true }
    ),
    FollowStats.findOneAndUpdate(
      { user: buyerId },
      { $inc: { followingCount: -1 } },
      { new: true, runValidators: true }
    ),
  ]);

  return { following: false };
};

const getFollowers = async (sellerId: string, query: PaginationQuery = {}) => {
  validateObjectId(sellerId, 'seller');
  const { page, limit, skip } = getPagination(query);

  const followers = await Follow.find({ seller: sellerId })
    .populate('buyer', 'name email phone')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return { data: followers, meta: { page, limit } };
};

const getFollowing = async (buyerId: string, query: PaginationQuery = {}) => {
  const { page, limit, skip } = getPagination(query);

  const following = await Follow.find({ buyer: buyerId })
    .populate('seller', 'name email phone')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return { data: following, meta: { page, limit } };
};

const getCombinedFeed = async (userId: string | undefined, query: PaginationQuery = {}) => {
  const { page, limit, skip } = getPagination(query);
  const followedSellerIds = await getFollowedSellerIds(userId);
  const perTypeLimit = skip + limit;

  const [posts, reels] = await Promise.all([
    SocialPost.aggregate([
      { $match: { moderationStatus: SOCIAL_MODERATION_STATUS.APPROVED } },
      { $addFields: { followedPriority: { $cond: [{ $in: ['$seller', followedSellerIds] }, 1, 0] } } },
      { $sort: { followedPriority: -1, createdAt: -1 } },
      { $limit: perTypeLimit },
      { $addFields: { feedType: 'post' } },
    ]),
    SocialReel.aggregate([
      { $match: { moderationStatus: SOCIAL_MODERATION_STATUS.APPROVED } },
      { $addFields: { followedPriority: { $cond: [{ $in: ['$seller', followedSellerIds] }, 1, 0] } } },
      { $sort: { followedPriority: -1, createdAt: -1 } },
      { $limit: perTypeLimit },
      { $addFields: { feedType: 'reel' } },
    ]),
  ]);

  const populatedPosts = await populatePost(posts);
  const populatedReels = await populateReel(reels);
  const data = [...populatedPosts, ...populatedReels]
    .sort((left, right) => {
      const priorityDiff = (right.followedPriority ?? 0) - (left.followedPriority ?? 0);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    })
    .slice(skip, skip + limit);

  return { data, meta: { page, limit } };
};

export const SocialService = {
  createPost,
  updatePost,
  deletePost,
  getPostsFeed,
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
  getCombinedFeed,
};
