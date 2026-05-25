import { z } from "zod";

export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters long."),
  fullName: z.string().min(2, "Full name must be at least 2 characters long."),
  phone: z.string().min(8).max(20).optional(),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1, "Password is required."),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required."),
});

export const logoutSchema = refreshTokenSchema;
