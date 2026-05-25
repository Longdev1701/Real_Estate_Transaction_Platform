import { Router } from "express";

import { validateRequest } from "../middlewares/validate.middleware.js";
import {
  loginController,
  logoutController,
  refreshTokenController,
  registerController,
} from "./auth.controller.js";
import {
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerSchema,
} from "./auth.validation.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  validateRequest({ body: registerSchema }),
  registerController,
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
