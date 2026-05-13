import mongoose, { Schema } from 'mongoose';
import {
  IModerationResult,
  MODERATION_CATEGORY,
  MODERATION_STATUS,
  MODERATION_TARGET_TYPE,
} from './moderation.interface.js';

const moderationResultSchema = new Schema<IModerationResult>(
  {
    targetType: {
      type: String,
      enum: Object.values(MODERATION_TARGET_TYPE),
      required: true,
    },
    target: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    textSnapshot: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    status: {
      type: String,
      enum: Object.values(MODERATION_STATUS),
      required: true,
    },
    categories: {
      type: [String],
      enum: Object.values(MODERATION_CATEGORY),
      default: [],
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 1,
      required: true,
    },
    reasons: {
      type: [String],
      default: [],
    },
    provider: {
      type: String,
      enum: ['rules', 'groq', 'rules+groq'],
      required: true,
    },
    model: {
      type: String,
      trim: true,
    },
    raw: {
      type: Schema.Types.Mixed,
      default: {},
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    adminNote: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

moderationResultSchema.index({ targetType: 1, target: 1, createdAt: -1 });
moderationResultSchema.index({ status: 1, riskScore: -1, createdAt: -1 });
moderationResultSchema.index({ user: 1, createdAt: -1 });

export const ModerationResult = mongoose.model<IModerationResult>(
  'ModerationResult',
  moderationResultSchema
);
