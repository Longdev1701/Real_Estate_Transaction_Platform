import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import { UserRole } from "@prisma/client";
import {
  appealReport,
  createReport,
  getReports,
  reviewReportAppeal,
  resolveReport,
} from "./report.controller.js";

export const reportRoutes = Router();

// User routes
reportRoutes.post("/", authenticate, createReport);
reportRoutes.post("/:id/appeal", authenticate, appealReport);
reportRoutes.patch("/:id/appeal", authenticate, authorizeRoles(UserRole.ADMIN), reviewReportAppeal);

// Admin routes
reportRoutes.get("/", authenticate, authorizeRoles(UserRole.ADMIN), getReports);
reportRoutes.patch("/:id", authenticate, authorizeRoles(UserRole.ADMIN), resolveReport);
