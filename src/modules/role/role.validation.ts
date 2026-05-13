import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");

export const createRoleValidationSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(50),
    permissions: z.array(objectId).default([]),
    isSystemRole: z.boolean().optional(),
  }),
});

export const updateRoleValidationSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).max(50).optional(),
      permissions: z.array(objectId).optional(),
      isSystemRole: z.boolean().optional(),
    })
    .refine((payload) => Object.keys(payload).length > 0, {
      message: "At least one field is required",
    }),
});
