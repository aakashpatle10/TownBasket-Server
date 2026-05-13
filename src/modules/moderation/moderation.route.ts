import express from 'express';
import { SYSTEM_ROLES } from '../../constants/permissions.js';
import { authMiddleware, requireRoles } from '../../middlewares/auth.middleware.js';
import validateRequest from '../../middlewares/validateRequest.js';
import { ModerationController } from './moderation.controller.js';
import {
  moderationResultsQueryValidation,
  reviewModerationResultValidation,
} from './moderation.validation.js';

const router = express.Router();

router.use(authMiddleware, requireRoles(SYSTEM_ROLES.ADMIN));

router.get(
  '/results',
  validateRequest(moderationResultsQueryValidation),
  ModerationController.getModerationResults
);
router.patch(
  '/results/:id/review',
  validateRequest(reviewModerationResultValidation),
  ModerationController.reviewModerationResult
);

export const ModerationRoutes = router;
