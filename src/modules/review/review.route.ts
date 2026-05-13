import express from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import validateRequest from '../../middlewares/validateRequest.js';
import { ReviewController } from './review.controller.js';
import { createReviewValidation, updateReviewValidation } from './review.validation.js';

const router = express.Router();

router.post('/:productId', authMiddleware, validateRequest(createReviewValidation), ReviewController.createReview);
router.get('/:productId', ReviewController.getProductReviews);
router.put('/:reviewId', authMiddleware, validateRequest(updateReviewValidation), ReviewController.updateReview);
router.delete('/:reviewId', authMiddleware, ReviewController.deleteReview);

export const ReviewRoutes = router;
