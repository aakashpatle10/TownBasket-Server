import mongoose, { Types } from 'mongoose';
import { AppError } from '../../utils/AppError.js';
import { ORDER_STATUS } from '../order/order.interface.js';
import { Order } from '../order/order.model.js';
import { Product } from '../products/product.model.js';
import { IReview } from './review.interface.js';
import { Review } from './review.model.js';

type CreateReviewPayload = Pick<IReview, 'rating' | 'comment' | 'images'> & {
  order: string;
};

type UpdateReviewPayload = Partial<Pick<IReview, 'rating' | 'comment' | 'images'>>;

const validateObjectId = (id: string, entity: string) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, `Invalid ${entity} id`);
  }
};

const updateProductRating = async (productId: string | Types.ObjectId) => {
  const productObjectId = new Types.ObjectId(productId);
  const [ratingSummary] = await Review.aggregate<{ averageRating: number; totalReviews: number }>([
    {
      $match: {
        product: productObjectId,
      },
    },
    {
      $group: {
        _id: '$product',
        averageRating: {
          $avg: '$rating',
        },
        totalReviews: {
          $sum: 1,
        },
      },
    },
  ]);

  await Product.findByIdAndUpdate(productObjectId, {
    averageRating: ratingSummary ? Number(ratingSummary.averageRating.toFixed(1)) : 0,
    totalReviews: ratingSummary?.totalReviews ?? 0,
  });
};

const createReview = async (userId: string, productId: string, payload: CreateReviewPayload) => {
  validateObjectId(productId, 'product');
  validateObjectId(payload.order, 'order');

  const product = await Product.findById(productId).select('_id').lean();
  if (!product) {
    throw new AppError(404, 'Product not found');
  }

  const deliveredOrder = await Order.findOne({
    _id: payload.order,
    user: userId,
    orderStatus: ORDER_STATUS.DELIVERED,
    'items.product': productId,
  }).select('_id').lean();

  if (!deliveredOrder) {
    throw new AppError(400, 'Only delivered purchased products can be reviewed');
  }

  const existingReview = await Review.findOne({ product: productId, user: userId }).select('_id').lean();
  if (existingReview) {
    throw new AppError(409, 'You have already reviewed this product');
  }

  const review = await Review.create({
    product: productId,
    user: userId,
    order: payload.order,
    rating: payload.rating,
    comment: payload.comment,
    images: payload.images ?? [],
    isVerifiedPurchase: true,
  });

  await updateProductRating(productId);

  return review.populate([
    {
      path: 'user',
      select: 'name',
    },
    {
      path: 'product',
    },
  ]);
};

const getProductReviews = async (productId: string) => {
  validateObjectId(productId, 'product');

  return Review.find({ product: productId })
    .populate('user', 'name')
    .sort({ createdAt: -1 });
};

const updateReview = async (userId: string, reviewId: string, payload: UpdateReviewPayload) => {
  validateObjectId(reviewId, 'review');

  const review = await Review.findOneAndUpdate(
    { _id: reviewId, user: userId },
    payload,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!review) {
    throw new AppError(404, 'Review not found');
  }

  await updateProductRating(review.product);

  return review.populate('user', 'name');
};

const deleteReview = async (userId: string, reviewId: string) => {
  validateObjectId(reviewId, 'review');

  const review = await Review.findOneAndDelete({ _id: reviewId, user: userId });
  if (!review) {
    throw new AppError(404, 'Review not found');
  }

  await updateProductRating(review.product);

  return review;
};

export const ReviewService = {
  createReview,
  getProductReviews,
  updateReview,
  deleteReview,
};
