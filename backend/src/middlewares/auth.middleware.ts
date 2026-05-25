import { UserStatus } from "@prisma/client";
import type { RequestHandler } from "express";

import { prisma } from "../prisma/prisma.service.js";
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
    const user = await prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new AppError("User not found.", 401);
    }

    if (user.status === UserStatus.BANNED) {
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
