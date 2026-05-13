import express from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import validateRequest from '../../middlewares/validateRequest.js';
import { RecommendationController } from './recommendation.controller.js';
import { recommendationQueryValidation } from './recommendation.validation.js';

const router = express.Router();

router.get('/trending', validateRequest(recommendationQueryValidation), RecommendationController.getTrendingRecommendations);
router.get(
  '/products',
  authMiddleware,
  validateRequest(recommendationQueryValidation),
  RecommendationController.getProductRecommendations
);
router.post('/views/:productId', authMiddleware, RecommendationController.recordProductView);

export const RecommendationRoutes = router;
