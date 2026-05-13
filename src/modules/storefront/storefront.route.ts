import express from 'express';
import { SYSTEM_ROLES } from '../../constants/permissions.js';
import { authMiddleware, requireRoles } from '../../middlewares/auth.middleware.js';
import { upload } from '../../middlewares/upload.middleware.js';
import { StorefrontController } from './storefront.controller.js';

const router = express.Router();

router.patch(
  '/me',
  authMiddleware,
  requireRoles(SYSTEM_ROLES.SELLER),
  upload.fields([
    { name: 'banner', maxCount: 1 },
    { name: 'profileImage', maxCount: 1 },
  ]),
  StorefrontController.updateMyStorefront
);

router.get('/:sellerId', StorefrontController.getSellerProfile);
router.get('/:sellerId/products', StorefrontController.getSellerProducts);
router.get('/:sellerId/posts', StorefrontController.getSellerPosts);
router.get('/:sellerId/reels', StorefrontController.getSellerReels);

export const StorefrontRoutes = router;

