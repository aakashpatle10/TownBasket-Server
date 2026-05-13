import mongoose, { Types } from 'mongoose';
import { AppError } from '../../utils/AppError.js';
import { ORDER_STATUS } from '../order/order.interface.js';
import { Order } from '../order/order.model.js';
import { Product } from '../products/product.model.js';
import { PRODUCT_STATUS } from '../products/product.interface.js';
import { SOCIAL_MODERATION_STATUS } from '../social/social.interface.js';
import { PostLike, SocialPost } from '../social/socialPost.model.js';
import {
  RecommendationProduct,
  addCategorySignal,
  createEmptySignals,
  getSignalCategories,
  getSignalProductIds,
  scoreRecommendationProducts,
} from './recommendation.engine.js';
import { expandRecommendationCategories } from './recommendation.ai.js';
import { ProductView } from './productView.model.js';

type RecommendationQuery = {
  limit?: number;
  categories?: string[];
};

type PopulatedOrderProduct = {
  _id: Types.ObjectId;
  category: string;
};

type PopulatedOrder = {
  items: Array<{
    product?: Types.ObjectId | PopulatedOrderProduct | null;
    quantity: number;
  }>;
};

type PopulatedProductView = {
  product?: Types.ObjectId | PopulatedOrderProduct | null;
  count: number;
};

type PopulatedLikedPost = {
  taggedProducts: PopulatedOrderProduct[];
};

const normalizeLimit = (limit?: number): number => Math.min(Math.max(limit ?? 20, 1), 50);

const getProductId = (product: Types.ObjectId | PopulatedOrderProduct): string => {
  if (product instanceof Types.ObjectId) {
    return product.toString();
  }

  return product._id.toString();
};

const getProductCategory = (product: Types.ObjectId | PopulatedOrderProduct): string | undefined => {
  if (product instanceof Types.ObjectId) {
    return undefined;
  }

  return product.category;
};

const parseCategories = (categories: string[] = []): string[] => {
  return categories
    .flatMap((category) => category.split(','))
    .map((category) => category.trim().toLowerCase())
    .filter(Boolean);
};

const getTrendingProducts = async (limit = 20, excludeIds: string[] = []) => {
  return Product.find({
    _id: {
      $nin: excludeIds.map((id) => new Types.ObjectId(id)),
    },
    isActive: true,
    status: PRODUCT_STATUS.PUBLISHED,
    stock: {
      $gt: 0,
    },
  })
    .sort({
      soldCount: -1,
      averageRating: -1,
      totalReviews: -1,
      createdAt: -1,
    })
    .limit(normalizeLimit(limit))
    .populate('shop', 'shopName profileImage')
    .lean();
};

