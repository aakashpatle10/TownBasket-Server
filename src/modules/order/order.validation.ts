import z from 'zod';
import { DELIVERY_STATUS, ORDER_STATUS } from './order.interface.js';

const orderStatusValues = Object.values(ORDER_STATUS) as [string, ...string[]];
const deliveryStatusValues = Object.values(DELIVERY_STATUS) as [string, ...string[]];

export const placeOrderValidation = z.object({
  body: z.object({
    address: z.string().min(1, 'Address id is required'),
  }),
});

export const updateOrderStatusValidation = z.object({
  body: z.object({
    order: z.string().min(1, 'Order id is required'),
    status: z.enum(orderStatusValues),
    deliveryPartner: z.string().min(1, 'Delivery partner id is required').optional(),
  }),
});

export const updateDeliveryStatusValidation = z.object({
  body: z.object({
    status: z.enum(deliveryStatusValues),
  }),
});
