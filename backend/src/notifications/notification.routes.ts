import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware.js";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "./notification.controller.js";

export const notificationRoutes = Router();

notificationRoutes.get("/", authenticate, getNotifications);
notificationRoutes.patch("/read-all", authenticate, markAllNotificationsAsRead);
notificationRoutes.patch("/:id/read", authenticate, markNotificationAsRead);
