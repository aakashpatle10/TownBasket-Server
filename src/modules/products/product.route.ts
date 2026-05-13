import express from 'express';
import {authMiddleware} from '../../middlewares/auth.middleware.js';
import validateRequest from '../../middlewares/validateRequest.js';
import { ProductController } from './product.controller.js';
import { createProductValidation, searchProductValidation, updateProductValidation } from './product.validation.js';

const router = express.Router();

router.post(
  '/create',
  authMiddleware,
  validateRequest(createProductValidation),
  ProductController.createProduct
);

router.get('/', ProductController.getAllProducts);
router.get('/search', validateRequest(searchProductValidation), ProductController.searchProducts);
router.get('/shop/:shopId', ProductController.getShopProducts);
router.get('/:id', ProductController.getSingleProduct);
router.patch(
  '/:id',
  authMiddleware,
  validateRequest(updateProductValidation),
  ProductController.updateProduct
);

export const ProductRoutes = router;
