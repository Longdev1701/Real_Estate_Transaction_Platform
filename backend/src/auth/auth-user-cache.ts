import type { AuthenticatedUser } from "../types/auth.type.js";

import { prisma } from "../prisma/prisma.service.js";
import { redisClient } from "../config/redis.js";

const AUTH_USER_CACHE_TTL_SECONDS = 30;
const authUserCache = new Map<string, { user: AuthenticatedUser; expiresAt: number }>();

const getCacheKey = (userId: string) => `auth:user:${userId}`;

const normalizeCachedUser = (value: unknown): AuthenticatedUser | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const user = value as AuthenticatedUser;
  return user.id && user.email ? user : null;
};

export const invalidateCachedAuthUser = async (userId: string) => {
  authUserCache.delete(getCacheKey(userId));

  if (redisClient?.isOpen) {
    await redisClient.del(getCacheKey(userId));
  }
};

export const getCachedAuthUser = async (userId: string) => {
  const key = getCacheKey(userId);

  if (redisClient?.isOpen) {
    const cachedValue = await redisClient.get(key);
    const cachedUser = cachedValue ? normalizeCachedUser(JSON.parse(cachedValue)) : null;
    if (cachedUser) {
      return cachedUser;
    }
  } else {
    const cachedEntry = authUserCache.get(key);
    if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
      return cachedEntry.user;
    }

    authUserCache.delete(key);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      role: true,
      status: true,
      avatarUrl: true,
    },
  });

  if (!user) {
    return null;
  }

  if (redisClient?.isOpen) {
    await redisClient.setEx(key, AUTH_USER_CACHE_TTL_SECONDS, JSON.stringify(user));
  } else {
    authUserCache.set(key, {
      user,
      expiresAt: Date.now() + AUTH_USER_CACHE_TTL_SECONDS * 1000,
    });
  }

  return user;
};

