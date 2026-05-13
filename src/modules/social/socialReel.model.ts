import mongoose, { Schema } from 'mongoose';
import { IReelComment, IReelLike, ISocialReel, SOCIAL_MODERATION_STATUS } from './social.interface.js';

const socialMediaSchema = new Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    publicId: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const socialReelSchema = new Schema<ISocialReel>(
  {
    seller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    shop: {
      type: Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },
    caption: {
      type: String,
      trim: true,
      default: '',
      maxlength: 2000,
    },
    video: {
      type: socialMediaSchema,
      required: true,
    },
    thumbnail: {
      type: socialMediaSchema,
    },
    taggedProducts: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
      default: [],
    },
    hashtags: {
      type: [String],
      default: [],
      lowercase: true,
      trim: true,
    },
    moderationStatus: {
      type: String,
      enum: Object.values(SOCIAL_MODERATION_STATUS),
      default: SOCIAL_MODERATION_STATUS.APPROVED,
    },
    viewsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    likesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    sharesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

socialReelSchema.index({ createdAt: -1 });
socialReelSchema.index({ seller: 1, createdAt: -1 });
socialReelSchema.index({ shop: 1, createdAt: -1 });
socialReelSchema.index({ hashtags: 1, createdAt: -1 });
socialReelSchema.index({ taggedProducts: 1, createdAt: -1 });
socialReelSchema.index({ viewsCount: -1, createdAt: -1 });
socialReelSchema.index({ moderationStatus: 1, createdAt: -1 });

const reelLikeSchema = new Schema<IReelLike>(
  {
    reel: {
      type: Schema.Types.ObjectId,
      ref: 'SocialReel',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

reelLikeSchema.index({ reel: 1, user: 1 }, { unique: true });
reelLikeSchema.index({ user: 1, createdAt: -1 });

const reelCommentSchema = new Schema<IReelComment>(
  {
    reel: {
      type: Schema.Types.ObjectId,
      ref: 'SocialReel',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

reelCommentSchema.index({ reel: 1, createdAt: -1 });
reelCommentSchema.index({ user: 1, createdAt: -1 });

export const SocialReel = mongoose.model<ISocialReel>('SocialReel', socialReelSchema);
export const ReelLike = mongoose.model<IReelLike>('ReelLike', reelLikeSchema);
export const ReelComment = mongoose.model<IReelComment>('ReelComment', reelCommentSchema);
