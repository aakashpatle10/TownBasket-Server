import { Types } from 'mongoose';

export const REPORT_TARGET_TYPES = {
  USER: 'user',
  PRODUCT: 'product',
  POST: 'post',
  CHAT_MESSAGE: 'chat_message',
  REEL: 'reel',
  ORDER: 'order',
} as const;

export const REPORT_STATUS = {
  OPEN: 'open',
  IN_REVIEW: 'in_review',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
} as const;

export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[keyof typeof REPORT_TARGET_TYPES];
export type ReportStatus = (typeof REPORT_STATUS)[keyof typeof REPORT_STATUS];

export interface IReport {
  reporter?: Types.ObjectId;
  targetType: ReportTargetType;
  target: Types.ObjectId;
  reason: string;
  description?: string;
  status: ReportStatus;
  adminNote?: string;
  handledBy?: Types.ObjectId;
  handledAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
