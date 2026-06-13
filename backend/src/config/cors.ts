import cors from "cors";

import { CORS_ORIGINS } from "./env.js";

export const allowedOrigins = new Set(CORS_ORIGINS);

export const isAllowedOrigin = (origin?: string | null) =>
  typeof origin === "string" && allowedOrigins.has(origin);

export const corsMiddleware = cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  },
});
