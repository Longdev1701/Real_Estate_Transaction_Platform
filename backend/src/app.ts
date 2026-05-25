import express from "express";

import { authRouter } from "./auth/auth.routes.js";
import { corsMiddleware } from "./config/cors.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
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

app.use(errorMiddleware);
