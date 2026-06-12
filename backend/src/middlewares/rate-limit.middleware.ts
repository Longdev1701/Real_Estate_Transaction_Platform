import type { Request, RequestHandler } from "express";

import { redisClient } from "../config/redis.js";
import { sendError } from "../utils/response.js";

type RateLimitOptions = {
  keyGenerator?: (req: Request) => string;
  maxRequests: number;
  windowMs: number;
  name: string;
};

const memoryRateLimitStore = new Map<string, { count: number; expiresAt: number }>();

const getClientIp = (req: Request) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (Array.isArray(forwardedFor)) {
    return forwardedFor[0] ?? req.ip ?? "unknown";
  }

  if (typeof forwardedFor === "string") {
    return forwardedFor.split(",")[0]?.trim() || req.ip || "unknown";
  }

  return req.ip || "unknown";
};

const defaultKeyGenerator = (name: string) => (req: Request) => `${name}:${getClientIp(req)}`;

const hitRedisRateLimit = async (key: string, windowMs: number) => {
  const currentCount = await redisClient!.incr(key);

  if (currentCount === 1) {
    await redisClient!.pExpire(key, windowMs);
  }

  const ttlMs = await redisClient!.pTTL(key);
  return {
    count: currentCount,
    retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1000)),
  };
};

const hitMemoryRateLimit = (key: string, windowMs: number) => {
  const currentTime = Date.now();
  const currentEntry = memoryRateLimitStore.get(key);

  if (!currentEntry || currentEntry.expiresAt <= currentTime) {
    memoryRateLimitStore.set(key, {
      count: 1,
      expiresAt: currentTime + windowMs,
    });

    return {
      count: 1,
      retryAfterSeconds: Math.max(1, Math.ceil(windowMs / 1000)),
    };
  }

  currentEntry.count += 1;
  memoryRateLimitStore.set(key, currentEntry);

  return {
    count: currentEntry.count,
    retryAfterSeconds: Math.max(1, Math.ceil((currentEntry.expiresAt - currentTime) / 1000)),
  };
};

export const createRateLimit = ({
  name,
  maxRequests,
  windowMs,
  keyGenerator,
}: RateLimitOptions): RequestHandler => {
  const resolveKey = keyGenerator ?? defaultKeyGenerator(name);

  return async (req, res, next) => {
    try {
      const key = `rate-limit:${resolveKey(req)}`;
      const result = redisClient?.isOpen
        ? await hitRedisRateLimit(key, windowMs)
        : hitMemoryRateLimit(key, windowMs);

      if (result.count <= maxRequests) {
        next();
        return;
      }

      res.setHeader("Retry-After", String(result.retryAfterSeconds));
      sendError(
        res,
        "Too many requests. Please try again later.",
        429,
        { retryAfterSeconds: result.retryAfterSeconds },
      );
    } catch (error) {
      next(error);
    }
  };
};

