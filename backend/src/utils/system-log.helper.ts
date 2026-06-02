import type { Request } from "express";
import type { Prisma } from "@prisma/client";

import { prisma } from "../prisma/prisma.service.js";

export type SystemLogModuleValue =
  | "AUTH"
  | "USER"
  | "POST"
  | "REPORT"
  | "ADMIN"
  | "SYSTEM"
  | "STORAGE";

export type SystemLogSeverityValue = "INFO" | "WARNING" | "SECURITY" | "ERROR";
export type SystemLogStatusValue = "SUCCESS" | "FAILED" | "BLOCKED";

type CreateSystemLogInput = {
  module: SystemLogModuleValue;
  actorId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  description?: string;
  severity?: SystemLogSeverityValue;
  status?: SystemLogStatusValue;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Prisma.InputJsonValue;
  request?: Request;
};

export const createSystemLog = async (input: CreateSystemLogInput) => {
  try {
    const forwardedFor = input.request?.headers["x-forwarded-for"];
    const requestIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : typeof forwardedFor === "string"
        ? forwardedFor.split(",")[0]?.trim()
        : input.request?.ip;

    await prisma.systemLog.create({
      data: {
        module: input.module,
        actorId: input.actorId,
        action: input.action,
        targetType: input.targetType ?? "",
        targetId: input.targetId ?? "",
        description: input.description,
        severity: input.severity ?? "INFO",
        status: input.status ?? "SUCCESS",
        ipAddress: input.ipAddress ?? requestIp,
        userAgent: input.userAgent ?? input.request?.get("user-agent"),
        metadata: input.metadata,
      },
    });
  } catch (error) {
    // Log creation should never break the main flow
    console.error("Failed to create system log:", error);
  }
};
