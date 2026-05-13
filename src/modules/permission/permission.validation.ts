import { z } from "zod";

const permissionName = z.string().trim().min(2).max(80);

export const createPermissionValidationSchema = z.object({
  body: z.object({
    name: permissionName,
    description: z.string().trim().max(250).optional(),
  }),
});

export const updatePermissionValidationSchema = z.object({
  body: z
    .object({
      name: permissionName.optional(),
      description: z.string().trim().max(250).optional(),
    })
    .refine((payload) => Object.keys(payload).length > 0, {
      message: "At least one field is required",
    }),
});
