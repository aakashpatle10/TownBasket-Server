import express from 'express';
import { SYSTEM_ROLES } from '../../constants/permissions.js';
import { authMiddleware, requireRoles } from '../../middlewares/auth.middleware.js';
import validateRequest from '../../middlewares/validateRequest.js';
import { DeliveryAssignmentController } from '../delivery/deliveryAssignment.controller.js';
import { OrderController } from './order.controller.js';
import { placeOrderValidation, updateDeliveryStatusValidation, updateOrderStatusValidation } from './order.validation.js';

const router = express.Router();

router.post('/place', authMiddleware, validateRequest(placeOrderValidation), OrderController.placeCodOrder);
router.get('/my-orders', authMiddleware, OrderController.getMyOrders);
router.get('/:id/chat', authMiddleware, OrderController.getOrderChat);
router.get('/:id/delivery-chat', authMiddleware, OrderController.getOrderDeliveryChat);
router.post(
  '/:id/delivery/request',
  authMiddleware,
  requireRoles(SYSTEM_ROLES.SELLER),
  DeliveryAssignmentController.requestDeliveryAssignment
);
router.patch(
  '/:id/delivery/status',
  authMiddleware,
  requireRoles(SYSTEM_ROLES.DELIVERY),
  validateRequest(updateDeliveryStatusValidation),
  OrderController.updateDeliveryStatus
);
router.get('/:id', authMiddleware, OrderController.getSingleOrder);
router.patch(
  '/status',
  authMiddleware,
  requireRoles(SYSTEM_ROLES.SELLER),
  validateRequest(updateOrderStatusValidation),
  OrderController.updateOrderStatus
);

export const OrderRoutes = router;
