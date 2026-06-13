import type { User } from "@prisma/client";

import { UserRole, UserStatus } from "@prisma/client";

import { AppError } from "../middlewares/error.middleware.js";
import { invalidateCachedAuthUser } from "./auth-user-cache.js";
import { prisma } from "../prisma/prisma.service.js";
import {
  deleteImageByUrl,
  isManagedImageUrl,
  uploadAvatarImage,
} from "../services/upload.service.js";
import { compareValue, hashValue } from "../utils/hash.js";
import { sha256 } from "../utils/sha256.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import { redisClient } from "../config/redis.js";
import { isEmailConfigured, sendResetPasswordEmail } from "../services/email.service.js";

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

type UpdateProfileInput = {
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  bio?: string;
};

type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

type PublicUser = Pick<
  User,
  "id" | "email" | "fullName" | "phone" | "address" | "bio" | "role" | "status" | "avatarUrl"
>;

type AuthTokens = {
  accessToken: string;
};

type AuthResponse = {
  user: PublicUser;
  tokens: AuthTokens;
};

type AuthSession = AuthResponse & {
  refreshToken: string;
};

const buildPublicUser = (user: User): PublicUser => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  phone: user.phone,
  address: user.address,
  bio: user.bio,
  role: user.role,
  status: user.status,
  avatarUrl: user.avatarUrl,
});

const buildUserPayload = (user: User) => ({
  sub: user.id,
  email: user.email,
  role: user.role,
});

const getRefreshTokenExpiry = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

export const revokeAllUserRefreshTokens = async (userId: string) => {
  await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
};

const persistRefreshToken = async (userId: string, refreshToken: string) => {
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: sha256(refreshToken),
      expiresAt: getRefreshTokenExpiry(),
    },
  });
};

const buildAuthResponse = async (user: User): Promise<AuthSession> => {
  const payload = buildUserPayload(user);
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await persistRefreshToken(user.id, refreshToken);

  return {
    user: buildPublicUser(user),
    tokens: {
      accessToken,
    },
    refreshToken,
  };
};

export const register = async (input: RegisterInput): Promise<AuthSession> => {
  const email = input.email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    throw new AppError("Email đã được sử dụng.", 409);
  }

  const passwordHash = await hashValue(input.password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: input.fullName.trim(),
      phone: input.phone?.trim() || null,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    },
  });

  return buildAuthResponse(user);
};

export const login = async (input: LoginInput): Promise<AuthSession> => {
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: {
      email,
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
}: RefreshTokenInput): Promise<AuthSession> => {
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

  if (user.status === UserStatus.BANNED) {
    await revokeAllUserRefreshTokens(user.id);
    throw new AppError("This account has been banned.", 403);
  }

  const tokenHash = sha256(refreshToken);
  const matchedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  if (!matchedToken || matchedToken.userId !== user.id) {
    throw new AppError("Refresh token not recognized.", 401);
  }

  if (matchedToken.revokedAt !== null) {
    await revokeAllUserRefreshTokens(user.id);
    throw new AppError("Refresh token reuse detected. Please log in again.", 401);
  }

  if (matchedToken.expiresAt <= new Date()) {
    throw new AppError("Refresh token not recognized.", 401);
  }

  const nextAccessToken = signAccessToken(buildUserPayload(user));
  const nextRefreshToken = signRefreshToken(buildUserPayload(user));
  const nextRefreshTokenHash = sha256(nextRefreshToken);

  await prisma.$transaction(async (tx) => {
    const revokedToken = await tx.refreshToken.updateMany({
      where: {
        id: matchedToken.id,
        tokenHash,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      data: {
        revokedAt: new Date(),
      },
    });

    if (revokedToken.count !== 1) {
      await tx.refreshToken.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
      throw new AppError("Refresh token reuse detected. Please log in again.", 401);
    }

    await tx.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: nextRefreshTokenHash,
        expiresAt: getRefreshTokenExpiry(),
      },
    });
  });

  return {
    user: buildPublicUser(user),
    tokens: {
      accessToken: nextAccessToken,
    },
    refreshToken: nextRefreshToken,
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

  return {
    userId: matchedToken.userId,
  };
};

