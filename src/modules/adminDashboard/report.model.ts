import mongoose, { Schema } from 'mongoose';
import { IReport, REPORT_STATUS, REPORT_TARGET_TYPES } from './report.interface.js';

const reportSchema = new Schema<IReport>(
  {
    reporter: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    targetType: {
      type: String,
      enum: Object.values(REPORT_TARGET_TYPES),
      required: true,
    },
    target: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: Object.values(REPORT_STATUS),
      default: REPORT_STATUS.OPEN,
    },
    adminNote: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    handledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    handledAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, target: 1, status: 1 });
reportSchema.index({ reporter: 1, createdAt: -1 });

export const Report = mongoose.model<IReport>('Report', reportSchema);