const recordProductView = async (userId: string, productId: string) => {
  if (!mongoose.isValidObjectId(productId)) {
    throw new AppError(400, 'Invalid product id');
  }

  const product = await Product.findOne({
    _id: productId,
    isActive: true,
    status: PRODUCT_STATUS.PUBLISHED,
  }).select('_id').lean();

  if (!product) {
    throw new AppError(404, 'Product not found');
  }

  return ProductView.findOneAndUpdate(
    {
      user: userId,
      product: productId,
    },
    {
      $inc: {
        count: 1,
      },
      $set: {
        lastViewedAt: new Date(),
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  ).populate('product', 'title image images price discountPrice category averageRating totalReviews soldCount');
};

const collectPurchaseSignals = async (userId: string) => {
  return Order.find({
    user: userId,
    orderStatus: {
      $ne: ORDER_STATUS.CANCELLED,
    },
  })
    .select('items.product items.quantity createdAt')
    .populate('items.product', 'category')
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();
};

const collectViewSignals = async (userId: string) => {
  return ProductView.find({ user: userId })
    .select('product count lastViewedAt')
    .populate('product', 'category')
    .sort({ lastViewedAt: -1 })
    .limit(50)
    .lean();
};

const collectLikedPostSignals = async (userId: string) => {
  const postLikes = await PostLike.find({ user: userId })
    .select('post createdAt')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const postIds = postLikes.map((like) => like.post);
  if (postIds.length === 0) {
    return [];
  }

  return SocialPost.find({
    _id: {
      $in: postIds,
    },
    moderationStatus: SOCIAL_MODERATION_STATUS.APPROVED,
  })
    .select('taggedProducts')
    .populate('taggedProducts', 'category')
    .lean();
};

const buildSignals = async (userId: string, query: RecommendationQuery = {}) => {
  const signals = createEmptySignals();
  const [orders, productViews, likedPosts] = await Promise.all([
    collectPurchaseSignals(userId),
    collectViewSignals(userId),
    collectLikedPostSignals(userId),
  ]);

  (orders as unknown as PopulatedOrder[]).forEach((order) => {
    order.items.forEach((item) => {
      if (!item.product) {
        return;
      }

      const productId = getProductId(item.product);
      signals.purchasedProductScores.set(
        productId,
        (signals.purchasedProductScores.get(productId) ?? 0) + item.quantity
      );
      addCategorySignal(signals, getProductCategory(item.product), item.quantity * 2);
    });
  });

  (productViews as unknown as PopulatedProductView[]).forEach((view) => {
    if (!view.product) {
      return;
    }

    const productId = getProductId(view.product);
    signals.viewedProductScores.set(
      productId,
      (signals.viewedProductScores.get(productId) ?? 0) + Math.min(view.count, 5)
    );
    addCategorySignal(signals, getProductCategory(view.product), Math.min(view.count, 5));
  });

  (likedPosts as unknown as PopulatedLikedPost[]).forEach((post) => {
    post.taggedProducts.forEach((product) => {
      const productId = product._id.toString();
      signals.likedProductScores.set(productId, (signals.likedProductScores.get(productId) ?? 0) + 1);
      addCategorySignal(signals, product.category, 3);
    });
  });

  parseCategories(query.categories).forEach((category) => {
    addCategorySignal(signals, category, 4);
  });

  const availableCategories = await Product.distinct('category', {
    isActive: true,
    status: PRODUCT_STATUS.PUBLISHED,
  });
  const aiExpandedCategories = await expandRecommendationCategories(
    getSignalCategories(signals),
    availableCategories
  );

  aiExpandedCategories.forEach((category) => {
    addCategorySignal(signals, category, 2);
  });

  return signals;
};

const getRecommendationCandidates = async (signals: Awaited<ReturnType<typeof buildSignals>>, limit: number) => {
  const signalProductIds = getSignalProductIds(signals).filter((id) => mongoose.isValidObjectId(id));
  const signalCategories = getSignalCategories(signals);
  const candidateFilter: Record<string, unknown> = {
    isActive: true,
    status: PRODUCT_STATUS.PUBLISHED,
    stock: {
      $gt: 0,
    },
  };

  const signalClauses: Array<Record<string, unknown>> = [];
  if (signalProductIds.length > 0) {
    signalClauses.push({
      _id: {
        $in: signalProductIds.map((id) => new Types.ObjectId(id)),
      },
    });
  }

  if (signalCategories.length > 0) {
    signalClauses.push({
      $expr: {
        $in: [
          {
            $toLower: '$category',
          },
          signalCategories,
        ],
      },
    });
  }

  if (signalClauses.length > 0) {
    candidateFilter.$or = signalClauses;
  }

  return Product.find(candidateFilter)
    .populate('shop', 'shopName profileImage')
    .limit(Math.max(limit * 4, 40))
    .lean();
};

const formatRecommendation = (item: ReturnType<typeof scoreRecommendationProducts>[number]) => ({
  product: item.product,
  score: Number(item.score.toFixed(2)),
  reasons: item.reasons,
});

const getProductRecommendations = async (userId: string, query: RecommendationQuery = {}) => {
  const limit = normalizeLimit(query.limit);
  const signals = await buildSignals(userId, query);
  const candidates = await getRecommendationCandidates(signals, limit);
  const scored = scoreRecommendationProducts(candidates as unknown as RecommendationProduct[], signals);
  const selected = scored.slice(0, limit);

  if (selected.length >= limit) {
    return {
      source: 'personalized',
      recommendations: selected.map(formatRecommendation),
    };
  }

  const existingIds = selected.map((item) => item.product._id.toString());
  const trending = await getTrendingProducts(limit - selected.length, existingIds);
  const fallbackRecommendations = (trending as unknown as RecommendationProduct[]).map((product) => ({
    product,
    score: Number((product.soldCount * 0.35 + product.averageRating * 2 + product.totalReviews * 0.08).toFixed(2)),
    reasons: ['trending'],
  }));

  return {
    source: selected.length > 0 ? 'personalized_with_trending_fallback' : 'trending_fallback',
    recommendations: [
      ...selected.map(formatRecommendation),
      ...fallbackRecommendations,
    ],
  };
};

const getTrendingRecommendations = async (limit = 20) => {
  const products = await getTrendingProducts(limit);

  return {
    source: 'trending',
    recommendations: (products as unknown as RecommendationProduct[]).map((product) => ({
      product,
      score: Number((product.soldCount * 0.35 + product.averageRating * 2 + product.totalReviews * 0.08).toFixed(2)),
      reasons: ['trending'],
    })),
  };
};

export const RecommendationService = {
  recordProductView,
  getProductRecommendations,
  getTrendingRecommendations,
};
