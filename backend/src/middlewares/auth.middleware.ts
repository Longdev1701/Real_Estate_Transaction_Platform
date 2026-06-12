import { UserStatus } from "@prisma/client";
import type { RequestHandler } from "express";

import { getCachedAuthUser } from "../auth/auth-user-cache.js";
import { recordAuthMetric } from "../auth/auth.observability.js";
import { revokeAllUserRefreshTokens } from "../auth/auth.service.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { AppError } from "./error.middleware.js";

const getBearerToken = (authorizationHeader?: string) => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const token = getBearerToken(req.headers.authorization);

    if (!token) {
      throw new AppError("Access token is required.", 401);
    }

    const payload = verifyAccessToken(token);
    const user = await getCachedAuthUser(payload.sub);

    if (!user) {
      throw new AppError("User not found.", 401);
    }

    if (user.status === UserStatus.BANNED) {
      await revokeAllUserRefreshTokens(user.id);
      recordAuthMetric("banned_access_attempt", {
        source: "http",
        userId: user.id,
      });
      throw new AppError("This account has been banned.", 403);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    next(new AppError("Invalid or expired access token.", 401));
  }
};
