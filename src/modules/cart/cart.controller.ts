import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { CartService } from './cart.service.js';

const getAuthenticatedUserId = (req: Request): string => {
  if (!req.user) {
    throw new Error('Unauthorized: User not authenticated');
  }

  return req.user.userId;
};

const addToCart = catchAsync(async (req: Request, res: Response) => {
  const result = await CartService.addToCart(getAuthenticatedUserId(req), req.body);

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: 'Product added to cart successfully',
    data: result,
  });
});

const getUserCart = catchAsync(async (req: Request, res: Response) => {
  const result = await CartService.getUserCart(getAuthenticatedUserId(req));

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Cart fetched successfully',
    data: result,
  });
});

const updateCartItem = catchAsync(async (req: Request, res: Response) => {
  const result = await CartService.updateCartItem(getAuthenticatedUserId(req), req.body);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Cart updated successfully',
    data: result,
  });
});

const removeCartItem = catchAsync(async (req: Request, res: Response) => {
  const result = await CartService.removeCartItem(getAuthenticatedUserId(req), req.body.product);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Cart item removed successfully',
    data: result,
  });
});

const clearCart = catchAsync(async (req: Request, res: Response) => {
  await CartService.clearCart(getAuthenticatedUserId(req));

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Cart cleared successfully',
    data: null,
  });
});

export const CartController = {
  addToCart,
  getUserCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};
