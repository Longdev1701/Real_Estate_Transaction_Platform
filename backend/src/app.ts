import express from "express";

import { prisma } from "./prisma/prisma.service.js";

export const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "real-estate-transaction-backend",
  });
});

app.get("/health/db", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      ok: true,
      database: "connected",
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      database: "disconnected",
      message: error instanceof Error ? error.message : "Unknown database error",
    });
  }
});
