import express from 'express';
import { SYSTEM_ROLES } from '../../constants/permissions.js';
import { authMiddleware, requireRoles } from '../../middlewares/auth.middleware.js';
import validateRequest from '../../middlewares/validateRequest.js';
import { SellerDashboardController } from './sellerDashboard.controller.js';
import {
  sellerDashboardLimitQueryValidation,
  sellerDashboardListQueryValidation,
  sellerDashboardUpdateOrderStatusValidation,
} from './sellerDashboard.validation.js';

const router = express.Router();

router.use(authMiddleware, requireRoles(SYSTEM_ROLES.SELLER));

router.get('/overview', SellerDashboardController.getOverview);
router.get('/analytics', SellerDashboardController.getAnalytics);
router.get('/new-orders/count', SellerDashboardController.getNewOrderCount);
router.get(
  '/activity/recent',
  validateRequest(sellerDashboardLimitQueryValidation),
  SellerDashboardController.getRecentCustomerActivity
);
router.get(
  '/notifications/summary',
  validateRequest(sellerDashboardLimitQueryValidation),
  SellerDashboardController.getNotificationSummary
);
router.get(
  '/orders',
  validateRequest(sellerDashboardListQueryValidation),
  SellerDashboardController.getSellerOrders
);
router.get('/orders/:id', SellerDashboardController.getSellerOrderDetail);
router.patch(
  '/orders/:id/status',
  validateRequest(sellerDashboardUpdateOrderStatusValidation),
  SellerDashboardController.updateSellerOrderStatus
);

export const SellerDashboardRoutes = router;
