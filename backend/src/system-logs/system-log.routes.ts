import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import { UserRole } from "@prisma/client";
import { getSystemLogs } from "./system-log.controller.js";

export const systemLogRoutes = Router();

systemLogRoutes.get("/", authenticate, authorizeRoles(UserRole.ADMIN), getSystemLogs);
