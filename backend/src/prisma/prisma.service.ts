import { PrismaClient } from "@prisma/client";

import { resolvePrismaDatabaseUrl } from "./prisma-connection.js";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: resolvePrismaDatabaseUrl(),
      },
    },
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

const shouldEnableDatabaseKeepAlive = process.env.ENABLE_DB_KEEP_ALIVE === "true";

// Pre-warm database and optionally keep the connection active when explicitly enabled.
const warmUpAndKeepAlive = async () => {
  console.log("Database connection warm-up triggered...");
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("Database connection is warm and ready.");
  } catch (error) {
    console.error("Database connection warm-up failed:", error);
  }

  if (!shouldEnableDatabaseKeepAlive) {
    return;
  }

  const keepAliveTimer = setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log("Database keep-alive ping sent successfully.");
    } catch (error) {
      console.error("Database keep-alive ping failed:", error);
    }
  }, 30_000);

  keepAliveTimer.unref();
};

// Skip warm-up side effects in automated tests.
if (process.env.NODE_ENV !== "test") {
  void warmUpAndKeepAlive();
}

