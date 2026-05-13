import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError.js';
import { MODERATION_TARGET_TYPE } from '../moderation/moderation.interface.js';
import { ModerationService } from '../moderation/moderation.service.js';
import { IProduct, PRODUCT_STATUS } from './product.interface.js';
import { Product } from './product.model.js';

type ProductPayload = Partial<IProduct> & Pick<IProduct, 'shop' | 'title' | 'description' | 'price'>;
type ProductSortBy = 'relevance' | 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'popular';

type ProductSearchQuery = {
  q?: string;
  query?: string;
  category?: string;
  shop?: string;
  page?: number;
  limit?: number;
  inStock?: boolean;
  sortBy?: ProductSortBy;
};

const normalizePage = (page?: number): number => Math.max(page ?? 1, 1);

const normalizeLimit = (limit?: number): number => Math.min(Math.max(limit ?? 20, 1), 50);

const getPagination = (query: ProductSearchQuery = {}) => {
  const page = normalizePage(query.page);
  const limit = normalizeLimit(query.limit);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const buildMeta = (page: number, limit: number, total: number) => {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
  };
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getSearchTerm = (query: ProductSearchQuery): string | undefined => {
  const value = query.q ?? query.query;
  const normalized = value?.trim();

  return normalized || undefined;
};

const getProductSearchSort = (sortBy: ProductSortBy = 'relevance'): Record<string, 1 | -1> => {
  const sortOptions: Record<ProductSortBy, Record<string, 1 | -1>> = {
    relevance: { soldCount: -1, averageRating: -1, createdAt: -1 },
    newest: { createdAt: -1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    rating: { averageRating: -1, totalReviews: -1 },
    popular: { soldCount: -1, totalReviews: -1 },
  };

  return sortOptions[sortBy];
};

const buildPublicProductFilter = (query: ProductSearchQuery): Record<string, unknown> => {
  const filter: Record<string, unknown> = {
    isActive: true,
    status: PRODUCT_STATUS.PUBLISHED,
  };
  const searchTerm = getSearchTerm(query);

  if (searchTerm) {
    const searchRegex = new RegExp(escapeRegex(searchTerm), 'i');
    filter.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { category: searchRegex },
      { sku: searchRegex },
    ];
  }

  if (query.category) {
    filter.category = new RegExp(`^${escapeRegex(query.category.trim())}$`, 'i');
  }

  if (query.shop) {
    if (!mongoose.isValidObjectId(query.shop)) {
      throw new AppError(400, 'Invalid shop id');
    }

    filter.shop = query.shop;
  }

  if (query.inStock) {
    filter.stock = { $gt: 0 };
  }

  return filter;
};

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

const searchProducts = async (query: ProductSearchQuery = {}) => {
  const { page, limit, skip } = getPagination(query);
  const filter = buildPublicProductFilter(query);
  const sort = getProductSearchSort(query.sortBy);

  const [total, products] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter)
      .populate('shop')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const categories = [...new Set(products.map((product) => product.category).filter(Boolean))];
  const excludedProductIds = products.map((product) => product._id);
  const relatedProducts = categories.length
    ? await Product.find({
        isActive: true,
        status: PRODUCT_STATUS.PUBLISHED,
        _id: { $nin: excludedProductIds },
        category: { $in: categories },
      })
        .populate('shop')
        .sort({ soldCount: -1, averageRating: -1, createdAt: -1 })
        .limit(Math.min(limit, 8))
        .lean()
    : [];

  return {
    data: products,
    relatedProducts,
    meta: buildMeta(page, limit, total),
  };
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
  searchProducts,
  getSingleProduct,
  getShopProducts,
  updateProduct,
};
