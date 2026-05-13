import mongoose, { Types } from 'mongoose';
import { AppError } from '../../utils/AppError.js';
import { UploadedMedia } from '../../utils/cloudinaryUploader.js';
import { sanitizeText } from '../../utils/textSanitizer.js';
import { PRODUCT_STATUS } from '../products/product.interface.js';
import { Product } from '../products/product.model.js';
import { Shop } from '../shop/shop.model.js';
import { FollowStats } from '../social/follow.model.js';
import { SocialPost } from '../social/socialPost.model.js';
import { SocialReel } from '../social/socialReel.model.js';

type PaginationQuery = {
  page?: number;
  limit?: number;
};

type UpdateStorefrontPayload = {
  sellerId: string;
  bio?: string;
  banner?: UploadedMedia;
  profileImage?: UploadedMedia;
  featuredProducts?: string[];
};

const validateObjectId = (id: string, entity: string) => {
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

const getSellerShopOrThrow = async (sellerId: string) => {
  validateObjectId(sellerId, 'seller');

  const shop = await Shop.findOne({ owner: sellerId }).populate('owner', 'name email phone').lean();
  if (!shop) {
    throw new AppError(404, 'Seller storefront not found');
  }

  return shop;
};

const updateMyStorefront = async (payload: UpdateStorefrontPayload) => {
  const shop = await Shop.findOne({ owner: payload.sellerId });
  if (!shop) {
    throw new AppError(404, 'Seller shop not found');
  }

  if (payload.bio !== undefined) {
    shop.bio = sanitizeText(payload.bio, 1000);
  }

  if (payload.banner) {
    shop.banner = payload.banner.url;
    shop.bannerPublicId = payload.banner.publicId;
  }

  if (payload.profileImage) {
    shop.profileImage = payload.profileImage.url;
    shop.profileImagePublicId = payload.profileImage.publicId;
  }

  if (payload.featuredProducts) {
    const uniqueProductIds = [...new Set(payload.featuredProducts)];
    const count = await Product.countDocuments({
      _id: { $in: uniqueProductIds },
      shop: shop._id,
    });

    if (count !== uniqueProductIds.length) {
      throw new AppError(400, 'Featured products must belong to your shop');
    }

    shop.featuredProducts = uniqueProductIds.map((productId) => new Types.ObjectId(productId));
  }

  await shop.save();

  return shop.populate([
    { path: 'owner', select: 'name email phone' },
    { path: 'featuredProducts', select: 'title image images price discountPrice' },
  ]);
};

const getSellerProfile = async (sellerId: string) => {
  const shop = await getSellerShopOrThrow(sellerId);
  const [stats, ratings, productsCount, postsCount, reelsCount, latestProducts, latestPosts, latestReels] = await Promise.all([
    FollowStats.findOne({ user: sellerId }).lean(),
    Product.aggregate([
      { $match: { shop: shop._id } },
      {
        $group: {
          _id: '$shop',
          averageRating: { $avg: '$averageRating' },
          totalReviews: { $sum: '$totalReviews' },
        },
      },
    ]),
    Product.countDocuments({ shop: shop._id, isActive: true, status: PRODUCT_STATUS.PUBLISHED }),
    SocialPost.countDocuments({ seller: sellerId }),
    SocialReel.countDocuments({ seller: sellerId }),
    Product.find({ shop: shop._id, isActive: true, status: PRODUCT_STATUS.PUBLISHED })
      .sort({ createdAt: -1 })
      .limit(8)
      .select('title image images price discountPrice averageRating totalReviews'),
    SocialPost.find({ seller: sellerId }).sort({ createdAt: -1 }).limit(6).select('caption images likesCount commentsCount createdAt taggedProducts'),
    SocialReel.find({ seller: sellerId }).sort({ createdAt: -1 }).limit(6).select('caption video thumbnail viewsCount likesCount commentsCount sharesCount createdAt taggedProducts'),
  ]);

  return {
    shop,
    ratings: {
      averageRating: ratings[0]?.averageRating ?? 0,
      totalReviews: ratings[0]?.totalReviews ?? 0,
    },
    counts: {
      totalProducts: productsCount,
      followers: stats?.followersCount ?? 0,
      totalPosts: postsCount,
      totalReels: reelsCount,
    },
    featuredProducts: shop.featuredProducts?.length
      ? await Product.find({ _id: { $in: shop.featuredProducts } }).select('title image images price discountPrice averageRating totalReviews')
      : latestProducts,
    latestProducts,
    latestPosts,
    latestReels,
  };
};

const getSellerProducts = async (sellerId: string, query: PaginationQuery = {}) => {
  const shop = await getSellerShopOrThrow(sellerId);
  const { page, limit, skip } = getPagination(query);

  const products = await Product.find({ shop: shop._id, isActive: true, status: PRODUCT_STATUS.PUBLISHED })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return { data: products, meta: { page, limit } };
};

const getSellerPosts = async (sellerId: string, query: PaginationQuery = {}) => {
  await getSellerShopOrThrow(sellerId);
  const { page, limit, skip } = getPagination(query);

  const posts = await SocialPost.find({ seller: sellerId })
    .populate('taggedProducts', 'title image images price discountPrice')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return { data: posts, meta: { page, limit } };
};

const getSellerReels = async (sellerId: string, query: PaginationQuery = {}) => {
  await getSellerShopOrThrow(sellerId);
  const { page, limit, skip } = getPagination(query);

  const reels = await SocialReel.find({ seller: sellerId })
    .populate('taggedProducts', 'title image images price discountPrice')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return { data: reels, meta: { page, limit } };
};

export const StorefrontService = {
  updateMyStorefront,
  getSellerProfile,
  getSellerProducts,
  getSellerPosts,
  getSellerReels,
};

