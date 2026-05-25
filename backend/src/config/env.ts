import "dotenv/config";

export const PORT = Number(process.env.PORT ?? 4000);
export const DATABASE_URL = process.env.DATABASE_URL ?? "";
export const DIRECT_URL = process.env.DIRECT_URL ?? "";
export const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:3000";
export const JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? "replace-with-access-secret";
export const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? "replace-with-refresh-secret";
export const JWT_SECRET = process.env.JWT_SECRET ?? JWT_ACCESS_SECRET;
