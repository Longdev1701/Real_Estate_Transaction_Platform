import type { UserRole } from "@prisma/client";
import type { RequestHandler } from "express";

import { AppError } from "./error.middleware.js";

export const authorizeRoles =
  (...allowedRoles: UserRole[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) {
      next(new AppError("Authentication required.", 401));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(
        new AppError("You do not have permission to access this resource.", 403),
      );
      return;
    }

    next();
  };
