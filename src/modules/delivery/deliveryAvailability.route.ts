import express from 'express';
import { PERMISSIONS, SYSTEM_ROLES } from '../../constants/permissions.js';
import { authMiddleware, requireRoles } from '../../middlewares/auth.middleware.js';
import { requirePermissions } from '../../middlewares/permission.middleware.js';
import { DeliveryAssignmentController } from './deliveryAssignment.controller.js';
import { DeliveryAvailabilityController } from './deliveryAvailability.controller.js';

const router = express.Router();

router.get(
  '/availability/me',
  authMiddleware,
  requireRoles(SYSTEM_ROLES.DELIVERY),
  requirePermissions(PERMISSIONS.DELIVERY_ACCESS),
  DeliveryAvailabilityController.getMyStatus
);

router.patch(
  '/availability/online',
  authMiddleware,
  requireRoles(SYSTEM_ROLES.DELIVERY),
  requirePermissions(PERMISSIONS.DELIVERY_ACCESS),
  DeliveryAvailabilityController.goOnline
);

router.patch(
  '/availability/offline',
  authMiddleware,
  requireRoles(SYSTEM_ROLES.DELIVERY),
  requirePermissions(PERMISSIONS.DELIVERY_ACCESS),
  DeliveryAvailabilityController.goOffline
);

router.get(
  '/availability/active',
  authMiddleware,
  requireRoles(SYSTEM_ROLES.SELLER, SYSTEM_ROLES.ADMIN),
  DeliveryAvailabilityController.getActiveDeliveryPartners
);

router.get(
  '/assignment-requests/me',
  authMiddleware,
  requireRoles(SYSTEM_ROLES.DELIVERY),
  requirePermissions(PERMISSIONS.DELIVERY_ACCESS),
  DeliveryAssignmentController.getMyPendingRequests
);

router.patch(
  '/assignment-requests/:requestId/accept',
  authMiddleware,
  requireRoles(SYSTEM_ROLES.DELIVERY),
  requirePermissions(PERMISSIONS.DELIVERY_ACCESS),
  DeliveryAssignmentController.acceptDeliveryAssignment
);

router.patch(
  '/assignment-requests/:requestId/reject',
  authMiddleware,
  requireRoles(SYSTEM_ROLES.DELIVERY),
  requirePermissions(PERMISSIONS.DELIVERY_ACCESS),
  DeliveryAssignmentController.rejectDeliveryAssignment
);

export const DeliveryAvailabilityRoutes = router;
