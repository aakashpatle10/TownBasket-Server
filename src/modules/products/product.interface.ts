import { Types } from 'mongoose';

export const PRODUCT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  BLOCKED: 'blocked',
} as const;

export type ProductStatus = (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS];

export interface IProduct {
  shop: Types.ObjectId;
  title: string;
  description: string;
  image?: string;
  images: string[];
  price: number;
  discountPrice?: number;
  stock: number;
  category: string;
  averageRating: number;
  totalReviews: number;
  soldCount: number;
  deliveryTime: string;
  isActive: boolean;
  status: ProductStatus;
  sku: string;
}
