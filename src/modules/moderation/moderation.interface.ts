import { Types } from 'mongoose';

export const MODERATION_TARGET_TYPE = {
  PRODUCT: 'product',
  POST: 'post',
  CHAT_MESSAGE: 'chat_message',
} as const;

export const MODERATION_STATUS = {
  CLEAN: 'clean',
  FLAGGED: 'flagged',
  REVIEWED: 'reviewed',
  ERROR: 'error',
} as const;

export const MODERATION_CATEGORY = {
  ABUSE: 'abuse',
  SPAM: 'spam',
  SCAM: 'scam',
} as const;

export type ModerationTargetType =
  (typeof MODERATION_TARGET_TYPE)[keyof typeof MODERATION_TARGET_TYPE];
export type ModerationStatus = (typeof MODERATION_STATUS)[keyof typeof MODERATION_STATUS];
export type ModerationCategory = (typeof MODERATION_CATEGORY)[keyof typeof MODERATION_CATEGORY];

export interface IModerationResult {
  targetType: ModerationTargetType;
  target: Types.ObjectId;
  user?: Types.ObjectId;
  textSnapshot: string;
  status: ModerationStatus;
  categories: ModerationCategory[];
  riskScore: number;
  reasons: string[];
  provider: 'rules' | 'groq' | 'rules+groq';
  model?: string;
  raw?: Record<string, unknown>;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  adminNote?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
