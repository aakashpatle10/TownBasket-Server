import mongoose, { Types } from 'mongoose';
import { AppError } from '../../utils/AppError.js';
import { Product } from '../products/product.model.js';
import { ensureProductIsOrderable, getProductEffectivePrice } from '../products/product.service.js';
import { Cart } from './cart.model.js';

type CartProductPayload = {
  product: string;
  quantity?: number;
};

const recalculateCart = (cart: Awaited<ReturnType<typeof Cart.findOne>>) => {
  if (!cart) {
    return;
  }

  cart.subtotal = cart.items.reduce((total, item) => total + item.priceAtAddition * item.quantity, 0);
  cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);
};

const getOrderableProduct = async (productId: string) => {
  if (!mongoose.isValidObjectId(productId)) {
    throw new AppError(400, 'Invalid product id');
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError(404, 'Product not found');
  }

  ensureProductIsOrderable(product);

  return product;
};

const addToCart = async (userId: string, payload: CartProductPayload) => {
  const quantity = payload.quantity ?? 1;
  const product = await getOrderableProduct(payload.product);

  let cart = await Cart.findOne({ user: userId });

  if (!cart) {
    cart = new Cart({
      user: userId,
      items: [],
      subtotal: 0,
      totalItems: 0,
    });
  }

  const productObjectId = new Types.ObjectId(payload.product);
  const existingItem = cart.items.find((item) => item.product.equals(productObjectId));
  const requestedQuantity = (existingItem?.quantity ?? 0) + quantity;

  if (product.stock < requestedQuantity) {
    throw new AppError(400, 'Requested quantity exceeds available stock');
  }

  if (existingItem) {
    existingItem.quantity = requestedQuantity;
    existingItem.priceAtAddition = getProductEffectivePrice(product);
  } else {
    cart.items.push({
      product: productObjectId,
      quantity,
      priceAtAddition: getProductEffectivePrice(product),
    });
  }

  recalculateCart(cart);
  await cart.save();

  return cart.populate({
    path: 'items.product',
    populate: {
      path: 'shop',
    },
  });
};

const getUserCart = async (userId: string) => {
  const cart = await Cart.findOne({ user: userId }).populate({
    path: 'items.product',
    populate: {
      path: 'shop',
    },
  });

  if (!cart) {
    return {
      user: userId,
      items: [],
      subtotal: 0,
      totalItems: 0,
    };
  }

  return cart;
};

const updateCartItem = async (userId: string, payload: Required<CartProductPayload>) => {
  const product = await getOrderableProduct(payload.product);

  if (product.stock < payload.quantity) {
    throw new AppError(400, 'Requested quantity exceeds available stock');
  }

  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw new AppError(404, 'Cart not found');
  }

  const productObjectId = new Types.ObjectId(payload.product);
  const existingItem = cart.items.find((item) => item.product.equals(productObjectId));

  if (!existingItem) {
    throw new AppError(404, 'Product not found in cart');
  }

  existingItem.quantity = payload.quantity;
  existingItem.priceAtAddition = getProductEffectivePrice(product);

  recalculateCart(cart);
  await cart.save();

  return cart.populate({
    path: 'items.product',
    populate: {
      path: 'shop',
    },
  });
};

const removeCartItem = async (userId: string, productId: string) => {
  if (!mongoose.isValidObjectId(productId)) {
    throw new AppError(400, 'Invalid product id');
  }

  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw new AppError(404, 'Cart not found');
  }

  const initialLength = cart.items.length;
  cart.items = cart.items.filter((item) => !item.product.equals(new Types.ObjectId(productId)));

  if (cart.items.length === initialLength) {
    throw new AppError(404, 'Product not found in cart');
  }

  recalculateCart(cart);
  await cart.save();

  return cart.populate({
    path: 'items.product',
    populate: {
      path: 'shop',
    },
  });
};

const clearCart = async (userId: string, session?: mongoose.ClientSession) => {
  return Cart.updateOne(
    { user: userId },
    {
      $set: {
        items: [],
        subtotal: 0,
        totalItems: 0,
      },
    },
    { session }
  );
};

export const CartService = {
  addToCart,
  getUserCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};
