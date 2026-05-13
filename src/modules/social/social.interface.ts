import { Types } from 'mongoose';

export type SocialMedia = {
  url: string;
  publicId?: string;
};

export const SOCIAL_MODERATION_STATUS = {
  APPROVED: 'approved',
  BLOCKED: 'blocked',
} as const;

export type SocialModerationStatus =
  (typeof SOCIAL_MODERATION_STATUS)[keyof typeof SOCIAL_MODERATION_STATUS];

export interface ISocialPost {
  seller: Types.ObjectId;
  shop: Types.ObjectId;
  caption: string;
  images: SocialMedia[];
  taggedProducts: Types.ObjectId[];
  hashtags: string[];
  moderationStatus: SocialModerationStatus;
  likesCount: number;
  commentsCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPostLike {
  post: Types.ObjectId;
  user: Types.ObjectId;
  createdAt?: Date;
}

export interface IPostComment {
  post: Types.ObjectId;
  user: Types.ObjectId;
  comment: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISocialReel {
  seller: Types.ObjectId;
  shop: Types.ObjectId;
  caption: string;
  video: SocialMedia;
  thumbnail?: SocialMedia;
  taggedProducts: Types.ObjectId[];
  hashtags: string[];
  moderationStatus: SocialModerationStatus;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IReelLike {
  reel: Types.ObjectId;
  user: Types.ObjectId;
  createdAt?: Date;
}

export interface IReelComment {
  reel: Types.ObjectId;
  user: Types.ObjectId;
  comment: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IFollow {
  buyer: Types.ObjectId;
  seller: Types.ObjectId;
  createdAt?: Date;
}

export interface IFollowStats {
  user: Types.ObjectId;
  followersCount: number;
  followingCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}
