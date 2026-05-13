import mongoose, { HydratedDocument, Schema } from 'mongoose';
import { IProduct, PRODUCT_STATUS } from './product.interface.js';

const productSchema = new Schema<IProduct>(
  {
    shop: {
      type: Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
      type: String,
      trim: true,
    },

    images: {
      type: [String],
      default: [],
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    discountPrice: {
      type: Number,
      min: 0,
    },

    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    category: {
      type: String,
      required: true,
      trim: true,
      default: 'general',
    },

    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },

    soldCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    deliveryTime: {
      type: String,
      required: true,
      trim: true,
      default: 'Standard delivery',
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    status: {
      type: String,
      enum: Object.values(PRODUCT_STATUS),
      default: PRODUCT_STATUS.PUBLISHED,
    },

    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.pre('validate', function (this: HydratedDocument<IProduct>) {
  if (this.image && this.images.length === 0) {
    this.images = [this.image];
  }
});

productSchema.index({ shop: 1 });
productSchema.index({ category: 1 });
productSchema.index({ status: 1 });

export const Product = mongoose.model<IProduct>(
  'Product',
  productSchema
);
