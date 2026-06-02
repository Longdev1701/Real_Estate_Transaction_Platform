import type { RequestHandler } from "express";

import { sendSuccess } from "../utils/response.js";
import { createSystemLog } from "../utils/system-log.helper.js";
import {
  login,
  logout,
  refreshAuthToken,
  register,
} from "./auth.service.js";

export const registerController: RequestHandler = async (req, res, next) => {
  try {
    const result = await register(req.body);

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

    sendSuccess(res, result, "Register successful.", 201);
  } catch (error) {
    next(error);
  }
};

export const loginController: RequestHandler = async (req, res, next) => {
  try {
    const result = await login(req.body);

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

    sendSuccess(res, result, "Login successful.");
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
    next(error);
  }
};

export const refreshTokenController: RequestHandler = async (req, res, next) => {
  try {
    const result = await refreshAuthToken(req.body);

    sendSuccess(res, result, "Token refreshed successfully.");
  } catch (error) {
    next(error);
  }
};

export const logoutController: RequestHandler = async (req, res, next) => {
  try {
    const result = await logout(req.body);

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
    next(error);
  }
};
