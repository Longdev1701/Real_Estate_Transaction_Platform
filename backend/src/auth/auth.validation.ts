import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email format."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
  fullName: z.string().min(2, "Full name must be at least 2 characters long."),
  phone: z.string().min(8).max(20).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format."),
  password: z.string().min(1, "Password is required."),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required."),
});

export const logoutSchema = refreshTokenSchema;

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters long."),
  email: z.string().email("Invalid email format."),
  phone: z.string().trim().min(8).max(20).or(z.literal("")).optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().min(8, "New password must be at least 8 characters long."),
    confirmPassword: z.string().min(1, "Password confirmation is required."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Password confirmation does not match.",
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format."),
});

export const resetPasswordSchema = z
  .object({
    email: z.string().email("Invalid email format."),
    code: z.string().length(6, "Verification code must be 6 digits."),
    newPassword: z.string().min(8, "New password must be at least 8 characters long."),
    confirmPassword: z.string().min(1, "Password confirmation is required."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Password confirmation does not match.",
  });

export const verifyResetCodeSchema = z.object({
  email: z.string().email("Invalid email format."),
  code: z.string().length(6, "Verification code must be 6 digits."),
});

export const confirmRegisterSchema = z.object({
  email: z.string().email("Invalid email format."),
  code: z.string().length(6, "Verification code must be 6 digits."),
});

