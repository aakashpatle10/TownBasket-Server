import express from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import validateRequest from '../../middlewares/validateRequest.js';
import { NotificationController } from './notification.controller.js';
import { getNotificationsValidation, registerDeviceValidation } from './notification.validation.js';

const router = express.Router();

router.get('/', authMiddleware, validateRequest(getNotificationsValidation), NotificationController.getNotifications);
router.post('/register-device', authMiddleware, validateRequest(registerDeviceValidation), NotificationController.registerDevice);
router.patch('/:id/read', authMiddleware, NotificationController.markAsRead);

export const NotificationRoutes = router;
