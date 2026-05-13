import express from 'express';
import { SYSTEM_ROLES } from '../../constants/permissions.js';
import { authMiddleware, requireRoles } from '../../middlewares/auth.middleware.js';
import validateRequest from '../../middlewares/validateRequest.js';
import { AdminDashboardController } from './adminDashboard.controller.js';
import {
  adminOrderStatsQueryValidation,
  createReportValidation,
  productModerationQueryValidation,
  reportListQueryValidation,
  socialModerationQueryValidation,
  updateProductModerationValidation,
  updateReportValidation,
  updateSocialModerationValidation,
} from './adminDashboard.validation.js';

const router = express.Router();

router.post(
  '/reports',
  authMiddleware,
  validateRequest(createReportValidation),
  AdminDashboardController.createReport
);

router.use(authMiddleware, requireRoles(SYSTEM_ROLES.ADMIN));

router.get('/overview', AdminDashboardController.getOverview);
router.get('/analytics/users', AdminDashboardController.getUserAnalytics);
router.get('/analytics/sellers', AdminDashboardController.getSellerAnalytics);
router.get('/statistics/revenue', AdminDashboardController.getRevenueStatistics);
router.get(
  '/statistics/orders',
  validateRequest(adminOrderStatsQueryValidation),
  AdminDashboardController.getOrderStatistics
);
router.get('/activity/realtime', AdminDashboardController.getRealtimePlatformActivityStats);

router.get(
  '/moderation/products',
  validateRequest(productModerationQueryValidation),
  AdminDashboardController.getProductModerationQueue
);
router.patch(
  '/moderation/products/:id',
  validateRequest(updateProductModerationValidation),
  AdminDashboardController.updateProductModeration
);
router.get(
  '/moderation/posts',
  validateRequest(socialModerationQueryValidation),
  AdminDashboardController.getPostModerationQueue
);
router.patch(
  '/moderation/:type/:id',
  validateRequest(updateSocialModerationValidation),
  AdminDashboardController.updatePostModeration
);

router.patch('/users/:id/block', AdminDashboardController.blockUser);
router.patch('/users/:id/unblock', AdminDashboardController.unblockUser);

router.get('/reports', validateRequest(reportListQueryValidation), AdminDashboardController.getReports);
router.get('/reports/:id', AdminDashboardController.getReportDetail);
router.patch('/reports/:id', validateRequest(updateReportValidation), AdminDashboardController.updateReport);

export const AdminDashboardRoutes = router;
