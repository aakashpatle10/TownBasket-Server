import mongoose, { Schema } from 'mongoose';
import { IFollow, IFollowStats } from './social.interface.js';

const followSchema = new Schema<IFollow>(
  {
    buyer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

followSchema.index({ buyer: 1, seller: 1 }, { unique: true });
followSchema.index({ seller: 1, createdAt: -1 });
followSchema.index({ buyer: 1, createdAt: -1 });

const followStatsSchema = new Schema<IFollowStats>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    followersCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    followingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const Follow = mongoose.model<IFollow>('Follow', followSchema);
export const FollowStats = mongoose.model<IFollowStats>('FollowStats', followStatsSchema);

