import z from 'zod';

export const createShopValidation = z.object({
  body: z.object({
    shopName: z
      .string()
      .min(1, 'Shop name is required'),

    description: z
      .string()
      .min(1, 'Description is required'),

    banner: z.string().optional(),
  }),
});