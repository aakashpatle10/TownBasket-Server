import z from 'zod';

const chatbotHistoryMessageValidation = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(1000),
});

export const chatbotMessageValidation = z.object({
  body: z.object({
    message: z.string().trim().min(1).max(2000),
    history: z.array(chatbotHistoryMessageValidation).max(8).optional(),
    userRole: z.enum(['buyer', 'seller']).optional(),
    orderId: z.string().trim().min(1).max(80).optional(),
    contactEmail: z.string().trim().email().max(120).optional(),
    contactPhone: z.string().trim().min(5).max(30).optional(),
  }),
});
