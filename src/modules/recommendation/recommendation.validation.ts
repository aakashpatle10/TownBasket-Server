import z from 'zod';

export const recommendationQueryValidation = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(50).optional(),
    categories: z.string().trim().max(300).optional(),
  }),
});
