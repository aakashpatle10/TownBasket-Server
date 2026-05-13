import express from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import validateRequest from '../../middlewares/validateRequest.js';
import { CartController } from './cart.controller.js';
import { addToCartValidation, removeCartItemValidation, updateCartItemValidation } from './cart.validation.js';

const router = express.Router();

router.post('/add', authMiddleware, validateRequest(addToCartValidation), CartController.addToCart);

router.get('/', authMiddleware, CartController.getUserCart);

router.put('/update', authMiddleware, validateRequest(updateCartItemValidation), CartController.updateCartItem);

router.delete('/remove', authMiddleware, validateRequest(removeCartItemValidation), CartController.removeCartItem);

router.delete('/clear/all', authMiddleware, CartController.clearCart);

export const CartRoutes = router;
