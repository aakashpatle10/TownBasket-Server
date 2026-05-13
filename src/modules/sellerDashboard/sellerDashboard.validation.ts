import z from 'zod';
import { ORDER_STATUS } from '../order/order.interface.js';

const orderStatusValues = Object.values(ORDER_STATUS) as [string, ...string[]];

export const sellerDashboardListQueryValidation = z.object({
  query: z.object({
    status: z.enum(orderStatusValues).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    search: z.string().trim().max(80).optional(),
  }),
});

export const sellerDashboardLimitQueryValidation = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(20).optional(),
  }),
});

export const sellerDashboardUpdateOrderStatusValidation = z.object({
  body: z.object({
    status: z.enum(orderStatusValues),
    deliveryPartner: z.string().min(1, 'Delivery partner id is required').optional(),
  }),
});
