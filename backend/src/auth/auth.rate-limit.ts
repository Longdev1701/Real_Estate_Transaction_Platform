import type { Request } from "express";

import { createRateLimit } from "../middlewares/rate-limit.middleware.js";

const normalizeEmail = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const withIpAndEmail = (prefix: string) => (req: Request) => {
  const email = normalizeEmail(req.body?.email);
  const ip = req.ip || "unknown";
  return email ? `${prefix}:${ip}:${email}` : `${prefix}:${ip}`;
};

export const registerRateLimit = createRateLimit({
  name: "auth-register",
  maxRequests: 5,
  windowMs: 60 * 60 * 1000,
  keyGenerator: withIpAndEmail("auth-register"),
});

export const loginRateLimit = createRateLimit({
  name: "auth-login",
  maxRequests: 10,
  windowMs: 15 * 60 * 1000,
  keyGenerator: withIpAndEmail("auth-login"),
});

export const refreshTokenRateLimit = createRateLimit({
  name: "auth-refresh",
  maxRequests: 30,
  windowMs: 60 * 1000,
});

export const forgotPasswordRateLimit = createRateLimit({
  name: "auth-forgot-password",
  maxRequests: 5,
  windowMs: 15 * 60 * 1000,
  keyGenerator: withIpAndEmail("auth-forgot-password"),
});

export const resetPasswordRateLimit = createRateLimit({
  name: "auth-reset-password",
  maxRequests: 10,
  windowMs: 15 * 60 * 1000,
  keyGenerator: withIpAndEmail("auth-reset-password"),
});

