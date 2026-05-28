import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Pre-warm database and start keep-alive ping to prevent Supabase sleep
const warmUpAndKeepAlive = async () => {
  console.log("Database connection warm-up triggered...");
  try {
    // Run a lightweight raw query
    await prisma.$queryRaw`SELECT 1`;
    console.log("Database connection is warm and ready.");
  } catch (error) {
    console.error("Database connection warm-up failed:", error);
  }

  // Ping every 5 minutes (300,000 ms) to prevent Supabase from going to sleep
  setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log("Database keep-alive ping sent successfully.");
    } catch (error) {
      console.error("Database keep-alive ping failed:", error);
    }
  }, 300_000);
};

// Start warming up immediately (asynchronous, doesn't block server startup)
warmUpAndKeepAlive();

