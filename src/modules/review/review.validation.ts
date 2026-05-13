import z from 'zod';

export const createReviewValidation = z.object({
  body: z.object({
    order: z.string().min(1, 'Order id is required'),
    rating: z.number().int('Rating must be an integer').min(1).max(5),
    comment: z.string().optional(),
    images: z.array(z.string().min(1, 'Image is required')).optional(),
  }),
});

export const updateReviewValidation = z.object({
  body: z.object({
    rating: z.number().int('Rating must be an integer').min(1).max(5).optional(),
    comment: z.string().optional(),
    images: z.array(z.string().min(1, 'Image is required')).optional(),
  }),
});
