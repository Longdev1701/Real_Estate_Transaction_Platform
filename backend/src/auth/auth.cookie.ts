import type { CookieOptions, Request, Response } from "express";

import {
  COOKIE_DOMAIN,
  COOKIE_SAME_SITE,
  IS_PRODUCTION,
  REFRESH_TOKEN_COOKIE_NAME,
} from "../config/env.js";

const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const REFRESH_TOKEN_COOKIE_PATH = "/api/auth";

const refreshTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: IS_PRODUCTION ? "none" : "lax",
  path: REFRESH_TOKEN_COOKIE_PATH,
  maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
};

export const getRefreshTokenCookieOptions = (): CookieOptions => ({
  ...refreshTokenCookieOptions,
});

export const setRefreshTokenCookie = (res: Response, refreshToken: string) => {
  res.cookie(
    REFRESH_TOKEN_COOKIE_NAME,
    refreshToken,
    getRefreshTokenCookieOptions(),
  );
};

export const clearRefreshTokenCookie = (res: Response) => {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, getRefreshTokenCookieOptions());
};

export const getRefreshTokenFromCookie = (req: Request) => {
  const token = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
  return typeof token === "string" && token ? token : null;
};

