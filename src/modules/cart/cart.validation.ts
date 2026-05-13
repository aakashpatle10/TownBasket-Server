import z from 'zod';

export const addToCartValidation = z.object({
  body: z.object({
    product: z.string().min(1, 'Product id is required'),
    quantity: z.number().int('Quantity must be an integer').positive('Quantity must be greater than 0').optional(),
  }),
});

export const updateCartItemValidation = z.object({
  body: z.object({
    product: z.string().min(1, 'Product id is required'),
    quantity: z.number().int('Quantity must be an integer').positive('Quantity must be greater than 0'),
  }),
});

export const removeCartItemValidation = z.object({
  body: z.object({
    product: z.string().min(1, 'Product id is required'),
  }),
});
