import mongoose, { Schema } from 'mongoose';
import { IProductView } from './productView.interface.js';

const productViewSchema = new Schema<IProductView>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    count: {
      type: Number,
      default: 1,
      min: 1,
    },
    lastViewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

productViewSchema.index({ user: 1, product: 1 }, { unique: true });
productViewSchema.index({ user: 1, lastViewedAt: -1 });

export const ProductView = mongoose.model<IProductView>('ProductView', productViewSchema);
