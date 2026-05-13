import z from 'zod';
import { MODERATION_STATUS, MODERATION_TARGET_TYPE } from './moderation.interface.js';

const moderationStatusValues = Object.values(MODERATION_STATUS) as [string, ...string[]];
const moderationTargetTypeValues = Object.values(MODERATION_TARGET_TYPE) as [string, ...string[]];

export const moderationResultsQueryValidation = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    status: z.enum(moderationStatusValues).optional(),
    targetType: z.enum(moderationTargetTypeValues).optional(),
  }),
});

export const reviewModerationResultValidation = z.object({
  body: z.object({
    status: z.enum(moderationStatusValues),
    adminNote: z.string().trim().max(1000).optional(),
  }),
});
