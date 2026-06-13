import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware.js";
import { avatarImageUpload } from "../middlewares/upload.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";
import { sendSuccess } from "../utils/response.js";
import {
  forgotPasswordRateLimit,
  loginRateLimit,
  refreshTokenRateLimit,
  registerRateLimit,
  resetPasswordRateLimit,
} from "./auth.rate-limit.js";
import {
  changePasswordController,
  loginController,
  logoutController,
  removeAvatarController,
  refreshTokenController,
  registerController,
  updateProfileController,
  updateAvatarController,
  forgotPasswordController,
  resetPasswordController,
  verifyResetCodeController,
} from "./auth.controller.js";
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyResetCodeSchema,
} from "./auth.validation.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  registerRateLimit,
  validateRequest({ body: registerSchema }),
  registerController,
);
authRouter.post("/login", loginRateLimit, validateRequest({ body: loginSchema }), loginController);
authRouter.post("/refresh-token", refreshTokenRateLimit, refreshTokenController);
authRouter.post("/logout", logoutController);
authRouter.post(
  "/forgot-password",
  forgotPasswordRateLimit,
  validateRequest({ body: forgotPasswordSchema }),
  forgotPasswordController,
);
authRouter.post(
  "/reset-password",
  resetPasswordRateLimit,
  validateRequest({ body: resetPasswordSchema }),
  resetPasswordController,
);
authRouter.post(
  "/verify-reset-code",
  validateRequest({ body: verifyResetCodeSchema }),
  verifyResetCodeController,
);
authRouter.get("/me", authenticate, (req, res) => {
  sendSuccess(res, req.user, "Current user fetched successfully.");
});
authRouter.patch(
  "/me",
  authenticate,
  validateRequest({ body: updateProfileSchema }),
  updateProfileController,
);
authRouter.patch(
  "/change-password",
  authenticate,
  validateRequest({ body: changePasswordSchema }),
  changePasswordController,
);
authRouter.put("/avatar", authenticate, avatarImageUpload, updateAvatarController);
authRouter.delete("/avatar", authenticate, removeAvatarController);
