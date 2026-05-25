import jwt from "jsonwebtoken";

import { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET } from "../config/env.js";

export type AuthTokenPayload = {
  sub: string;
  email: string;
  role: string;
};

export const signAccessToken = (payload: AuthTokenPayload) =>
  jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: "15m",
  });

export const signRefreshToken = (payload: AuthTokenPayload) =>
  jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });

export const verifyRefreshToken = (token: string) =>
  jwt.verify(token, JWT_REFRESH_SECRET) as AuthTokenPayload;
