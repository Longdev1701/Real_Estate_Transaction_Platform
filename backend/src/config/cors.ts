import cors from "cors";

import { CLIENT_URL } from "./env.js";

export const allowedOrigins = new Set([
  CLIENT_URL,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3002",
]);

export const isAllowedOrigin = (origin?: string | null) =>
  !origin ||
  allowedOrigins.has(origin) ||
  origin.endsWith(".vercel.app") ||
  origin.startsWith("http://192.168.") ||
  origin.startsWith("http://10.");

export const corsMiddleware = cors({
  credentials: true,
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  },
});
