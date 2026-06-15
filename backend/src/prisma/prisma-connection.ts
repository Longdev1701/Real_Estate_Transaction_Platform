const DEFAULT_SUPABASE_CONNECTION_LIMIT = "5";
const DEFAULT_SUPABASE_POOL_TIMEOUT = "20";

// Supabase session pooler rejects large client-side pools, so we normalize
// the Prisma URL in one place when explicit env overrides are not provided.
export const resolvePrismaDatabaseUrl = (databaseUrl = process.env.DATABASE_URL) => {
  if (!databaseUrl) {
    return undefined;
  }

  const url = new URL(databaseUrl);

  if (!url.hostname.includes("pooler.supabase.com")) {
    return databaseUrl;
  }

  if (!url.searchParams.has("connection_limit")) {
    url.searchParams.set(
      "connection_limit",
      process.env.PRISMA_CONNECTION_LIMIT?.trim() || DEFAULT_SUPABASE_CONNECTION_LIMIT,
    );
  }

  if (!url.searchParams.has("pool_timeout")) {
    url.searchParams.set(
      "pool_timeout",
      process.env.PRISMA_POOL_TIMEOUT?.trim() || DEFAULT_SUPABASE_POOL_TIMEOUT,
    );
  }

  return url.toString();
};
