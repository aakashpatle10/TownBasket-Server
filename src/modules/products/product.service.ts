import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError.js';
import { MODERATION_TARGET_TYPE } from '../moderation/moderation.interface.js';
import { ModerationService } from '../moderation/moderation.service.js';
import { IProduct, PRODUCT_STATUS } from './product.interface.js';
import { Product } from './product.model.js';

type ProductPayload = Partial<IProduct> & Pick<IProduct, 'shop' | 'title' | 'description' | 'price'>;

const normalizeProductImages = (payload: Partial<IProduct>): Partial<IProduct> => {
  if (payload.images?.length) {
    return {
      ...payload,
      image: payload.image ?? payload.images[0],
    };
  }

  if (payload.image) {
    return {
      ...payload,
      images: [payload.image],
    };
  }

  return payload;
};

const generateSku = (title: string): string => {
  const normalizedTitle = title
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24);

  return `${normalizedTitle || 'PRODUCT'}-${Date.now()}`;
};

export const getProductEffectivePrice = (product: Pick<IProduct, 'price' | 'discountPrice'>): number => {
  return product.discountPrice ?? product.price;
};

export const ensureProductIsOrderable = (product: IProduct): void => {
  if (product.stock <= 0) {
    throw new AppError(400, 'Product is out of stock');
  }

  if (!product.isActive || product.status !== PRODUCT_STATUS.PUBLISHED) {
    throw new AppError(400, 'Product is not available for ordering');
  }
};

const createProduct = async (payload: ProductPayload) => {
  const productPayload = normalizeProductImages({
    ...payload,
    sku: payload.sku ?? generateSku(payload.title),
  });

  const product = await Product.create(productPayload);

  await ModerationService.moderateContentSafely({
    targetType: MODERATION_TARGET_TYPE.PRODUCT,
    target: product._id,
    text: `${product.title}\n${product.description}`,
  });

  return product;
};

const getAllProducts = async () => {
  return await Product.find({ isActive: true, status: PRODUCT_STATUS.PUBLISHED }).populate('shop').sort({ createdAt: -1 });
};

const getSingleProduct = async (id: string) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, 'Invalid product id');
  }

  const product = await Product.findById(id).populate('shop');

  if (!product) {
    throw new AppError(404, 'Product not found');
  }

  return product;
};

const getShopProducts = async (shopId: string) => {
  if (!mongoose.isValidObjectId(shopId)) {
    throw new AppError(400, 'Invalid shop id');
  }

  return await Product.find({ shop: shopId }).sort({ createdAt: -1 });
};

const updateProduct = async (id: string, payload: Partial<IProduct>) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, 'Invalid product id');
  }

  const product = await Product.findByIdAndUpdate(id, normalizeProductImages(payload), {
    new: true,
    runValidators: true,
  }).populate('shop');

  if (!product) {
    throw new AppError(404, 'Product not found');
  }

  if (payload.title !== undefined || payload.description !== undefined) {
    await ModerationService.moderateContentSafely({
      targetType: MODERATION_TARGET_TYPE.PRODUCT,
      target: product._id,
      text: `${product.title}\n${product.description}`,
    });
  }

  return product;
};

export const ProductService = {
  createProduct,
  getAllProducts,
  getSingleProduct,
  getShopProducts,
  updateProduct,
};
