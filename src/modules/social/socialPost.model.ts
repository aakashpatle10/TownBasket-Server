import mongoose, { Schema } from 'mongoose';
import { IPostComment, IPostLike, ISocialPost, SOCIAL_MODERATION_STATUS } from './social.interface.js';

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

const socialPostSchema = new Schema<ISocialPost>(
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
    images: {
      type: [socialMediaSchema],
      default: [],
      validate: {
        validator(value: ISocialPost['images']) {
          return value.length > 0;
        },
        message: 'At least one image is required',
      },
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
  },
  {
    timestamps: true,
  }
);

socialPostSchema.index({ createdAt: -1 });
socialPostSchema.index({ seller: 1, createdAt: -1 });
socialPostSchema.index({ shop: 1, createdAt: -1 });
socialPostSchema.index({ hashtags: 1, createdAt: -1 });
socialPostSchema.index({ taggedProducts: 1, createdAt: -1 });
socialPostSchema.index({ moderationStatus: 1, createdAt: -1 });

const postLikeSchema = new Schema<IPostLike>(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: 'SocialPost',
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

postLikeSchema.index({ post: 1, user: 1 }, { unique: true });
postLikeSchema.index({ user: 1, createdAt: -1 });

const postCommentSchema = new Schema<IPostComment>(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: 'SocialPost',
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

postCommentSchema.index({ post: 1, createdAt: -1 });
postCommentSchema.index({ user: 1, createdAt: -1 });

export const SocialPost = mongoose.model<ISocialPost>('SocialPost', socialPostSchema);
export const PostLike = mongoose.model<IPostLike>('PostLike', postLikeSchema);
export const PostComment = mongoose.model<IPostComment>('PostComment', postCommentSchema);
