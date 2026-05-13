import express from 'express';
import validateRequest from '../../middlewares/validateRequest.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { ShopController } from './shop.controller.js';
import { createShopValidation } from './shop.vlidation.js';

const router = express.Router();

router.post(
  '/create',
  authMiddleware,
  validateRequest(createShopValidation),
  ShopController.createShop
);

router.get('/', ShopController.getAllShops);
router.get('/:id', ShopController.getSingleShop);

export const ShopRoutes = router;