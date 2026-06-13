import "dotenv/config";

const requireEnv = (name: string) => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const parseSameSite = (value?: string) => {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return "lax" as const;
  }

  if (normalized === "lax" || normalized === "strict" || normalized === "none") {
    return normalized;
  }

  throw new Error("COOKIE_SAME_SITE must be one of: lax, strict, none");
};

const normalizeOrigin = (origin: string) => {
  let parsed: URL;

  try {
    parsed = new URL(origin);
  } catch {
    throw new Error(`Invalid origin in CORS_ORIGINS: ${origin}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`CORS_ORIGINS only supports http/https origins: ${origin}`);
  }

  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error(`CORS_ORIGINS entries must be bare origins without path/query/hash: ${origin}`);
  }

  return parsed.origin;
};

const parseCorsOrigins = (value?: string) => {
  const origins = (value ?? "")
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map(normalizeOrigin);

  if (!origins.length) {
    throw new Error("CORS_ORIGINS must contain at least one valid origin.");
  }

  return [...new Set(origins)];
};

export const PORT = Number(process.env.PORT ?? 4000);
export const DATABASE_URL = process.env.DATABASE_URL ?? "";
export const DIRECT_URL = process.env.DIRECT_URL ?? "";
export const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:3000";
export const NODE_ENV = process.env.NODE_ENV ?? "development";
export const IS_PRODUCTION = NODE_ENV === "production";
export const JWT_ACCESS_SECRET = requireEnv("JWT_ACCESS_SECRET");
export const JWT_REFRESH_SECRET = requireEnv("JWT_REFRESH_SECRET");
export const JWT_SECRET = process.env.JWT_SECRET ?? JWT_ACCESS_SECRET;
export const REFRESH_TOKEN_COOKIE_NAME =
  process.env.REFRESH_TOKEN_COOKIE_NAME?.trim() || "refreshToken";
export const COOKIE_SAME_SITE = parseSameSite(process.env.COOKIE_SAME_SITE);
export const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN?.trim() || undefined;
export const CORS_ORIGINS = parseCorsOrigins(process.env.CORS_ORIGINS ?? CLIENT_URL);

if (COOKIE_SAME_SITE === "none" && !IS_PRODUCTION) {
  console.warn(
    "COOKIE_SAME_SITE=none in non-production requires HTTPS clients for refresh cookies to work correctly.",
  );
}
