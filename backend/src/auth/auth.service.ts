import type { User } from "@prisma/client";

import { UserRole, UserStatus } from "@prisma/client";

import { AppError } from "../middlewares/error.middleware.js";
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
import { sendResetPasswordEmail, sendRegisterVerificationEmail, isEmailConfigured } from "../services/email.service.js";

const memoryPendingRegistrations = new Map<string, { data: RegisterInput & { code: string }; expiresAt: number }>();



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

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type AuthResponse = {
  user: Pick<User, "id" | "email" | "fullName" | "phone" | "role" | "status" | "avatarUrl">;
  tokens: AuthTokens;
};

type PublicUser = Pick<
  User,
  "id" | "email" | "fullName" | "phone" | "address" | "bio" | "role" | "status" | "avatarUrl"
>;

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
    user: buildPublicUser(user),
    tokens: {
      accessToken,
      refreshToken,
    },
  };
};

export const register = async (input: RegisterInput) => {
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
      fullName: input.fullName,
      phone: input.phone || null,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    },
  });

  return buildAuthResponse(user);
};

export const confirmRegister = async (input: { email: string; code: string }): Promise<AuthResponse> => {
  const email = input.email.trim().toLowerCase();
  const code = input.code.trim();

  const key = `pending-register:${email}`;
  let pendingData: (RegisterInput & { code: string }) | null = null;

  if (redisClient?.isOpen) {
    const cached = await redisClient.get(key);
    if (cached) {
      pendingData = JSON.parse(cached);
    }
  } else {
    const cached = memoryPendingRegistrations.get(key);
    if (cached) {
      if (cached.expiresAt > Date.now()) {
        pendingData = cached.data;
      } else {
        memoryPendingRegistrations.delete(key);
      }
    }
  }

  if (!pendingData || pendingData.code !== code) {
    throw new AppError("Mã xác thực không hợp lệ hoặc đã hết hạn.", 400);
  }

  const passwordHash = await hashValue(pendingData.password);

  const user = await prisma.user.create({
    data: {
      email: pendingData.email,
      passwordHash,
      fullName: pendingData.fullName,
      phone: pendingData.phone || null,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    },
  });

  // Clean up
  if (redisClient?.isOpen) {
    await redisClient.del(key);
  } else {
    memoryPendingRegistrations.delete(key);
  }

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

  // Generate 6-digit verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const ttlSeconds = 600; // 10 minutes

  // Store key-value (key: reset-password:email, value: code)
  const key = `reset-password:${email}`;
  if (redisClient?.isOpen) {
    await redisClient.setEx(key, ttlSeconds, code);
  } else {
    memoryResetCodes.set(key, { code, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  // Send email via service
  await sendResetPasswordEmail(email, user.fullName, code);

  // Return development otp code if in development/testing context AND email is not configured
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

  // Retrieve code from Redis or Memory
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

  // Update password
  const passwordHash = await hashValue(input.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  // Delete stored code
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


