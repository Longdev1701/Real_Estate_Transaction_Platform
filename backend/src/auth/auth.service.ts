import type { User } from "@prisma/client";

import { UserRole, UserStatus } from "@prisma/client";

import { AppError } from "../middlewares/error.middleware.js";
import { prisma } from "../prisma/prisma.service.js";
import { compareValue, hashValue } from "../utils/hash.js";
import { sha256 } from "../utils/sha256.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";

type RegisterInput = {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type RefreshTokenInput = {
  refreshToken: string;
};

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type AuthResponse = {
  user: Pick<User, "id" | "email" | "fullName" | "phone" | "role" | "status">;
  tokens: AuthTokens;
};

const buildUserPayload = (user: User) => ({
  sub: user.id,
  email: user.email,
  role: user.role,
});

const buildAuthResponse = async (user: User): Promise<AuthResponse> => {
  const payload = buildUserPayload(user);
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  const refreshTokenHash = sha256(refreshToken);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      status: user.status,
    },
    tokens: {
      accessToken,
      refreshToken,
    },
  };
};

export const register = async (input: RegisterInput): Promise<AuthResponse> => {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (existingUser) {
    throw new AppError("Email is already in use.", 409);
  }

  const passwordHash = await hashValue(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      phone: input.phone,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    },
  });

  return buildAuthResponse(user);
};

export const login = async (input: LoginInput): Promise<AuthResponse> => {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (!user) {
    throw new AppError("Invalid email or password.", 401);
  }

  const isPasswordValid = await compareValue(input.password, user.passwordHash);

  if (!isPasswordValid) {
    throw new AppError("Invalid email or password.", 401);
  }

  if (user.status === UserStatus.BANNED) {
    throw new AppError("This account has been banned.", 403);
  }

  return buildAuthResponse(user);
};

export const refreshAuthToken = async ({
  refreshToken,
}: RefreshTokenInput): Promise<AuthTokens> => {
  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError("Invalid refresh token.", 401);
  }

  const user = await prisma.user.findUnique({
    where: {
      id: payload.sub,
    },
  });

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  const tokenHash = sha256(refreshToken);
  const matchedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  if (
    !matchedToken ||
    matchedToken.userId !== user.id ||
    matchedToken.revokedAt !== null ||
    matchedToken.expiresAt <= new Date()
  ) {
    throw new AppError("Refresh token not recognized.", 401);
  }

  const newAccessToken = signAccessToken(buildUserPayload(user));
  const newRefreshToken = signRefreshToken(buildUserPayload(user));
  const newRefreshTokenHash = sha256(newRefreshToken);

  await prisma.refreshToken.update({
    where: {
      id: matchedToken.id,
    },
    data: {
      tokenHash: newRefreshTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revokedAt: null,
    },
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

export const logout = async ({ refreshToken }: RefreshTokenInput) => {
  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError("Invalid refresh token.", 401);
  }

  const tokenHash = sha256(refreshToken);
  const matchedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  if (!matchedToken || matchedToken.userId !== payload.sub) {
    throw new AppError("Refresh token not recognized.", 401);
  }

  await prisma.refreshToken.update({
    where: {
      id: matchedToken.id,
    },
    data: {
      revokedAt: new Date(),
    },
  });
};
