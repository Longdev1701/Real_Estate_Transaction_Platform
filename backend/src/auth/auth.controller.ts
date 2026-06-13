import type { RequestHandler } from "express";

import { clearRefreshTokenCookie, getRefreshTokenFromCookie, setRefreshTokenCookie } from "./auth.cookie.js";
import { recordAuthMetric } from "./auth.observability.js";
import { AppError } from "../middlewares/error.middleware.js";
import { sendSuccess } from "../utils/response.js";
import { createSystemLog } from "../utils/system-log.helper.js";
import {
  changePassword,
  forgotPassword,
  login,
  logout,
  refreshAuthToken,
  register,
  removeAvatar,
  resetPassword,
  updateAvatar,
  updateProfile,
  verifyResetCode,
} from "./auth.service.js";

const toClientAuthResponse = (result: {
  user: {
    id: string;
    email: string;
    fullName: string;
    phone: string | null;
    role: string;
    status: string;
    avatarUrl: string | null;
    address?: string | null;
    bio?: string | null;
  };
  tokens: {
    accessToken: string;
  };
}) => ({
  user: result.user,
  tokens: result.tokens,
});

export const registerController: RequestHandler = async (req, res, next) => {
  try {
    const result = await register(req.body);
    setRefreshTokenCookie(res, result.refreshToken);

    await createSystemLog({
      module: "AUTH",
      actorId: result.user.id,
      action: "REGISTER",
      targetType: "User",
      targetId: result.user.id,
      description: `Tài khoản ${result.user.email} đã đăng ký thành công.`,
      severity: "INFO",
      status: "SUCCESS",
      request: req,
      metadata: {
        email: result.user.email,
        role: result.user.role,
      },
    });

    sendSuccess(res, toClientAuthResponse(result), "Register successful.", 201);
  } catch (error) {
    next(error);
  }
};

export const loginController: RequestHandler = async (req, res, next) => {
  try {
    const result = await login(req.body);
    setRefreshTokenCookie(res, result.refreshToken);

    await createSystemLog({
      module: "AUTH",
      actorId: result.user.id,
      action: "LOGIN",
      targetType: "User",
      targetId: result.user.id,
      description: `Tài khoản ${result.user.email} đã đăng nhập thành công.`,
      severity: "INFO",
      status: "SUCCESS",
      request: req,
      metadata: {
        email: result.user.email,
        role: result.user.role,
      },
    });

    recordAuthMetric("login_success", { userId: result.user.id });
    sendSuccess(res, toClientAuthResponse(result), "Login successful.");
  } catch (error) {
    await createSystemLog({
      module: "AUTH",
      action: "LOGIN_FAILED",
      targetType: "User",
      description: `Đăng nhập thất bại với tài khoản ${req.body?.email ?? "không xác định"}.`,
      severity: "SECURITY",
      status: "FAILED",
      request: req,
      metadata: {
        email: req.body?.email ?? null,
      },
    });
    recordAuthMetric("login_failed", { email: req.body?.email ?? null });
    next(error);
  }
};

export const refreshTokenController: RequestHandler = async (req, res, next) => {
  try {
    const refreshToken = getRefreshTokenFromCookie(req);

    if (!refreshToken) {
      throw new AppError("Refresh token is required.", 401);
    }

    const result = await refreshAuthToken({ refreshToken });
    setRefreshTokenCookie(res, result.refreshToken);

    recordAuthMetric("refresh_success", { userId: result.user.id });
    sendSuccess(res, toClientAuthResponse(result), "Token refreshed successfully.");
  } catch (error) {
    recordAuthMetric("refresh_failed");
    clearRefreshTokenCookie(res);
    next(error);
  }
};

export const logoutController: RequestHandler = async (req, res, next) => {
  try {
    const refreshToken = getRefreshTokenFromCookie(req);

    clearRefreshTokenCookie(res);

    if (!refreshToken) {
      sendSuccess(res, null, "Logout successful.");
      return;
    }

    const result = await logout({ refreshToken });

    await createSystemLog({
      module: "AUTH",
      actorId: result.userId,
      action: "LOGOUT",
      targetType: "User",
      targetId: result.userId,
      description: `Người dùng ${result.userId} đã đăng xuất khỏi hệ thống.`,
      severity: "INFO",
      status: "SUCCESS",
      request: req,
    });

    sendSuccess(res, null, "Logout successful.");
  } catch (error) {
    clearRefreshTokenCookie(res);
    next(error);
  }
};

