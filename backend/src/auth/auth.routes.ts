import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware.js";
import { avatarImageUpload } from "../middlewares/upload.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";
import { sendSuccess } from "../utils/response.js";
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
  confirmRegisterController,
} from "./auth.controller.js";
import {
  changePasswordSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyResetCodeSchema,
  confirmRegisterSchema,
} from "./auth.validation.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  validateRequest({ body: registerSchema }),
  registerController,
);
authRouter.post(
  "/confirm-register",
  validateRequest({ body: confirmRegisterSchema }),
  confirmRegisterController,
);
authRouter.post("/login", validateRequest({ body: loginSchema }), loginController);
authRouter.post(
  "/refresh-token",
  validateRequest({ body: refreshTokenSchema }),
  refreshTokenController,
);
authRouter.post(
  "/logout",
  validateRequest({ body: logoutSchema }),
  logoutController,
);
authRouter.post(
  "/forgot-password",
  validateRequest({ body: forgotPasswordSchema }),
  forgotPasswordController,
);
authRouter.post(
  "/reset-password",
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
