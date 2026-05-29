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
    const targetType = req.query.targetType as string | undefined;
    const targetId = req.query.targetId as string | undefined;

    const where: any = {};
    if (actorId) where.actorId = actorId;
    if (action) where.action = action;
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = targetId;

    const [items, total] = await prisma.$transaction([
      prisma.systemLog.findMany({
        where,
        include: {
          actor: {
            select: { id: true, fullName: true, email: true },
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
