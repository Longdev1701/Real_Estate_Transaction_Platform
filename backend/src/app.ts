import express from "express";
import { UserRole } from "@prisma/client";

import { authRouter } from "./auth/auth.routes.js";
import { corsMiddleware } from "./config/cors.js";
import { homeRoutes } from "./home/home.routes.js";
import { authenticate } from "./middlewares/auth.middleware.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { authorizeRoles } from "./middlewares/role.middleware.js";
import { postRoutes } from "./posts/post.routes.js";
import { conversationRoutes } from "./conversations/conversation.routes.js";
import { savedPostRoutes } from "./saved-posts/saved-post.routes.js";
import { sendSuccess } from "./utils/response.js";

export const app = express();

app.use(corsMiddleware);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  sendSuccess(res, {
    service: "real-estate-transaction-backend",
    status: "ok",
  });
});

app.use("/api/auth", authRouter);
app.use("/api/home", homeRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/saved-posts", savedPostRoutes);
app.use("/api/conversations", conversationRoutes);
app.get("/api/admin/test", authenticate, authorizeRoles(UserRole.ADMIN), (req, res) => {
  sendSuccess(
    res,
    {
      user: req.user,
    },
    "Admin route accessed successfully.",
  );
});

app.use(errorMiddleware);
