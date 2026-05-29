import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { ReportStatus, PostStatus } from "@prisma/client";

import { prisma } from "../prisma/prisma.service.js";
import { sendSuccess } from "../utils/response.js";
import { AppError } from "../middlewares/error.middleware.js";
import { createSystemLog } from "../utils/system-log.helper.js";

const createReportSchema = z.object({
  postId: z.string().min(1),
  reason: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
});

const resolveReportSchema = z.object({
  status: z.enum(["RESOLVED", "REJECTED"]),
});

export const createReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { postId, reason, description } = createReportSchema.parse(req.body);

    const post = await prisma.propertyPost.findUnique({
      where: { id: postId },
      select: { id: true, status: true },
    });

    if (!post || post.status !== PostStatus.ACTIVE) {
      throw new AppError("Post not found or not active.", 404);
    }

    // Check if user already reported this post
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId: userId,
        postId,
        status: ReportStatus.PENDING,
      },
    });

    if (existingReport) {
      throw new AppError("You have already reported this post.", 409);
    }

    const report = await prisma.report.create({
      data: {
        reporterId: userId,
        postId,
        reason,
        description,
      },
    });

    sendSuccess(res, { report }, "Report submitted successfully", 201);
  } catch (error) {
    next(error);
  }
};

export const getReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    const where: any = {};
    if (status && Object.values(ReportStatus).includes(status as ReportStatus)) {
      where.status = status;
    }

    const [items, total] = await prisma.$transaction([
      prisma.report.findMany({
        where,
        include: {
          reporter: {
            select: { id: true, fullName: true, email: true, avatarUrl: true },
          },
          post: {
            select: { id: true, title: true, status: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.report.count({ where }),
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
    }, "Reports fetched successfully");
  } catch (error) {
    next(error);
  }
};

export const resolveReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const adminId = req.user!.id;
    const { status } = resolveReportSchema.parse(req.body);

    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      throw new AppError("Report not found.", 404);
    }

    if (report.status !== ReportStatus.PENDING) {
      throw new AppError("Report has already been processed.", 400);
    }

    const updatedReport = await prisma.report.update({
      where: { id },
      data: {
        status: status as ReportStatus,
        resolvedAt: new Date(),
      },
      include: {
        reporter: {
          select: { id: true, fullName: true, email: true },
        },
        post: {
          select: { id: true, title: true },
        },
      },
    });

    // If resolved, optionally ban the post
    if (status === "RESOLVED") {
      await prisma.propertyPost.update({
        where: { id: report.postId },
        data: { status: PostStatus.BANNED },
      });
    }

    await createSystemLog({
      actorId: adminId,
      action: `REPORT_${status}`,
      targetType: "Report",
      targetId: id,
      description: `Admin ${status.toLowerCase()} report #${id} for post #${report.postId}`,
    });

    sendSuccess(res, { report: updatedReport }, `Report ${status.toLowerCase()} successfully`);
  } catch (error) {
    next(error);
  }
};
