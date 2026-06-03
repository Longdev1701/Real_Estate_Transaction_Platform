import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import {
  getAdminDashboardController,
  getAdminPostsController,
  getAdminPostsStatsController,
  getAdminUserDetailController,
  getAdminUsersController,
  getAdminUsersStatsController,
  updateAdminUserController,
} from "./admin.controller.js";

export const adminRoutes = Router();

adminRoutes.get(
  "/dashboard",
  authenticate,
  authorizeRoles(UserRole.ADMIN),
  getAdminDashboardController,
);

adminRoutes.get(
  "/users",
  authenticate,
  authorizeRoles(UserRole.ADMIN),
  getAdminUsersController,
);

adminRoutes.get(
  "/users/stats",
  authenticate,
  authorizeRoles(UserRole.ADMIN),
  getAdminUsersStatsController,
);

adminRoutes.get(
  "/users/:id",
  authenticate,
  authorizeRoles(UserRole.ADMIN),
  getAdminUserDetailController,
);

adminRoutes.patch(
  "/users/:id",
  authenticate,
  authorizeRoles(UserRole.ADMIN),
  updateAdminUserController,
);

adminRoutes.get(
  "/posts",
  authenticate,
  authorizeRoles(UserRole.ADMIN),
  getAdminPostsController,
);

adminRoutes.get(
  "/posts/stats",
  authenticate,
  authorizeRoles(UserRole.ADMIN),
  getAdminPostsStatsController,
);
