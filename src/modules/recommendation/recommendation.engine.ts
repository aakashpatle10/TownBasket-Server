import { Types } from 'mongoose';
import { IProduct } from '../products/product.interface.js';

export type RecommendationProduct = IProduct & {
  _id: Types.ObjectId;
};

export type RecommendationSignals = {
  purchasedProductScores: Map<string, number>;
  viewedProductScores: Map<string, number>;
  likedProductScores: Map<string, number>;
  categoryScores: Map<string, number>;
};

export type RecommendationResult = {
  product: RecommendationProduct;
  score: number;
  reasons: string[];
};

const normalizeCategory = (category: string): string => category.trim().toLowerCase();

const incrementMap = (map: Map<string, number>, key: string, weight = 1): void => {
  const normalizedKey = key.trim();
  if (!normalizedKey) {
    return;
  }

  map.set(normalizedKey, (map.get(normalizedKey) ?? 0) + weight);
};

export const addCategorySignal = (
  signals: RecommendationSignals,
  category: string | undefined,
  weight: number
): void => {
  if (!category) {
    return;
  }

  incrementMap(signals.categoryScores, normalizeCategory(category), weight);
};

export const createEmptySignals = (): RecommendationSignals => ({
  purchasedProductScores: new Map<string, number>(),
  viewedProductScores: new Map<string, number>(),
  likedProductScores: new Map<string, number>(),
  categoryScores: new Map<string, number>(),
});

export const getSignalProductIds = (signals: RecommendationSignals): string[] => {
  return [
    ...signals.purchasedProductScores.keys(),
    ...signals.viewedProductScores.keys(),
    ...signals.likedProductScores.keys(),
  ];
};

export const getSignalCategories = (signals: RecommendationSignals): string[] => {
  return [...signals.categoryScores.keys()];
};

const getProductBaseScore = (product: RecommendationProduct): number => {
  return (
    product.soldCount * 0.35 +
    product.averageRating * 2 +
    product.totalReviews * 0.08 +
    (product.stock > 0 ? 1 : 0)
  );
};

const getProductSignalScore = (
  productId: string,
  productCategory: string,
  signals: RecommendationSignals
): { score: number; reasons: string[] } => {
  const reasons: string[] = [];
  let score = 0;

  const purchaseScore = signals.purchasedProductScores.get(productId) ?? 0;
  if (purchaseScore > 0) {
    score += purchaseScore * 8;
    reasons.push('purchase_history');
  }

  const viewScore = signals.viewedProductScores.get(productId) ?? 0;
  if (viewScore > 0) {
    score += viewScore * 4;
    reasons.push('viewed_product');
  }

  const likedScore = signals.likedProductScores.get(productId) ?? 0;
  if (likedScore > 0) {
    score += likedScore * 6;
    reasons.push('liked_post');
  }

  const categoryScore = signals.categoryScores.get(normalizeCategory(productCategory)) ?? 0;
  if (categoryScore > 0) {
    score += categoryScore * 5;
    reasons.push('category_match');
  }

  return {
    score,
    reasons,
  };
};

export const scoreRecommendationProducts = (
  products: RecommendationProduct[],
  signals: RecommendationSignals
): RecommendationResult[] => {
  return products
    .map((product) => {
      const productId = product._id.toString();
      const signalScore = getProductSignalScore(productId, product.category, signals);

      return {
        product,
        score: signalScore.score + getProductBaseScore(product),
        reasons: signalScore.reasons.length > 0 ? signalScore.reasons : ['trending'],
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return right.product.soldCount - left.product.soldCount;
    });
};
