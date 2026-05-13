import mongoose, { Schema } from 'mongoose';
import { IShop } from './shop.interface.js';

const shopSchema = new Schema<IShop>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    shopName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    banner: {
      type: String,
    },
    bannerPublicId: {
      type: String,
    },
    profileImage: {
      type: String,
    },
    profileImagePublicId: {
      type: String,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    featuredProducts: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

shopSchema.index({ owner: 1 }, { unique: true });

export const Shop = mongoose.model<IShop>('Shop', shopSchema);
