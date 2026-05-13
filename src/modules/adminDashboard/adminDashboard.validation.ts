import z from 'zod';
import { ORDER_STATUS } from '../order/order.interface.js';
import { PRODUCT_STATUS } from '../products/product.interface.js';
import { SOCIAL_MODERATION_STATUS } from '../social/social.interface.js';
import { REPORT_STATUS, REPORT_TARGET_TYPES } from './report.interface.js';

const orderStatusValues = Object.values(ORDER_STATUS) as [string, ...string[]];
const productStatusValues = Object.values(PRODUCT_STATUS) as [string, ...string[]];
const socialModerationStatusValues = Object.values(SOCIAL_MODERATION_STATUS) as [string, ...string[]];
const reportStatusValues = Object.values(REPORT_STATUS) as [string, ...string[]];
const reportTargetTypeValues = Object.values(REPORT_TARGET_TYPES) as [string, ...string[]];

export const adminListQueryValidation = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    search: z.string().trim().max(80).optional(),
  }),
});

export const adminOrderStatsQueryValidation = z.object({
  query: z.object({
    status: z.enum(orderStatusValues).optional(),
  }),
});

export const productModerationQueryValidation = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    status: z.enum(productStatusValues).optional(),
    search: z.string().trim().max(80).optional(),
  }),
});

export const updateProductModerationValidation = z.object({
  body: z.object({
    status: z.enum(productStatusValues).optional(),
    isActive: z.boolean().optional(),
  }).refine((body) => body.status !== undefined || body.isActive !== undefined, {
    message: 'Provide status or isActive',
  }),
});

export const socialModerationQueryValidation = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    status: z.enum(socialModerationStatusValues).optional(),
    type: z.enum(['post', 'reel']).optional(),
    search: z.string().trim().max(80).optional(),
  }),
});

export const updateSocialModerationValidation = z.object({
  body: z.object({
    status: z.enum(socialModerationStatusValues),
  }),
});

export const createReportValidation = z.object({
  body: z.object({
    targetType: z.enum(reportTargetTypeValues),
    target: z.string().min(1, 'Target id is required'),
    reason: z.string().trim().min(3).max(160),
    description: z.string().trim().max(1000).optional(),
  }),
});

export const reportListQueryValidation = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    status: z.enum(reportStatusValues).optional(),
    targetType: z.enum(reportTargetTypeValues).optional(),
  }),
});

export const updateReportValidation = z.object({
  body: z.object({
    status: z.enum(reportStatusValues),
    adminNote: z.string().trim().max(1000).optional(),
  }),
});
