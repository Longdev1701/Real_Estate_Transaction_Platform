import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import { UserRole } from "@prisma/client";
import {
  createReport,
  getReports,
  resolveReport,
} from "./report.controller.js";

export const reportRoutes = Router();

// User routes
reportRoutes.post("/", authenticate, createReport);

// Admin routes
reportRoutes.get("/", authenticate, authorizeRoles(UserRole.ADMIN), getReports);
reportRoutes.patch("/:id", authenticate, authorizeRoles(UserRole.ADMIN), resolveReport);