export const updateAvatar = async (userId: string, file: Express.Multer.File) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  const avatarUrl = await uploadAvatarImage(userId, file);

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
  });

  if (user.avatarUrl && isManagedImageUrl(user.avatarUrl)) {
    await deleteImageByUrl(user.avatarUrl).catch(() => null);
  }

  await invalidateCachedAuthUser(userId);
  return buildPublicUser(updatedUser);
};

export const removeAvatar = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: null },
  });

  if (user.avatarUrl && isManagedImageUrl(user.avatarUrl)) {
    await deleteImageByUrl(user.avatarUrl).catch(() => null);
  }

  await invalidateCachedAuthUser(userId);
  return buildPublicUser(updatedUser);
};

export const updateProfile = async (userId: string, input: UpdateProfileInput) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  const normalizedPhone = input.phone?.trim() ? input.phone.trim() : null;

  if (normalizedEmail !== user.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new AppError("Email is already in use.", 409);
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: input.fullName.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      address: input.address?.trim() || null,
      bio: input.bio?.trim() || null,
    },
  });

  await invalidateCachedAuthUser(userId);
  return buildPublicUser(updatedUser);
};

export const changePassword = async (userId: string, input: ChangePasswordInput) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  const isPasswordValid = await compareValue(input.currentPassword, user.passwordHash);

  if (!isPasswordValid) {
    throw new AppError("Current password is incorrect.", 400);
  }

  const isSamePassword = await compareValue(input.newPassword, user.passwordHash);

  if (isSamePassword) {
    throw new AppError("New password must be different from the current password.", 400);
  }

  const passwordHash = await hashValue(input.newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  await revokeAllUserRefreshTokens(userId);
  await invalidateCachedAuthUser(userId);
};

const memoryResetCodes = new Map<string, { code: string; expiresAt: number }>();

export const forgotPassword = async (input: { email: string }) => {
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError("Không tìm thấy người dùng với email này.", 404);
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const ttlSeconds = 600;

  const key = `reset-password:${email}`;
  if (redisClient?.isOpen) {
    await redisClient.setEx(key, ttlSeconds, code);
  } else {
    memoryResetCodes.set(key, { code, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  await sendResetPasswordEmail(email, user.fullName, code);

  return {
    message: "Mã xác thực đã được gửi tới email của bạn.",
    ...(!isEmailConfigured && process.env.NODE_ENV !== "production" ? { devOtpCode: code } : {}),
  };
};

export const resetPassword = async (input: {
  email: string;
  code: string;
  newPassword: string;
}) => {
  const email = input.email.trim().toLowerCase();
  const code = input.code.trim();

  const key = `reset-password:${email}`;
  let storedCode: string | null = null;

  if (redisClient?.isOpen) {
    storedCode = await redisClient.get(key);
  } else {
    const data = memoryResetCodes.get(key);
    if (data) {
      if (data.expiresAt > Date.now()) {
        storedCode = data.code;
      } else {
        memoryResetCodes.delete(key);
      }
    }
  }

  if (!storedCode || storedCode !== code) {
    throw new AppError("Mã xác thực không hợp lệ hoặc đã hết hạn.", 400);
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError("Không tìm thấy người dùng.", 404);
  }

  const passwordHash = await hashValue(input.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  await revokeAllUserRefreshTokens(user.id);
  await invalidateCachedAuthUser(user.id);

  if (redisClient?.isOpen) {
    await redisClient.del(key);
  } else {
    memoryResetCodes.delete(key);
  }
};

export const verifyResetCode = async (input: { email: string; code: string }) => {
  const email = input.email.trim().toLowerCase();
  const code = input.code.trim();

  const key = `reset-password:${email}`;
  let storedCode: string | null = null;

  if (redisClient?.isOpen) {
    storedCode = await redisClient.get(key);
  } else {
    const data = memoryResetCodes.get(key);
    if (data && data.expiresAt > Date.now()) {
      storedCode = data.code;
    }
  }

  if (!storedCode || storedCode !== code) {
    throw new AppError("Mã xác thực không hợp lệ hoặc đã hết hạn.", 400);
  }

  return true;
};
