import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");

export const createUserValidationSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().toLowerCase(),
    password: z.string().min(6).max(100),
    phone: z.string().trim().min(5).max(20).optional(),
    role: objectId.optional(),
    roleName: z.string().trim().min(2).max(50).optional(),
    isBlocked: z.boolean().optional(),
  }),
});

export const updateUserValidationSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).max(80).optional(),
      phone: z.string().trim().min(5).max(20).optional(),
      isBlocked: z.boolean().optional(),
    })
    .refine((payload) => Object.keys(payload).length > 0, {
      message: "At least one field is required",
    }),
});

export const assignRoleValidationSchema = z.object({
  body: z.object({
    role: objectId,
  }),
});