export const updateAvatarController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required.", 401);
    }

    if (!req.file) {
      throw new AppError("Avatar image is required.", 400);
    }

    const user = await updateAvatar(req.user.id, req.file);

    await createSystemLog({
      module: "AUTH",
      actorId: user.id,
      action: "UPDATE_AVATAR",
      targetType: "User",
      targetId: user.id,
      description: `Người dùng ${user.email} đã cập nhật ảnh đại diện.`,
      severity: "INFO",
      status: "SUCCESS",
      request: req,
    });

    sendSuccess(res, user, "Avatar updated successfully.");
  } catch (error) {
    next(error);
  }
};

export const removeAvatarController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required.", 401);
    }

    const user = await removeAvatar(req.user.id);

    await createSystemLog({
      module: "AUTH",
      actorId: user.id,
      action: "REMOVE_AVATAR",
      targetType: "User",
      targetId: user.id,
      description: `Người dùng ${user.email} đã xóa ảnh đại diện.`,
      severity: "INFO",
      status: "SUCCESS",
      request: req,
    });

    sendSuccess(res, user, "Avatar removed successfully.");
  } catch (error) {
    next(error);
  }
};

export const updateProfileController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required.", 401);
    }

    const user = await updateProfile(req.user.id, req.body);

    await createSystemLog({
      module: "USER",
      actorId: user.id,
      action: "UPDATE_PROFILE",
      targetType: "User",
      targetId: user.id,
      description: `Người dùng ${user.email} đã cập nhật thông tin cá nhân.`,
      severity: "INFO",
      status: "SUCCESS",
      request: req,
    });

    sendSuccess(res, user, "Profile updated successfully.");
  } catch (error) {
    next(error);
  }
};

export const changePasswordController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required.", 401);
    }

    await changePassword(req.user.id, req.body);

    await createSystemLog({
      module: "USER",
      actorId: req.user.id,
      action: "CHANGE_PASSWORD",
      targetType: "User",
      targetId: req.user.id,
      description: `Người dùng ${req.user.email} đã thay đổi mật khẩu.`,
      severity: "SECURITY",
      status: "SUCCESS",
      request: req,
    });

    sendSuccess(res, null, "Password updated successfully.");
  } catch (error) {
    next(error);
  }
};

export const forgotPasswordController: RequestHandler = async (req, res, next) => {
  try {
    const result = await forgotPassword(req.body);

    await createSystemLog({
      module: "AUTH",
      action: "FORGOT_PASSWORD_REQUEST",
      targetType: "User",
      description: `Yêu cầu đặt lại mật khẩu cho tài khoản ${req.body?.email ?? "không xác định"}.`,
      severity: "INFO",
      status: "SUCCESS",
      request: req,
      metadata: {
        email: req.body?.email ?? null,
      },
    });

    recordAuthMetric("password_reset_request", {
      email: req.body?.email ?? null,
      source: "forgot-password",
    });
    sendSuccess(res, result, "Verification code sent successfully.");
  } catch (error) {
    await createSystemLog({
      module: "AUTH",
      action: "FORGOT_PASSWORD_FAILED",
      targetType: "User",
      description: `Yêu cầu đặt lại mật khẩu thất bại cho tài khoản ${req.body?.email ?? "không xác định"}.`,
      severity: "WARNING",
      status: "FAILED",
      request: req,
      metadata: {
        email: req.body?.email ?? null,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    next(error);
  }
};

export const resetPasswordController: RequestHandler = async (req, res, next) => {
  try {
    await resetPassword(req.body);

    await createSystemLog({
      module: "AUTH",
      action: "RESET_PASSWORD_SUCCESS",
      targetType: "User",
      description: `Tài khoản ${req.body?.email ?? "không xác định"} đã đặt lại mật khẩu thành công.`,
      severity: "SECURITY",
      status: "SUCCESS",
      request: req,
      metadata: {
        email: req.body?.email ?? null,
      },
    });

    sendSuccess(res, null, "Password reset successfully.");
  } catch (error) {
    await createSystemLog({
      module: "AUTH",
      action: "RESET_PASSWORD_FAILED",
      targetType: "User",
      description: `Đặt lại mật khẩu thất bại cho tài khoản ${req.body?.email ?? "không xác định"}.`,
      severity: "SECURITY",
      status: "FAILED",
      request: req,
      metadata: {
        email: req.body?.email ?? null,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    next(error);
  }
};

export const verifyResetCodeController: RequestHandler = async (req, res, next) => {
  try {
    await verifyResetCode(req.body);
    sendSuccess(res, null, "Verification code is valid.");
  } catch (error) {
    next(error);
  }
};
