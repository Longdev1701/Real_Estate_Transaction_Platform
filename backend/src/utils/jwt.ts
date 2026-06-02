import jwt from "jsonwebtoken";

import { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET } from "../config/env.js";

export type AuthTokenPayload = {
  sub: string;
  email: string;
  role: string;
};

export const signAccessToken = (
  payload: AuthTokenPayload,
  expiresIn: jwt.SignOptions["expiresIn"] = "15m",
) =>
  jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn,
  });

export const signRefreshToken = (
  payload: AuthTokenPayload,
  expiresIn: jwt.SignOptions["expiresIn"] = "7d",
) =>
  jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn,
  });

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, JWT_ACCESS_SECRET) as AuthTokenPayload;

export const verifyRefreshToken = (token: string) =>
  jwt.verify(token, JWT_REFRESH_SECRET) as AuthTokenPayload;
