import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");

export const registerValidationSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().toLowerCase(),
    password: z.string().min(6).max(100),
    phone: z.string().trim().min(5).max(20).optional(),
    roleName: z.enum(["admin", "seller", "buyer"]).optional(),
  }),
});

export const loginValidationSchema = z.object({
  body: z.object({
    email: z.string().trim().email().toLowerCase(),
    password: z.string().min(6).max(100),
  }),
});

export const refreshTokenValidationSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
});
