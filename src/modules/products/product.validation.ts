import z from 'zod';
import { PRODUCT_STATUS } from './product.interface.js';

const productStatusValues = Object.values(PRODUCT_STATUS) as [string, ...string[]];

export const createProductValidation = z.object({
  body: z.object({
    shop: z.string().min(1, 'Shop id is required'),

    title: z.string().min(1, 'Title is required'),

    description: z
      .string()
      .min(1, 'Description is required'),

    image: z.string().min(1, 'Image is required').optional(),

    images: z.array(z.string().min(1, 'Image is required')).min(1, 'At least one image is required').optional(),

    price: z.number({
      message: 'Price must be number',
    }).nonnegative('Price cannot be negative'),

    discountPrice: z.number().nonnegative('Discount price cannot be negative').optional(),

    stock: z.number().int('Stock must be an integer').nonnegative('Stock cannot be negative').optional(),

    category: z.string().min(1, 'Category is required').optional(),

    deliveryTime: z.string().min(1, 'Delivery time is required').optional(),

    isActive: z.boolean().optional(),

    status: z.enum(productStatusValues).optional(),

    sku: z.string().min(1, 'SKU is required').optional(),
  }).refine((data) => data.discountPrice === undefined || data.discountPrice <= data.price, {
    message: 'Discount price cannot be greater than price',
    path: ['discountPrice'],
  }).refine((data) => Boolean(data.image) || Boolean(data.images?.length), {
    message: 'At least one product image is required',
    path: ['images'],
  }),
});

export const updateProductValidation = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').optional(),
    description: z.string().min(1, 'Description is required').optional(),
    image: z.string().min(1, 'Image is required').optional(),
    images: z.array(z.string().min(1, 'Image is required')).min(1, 'At least one image is required').optional(),
    price: z.number().nonnegative('Price cannot be negative').optional(),
    discountPrice: z.number().nonnegative('Discount price cannot be negative').optional(),
    stock: z.number().int('Stock must be an integer').nonnegative('Stock cannot be negative').optional(),
    category: z.string().min(1, 'Category is required').optional(),
    deliveryTime: z.string().min(1, 'Delivery time is required').optional(),
    isActive: z.boolean().optional(),
    status: z.enum(productStatusValues).optional(),
    sku: z.string().min(1, 'SKU is required').optional(),
  }),
});

export const searchProductValidation = z.object({
  query: z.object({
    q: z.string().trim().min(1).max(100).optional(),
    query: z.string().trim().min(1).max(100).optional(),
    category: z.string().trim().min(1).max(80).optional(),
    shop: z.string().trim().min(1).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    inStock: z.enum(['true', 'false']).optional(),
    sortBy: z.enum(['relevance', 'newest', 'price_asc', 'price_desc', 'rating', 'popular']).optional(),
  }).refine((data) => Boolean(data.q || data.query || data.category || data.shop), {
    message: 'Search query, category, or shop is required',
    path: ['q'],
  }),
});
