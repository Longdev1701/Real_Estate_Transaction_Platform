import type { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma/prisma.service.js";
import { sendSuccess } from "../utils/response.js";

export const getSystemLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const actorId = req.query.actorId as string | undefined;
    const action = req.query.action as string | undefined;
    const module = req.query.module as string | undefined;
    const targetType = req.query.targetType as string | undefined;
    const targetId = req.query.targetId as string | undefined;
    const keyword = req.query.keyword as string | undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const severity = req.query.severity as string | undefined;
    const status = req.query.status as string | undefined;

    const where: any = {};
    if (actorId) where.actorId = actorId;
    if (action) where.action = action;
    if (
      module &&
      ["AUTH", "USER", "POST", "REPORT", "ADMIN", "SYSTEM", "STORAGE"].includes(module)
    ) {
      where.module = module;
    }
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = targetId;
    if (
      severity &&
      ["INFO", "WARNING", "SECURITY", "ERROR"].includes(severity)
    ) {
      where.severity = severity;
    }
    if (
      status &&
      ["SUCCESS", "FAILED", "BLOCKED"].includes(status)
    ) {
      where.status = status;
    }
    if (keyword) {
      where.OR = [
        { action: { contains: keyword, mode: "insensitive" } },
        { description: { contains: keyword, mode: "insensitive" } },
        { targetType: { contains: keyword, mode: "insensitive" } },
        { targetId: { contains: keyword, mode: "insensitive" } },
        {
          actor: {
            OR: [
              { fullName: { contains: keyword, mode: "insensitive" } },
              { email: { contains: keyword, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00.000+07:00`) } : {}),
        ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999+07:00`) } : {}),
      };
    }

    const [items, total] = await prisma.$transaction([
      prisma.systemLog.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.systemLog.count({ where }),
    ]);

    sendSuccess(res, {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page < Math.ceil(total / limit),
      },
    }, "System logs fetched successfully");
  } catch (error) {
    next(error);
  }
};
