import mongoose, { Types } from 'mongoose';
import { AppError } from '../../utils/AppError.js';
import { REPORT_STATUS, REPORT_TARGET_TYPES } from '../adminDashboard/report.interface.js';
import { Report } from '../adminDashboard/report.model.js';
import {
  MODERATION_STATUS,
  MODERATION_TARGET_TYPE,
  ModerationStatus,
  ModerationTargetType,
} from './moderation.interface.js';
import { ModerationResult } from './moderation.model.js';
import { classifyModerationText } from './moderation.ai.js';

type ModeratePayload = {
  targetType: ModerationTargetType;
  target: string | Types.ObjectId;
  text: string;
  user?: string | Types.ObjectId;
};

type GetResultsQuery = {
  status?: ModerationStatus;
  targetType?: ModerationTargetType;
  page?: number;
  limit?: number;
};

type ReviewPayload = {
  status: ModerationStatus;
  adminNote?: string;
};

const FLAG_THRESHOLD = 0.65;

const validateObjectId = (id: string | Types.ObjectId, entity: string) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, `Invalid ${entity} id`);
  }
};

const normalizePage = (page?: number): number => Math.max(page ?? 1, 1);

const normalizeLimit = (limit?: number): number => Math.min(Math.max(limit ?? 20, 1), 50);

const getReportTargetType = (targetType: ModerationTargetType) => {
  if (targetType === MODERATION_TARGET_TYPE.PRODUCT) {
    return REPORT_TARGET_TYPES.PRODUCT;
  }

  if (targetType === MODERATION_TARGET_TYPE.POST) {
    return REPORT_TARGET_TYPES.POST;
  }

  return REPORT_TARGET_TYPES.CHAT_MESSAGE;
};

const getFlagReason = (categories: string[], reasons: string[]) => {
  const categoriesText = categories.length > 0 ? categories.join(', ') : 'suspicious content';
  const reasonText = reasons[0] ? `: ${reasons[0]}` : '';

  return `AI moderation flagged ${categoriesText}${reasonText}`;
};

const createAdminReviewReport = async (
  payload: ModeratePayload,
  categories: string[],
  reasons: string[]
) => {
  const targetType = getReportTargetType(payload.targetType);

  const existingReport = await Report.findOne({
    targetType,
    target: payload.target,
    status: {
      $in: [REPORT_STATUS.OPEN, REPORT_STATUS.IN_REVIEW],
    },
    reason: /^AI moderation flagged/,
  }).select('_id').lean();

  if (existingReport) {
    return existingReport;
  }

  return Report.create({
    reporter: payload.user,
    targetType,
    target: payload.target,
    reason: getFlagReason(categories, reasons),
    description: 'Automatically flagged for admin review. No automatic user action was taken.',
    status: REPORT_STATUS.OPEN,
  });
};

const moderateContent = async (payload: ModeratePayload) => {
  validateObjectId(payload.target, 'target');

  if (payload.user) {
    validateObjectId(payload.user, 'user');
  }

  const textSnapshot = payload.text.trim().slice(0, 5000);
  if (!textSnapshot) {
    return ModerationResult.create({
      targetType: payload.targetType,
      target: payload.target,
      user: payload.user,
      textSnapshot: '',
      status: MODERATION_STATUS.CLEAN,
      categories: [],
      riskScore: 0,
      reasons: ['No text content to moderate'],
      provider: 'rules',
    });
  }

  const classification = await classifyModerationText(textSnapshot);
  const isFlagged = classification.riskScore >= FLAG_THRESHOLD || classification.categories.length > 0;
  const status = isFlagged ? MODERATION_STATUS.FLAGGED : MODERATION_STATUS.CLEAN;

  const result = await ModerationResult.create({
    targetType: payload.targetType,
    target: payload.target,
    user: payload.user,
    textSnapshot,
    status,
    categories: classification.categories,
    riskScore: classification.riskScore,
    reasons: classification.reasons,
    provider: classification.provider,
    model: classification.provider === 'rules' ? undefined : 'groq',
    raw: classification.raw,
  });

  if (isFlagged) {
    await createAdminReviewReport(payload, classification.categories, classification.reasons);
  }

  return result;
};

const moderateContentSafely = async (payload: ModeratePayload) => {
  try {
    return await moderateContent(payload);
  } catch (_error) {
    return ModerationResult.create({
      targetType: payload.targetType,
      target: payload.target,
      user: payload.user,
      textSnapshot: payload.text.slice(0, 5000),
      status: MODERATION_STATUS.ERROR,
      categories: [],
      riskScore: 0,
      reasons: ['Moderation scan failed'],
      provider: 'rules',
    });
  }
};

const getModerationResults = async (query: GetResultsQuery = {}) => {
  const page = normalizePage(query.page);
  const limit = normalizeLimit(query.limit);
  const filter: Record<string, unknown> = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.targetType) {
    filter.targetType = query.targetType;
  }

  const [total, results] = await Promise.all([
    ModerationResult.countDocuments(filter),
    ModerationResult.find(filter)
      .populate('user', 'name email phone')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
    },
    results,
  };
};

const reviewModerationResult = async (
  adminId: string,
  resultId: string,
  payload: ReviewPayload
) => {
  validateObjectId(resultId, 'moderation result');

  const result = await ModerationResult.findByIdAndUpdate(
    resultId,
    {
      status: payload.status,
      adminNote: payload.adminNote,
      reviewedBy: adminId,
      reviewedAt: new Date(),
    },
    {
      new: true,
      runValidators: true,
    }
  )
    .populate('user', 'name email phone')
    .populate('reviewedBy', 'name email');

  if (!result) {
    throw new AppError(404, 'Moderation result not found');
  }

  return result;
};

export const ModerationService = {
  moderateContent,
  moderateContentSafely,
  getModerationResults,
  reviewModerationResult,
};
