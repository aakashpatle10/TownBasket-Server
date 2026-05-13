import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { getRouteParam } from '../../utils/routeHelpers.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { ModerationStatus, ModerationTargetType } from './moderation.interface.js';
import { ModerationService } from './moderation.service.js';

const getAuthenticatedUserId = (req: Request): string => {
  if (!req.user) {
    throw new Error('Unauthorized: User not authenticated');
  }

  return req.user.userId;
};

const getStringQuery = (value: unknown): string | undefined => {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const getNumberQuery = (value: unknown): number | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const getModerationResults = catchAsync(async (req: Request, res: Response) => {
  const result = await ModerationService.getModerationResults({
    page: getNumberQuery(req.query.page),
    limit: getNumberQuery(req.query.limit),
    status: getStringQuery(req.query.status) as ModerationStatus | undefined,
    targetType: getStringQuery(req.query.targetType) as ModerationTargetType | undefined,
  });

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Moderation results fetched successfully',
    data: result,
  });
});

const reviewModerationResult = catchAsync(async (req: Request, res: Response) => {
  const result = await ModerationService.reviewModerationResult(
    getAuthenticatedUserId(req),
    getRouteParam(req, 'id'),
    req.body
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Moderation result reviewed successfully',
    data: result,
  });
});

export const ModerationController = {
  getModerationResults,
  reviewModerationResult,
};
