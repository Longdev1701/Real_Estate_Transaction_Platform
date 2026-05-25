import type { RequestHandler } from "express";

import { sendSuccess } from "../utils/response.js";
import {
  login,
  logout,
  refreshAuthToken,
  register,
} from "./auth.service.js";

export const registerController: RequestHandler = async (req, res, next) => {
  try {
    const result = await register(req.body);

    sendSuccess(res, result, "Register successful.", 201);
  } catch (error) {
    next(error);
  }
};

export const loginController: RequestHandler = async (req, res, next) => {
  try {
    const result = await login(req.body);

    sendSuccess(res, result, "Login successful.");
  } catch (error) {
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
    await logout(req.body);

    sendSuccess(res, null, "Logout successful.");
  } catch (error) {
    next(error);
  }
};
