import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AppealStatus, NotificationType, ReportStatus, PostStatus, UserRole } from "@prisma/client";

import { prisma } from "../prisma/prisma.service.js";
import { sendSuccess } from "../utils/response.js";
import { AppError } from "../middlewares/error.middleware.js";
import { createNotification } from "../utils/notification.helper.js";
import { createSystemLog } from "../utils/system-log.helper.js";

const createReportSchema = z.object({
  postId: z.string().trim().min(1),
  reason: z.string().trim().min(1).max(500),
  description: z.string().trim().max(2000).optional(),
});

const resolveReportSchema = z.object({
  status: z.enum(["RESOLVED", "REJECTED"]),
});

const appealReportSchema = z.object({
  message: z.string().trim().min(20).max(2000),
  evidence: z.string().trim().min(10).max(4000),
});

const reviewAppealSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
});

export const createReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { postId, reason, description } = createReportSchema.parse(req.body);

    const post = await prisma.propertyPost.findUnique({
      where: { id: postId },
      select: { id: true, status: true, authorId: true },
    });

    if (!post || post.status !== PostStatus.ACTIVE) {
      throw new AppError("Post not found or not active.", 404);
    }

    if (post.authorId === userId) {
      throw new AppError("You cannot report your own post.", 400);
    }

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
        description: description || undefined,
      },
    });

    await createSystemLog({
      module: "REPORT",
      actorId: userId,
      action: "CREATE_REPORT",
      targetType: "Report",
      targetId: report.id,
      description: `Người dùng ${userId} đã gửi báo cáo cho bài đăng #${postId}.`,
      severity: "WARNING",
      status: "SUCCESS",
      request: req,
      metadata: {
        reportId: report.id,
        postId,
        reason,
      },
    });

    const admins = await prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      select: { id: true },
    });

    void Promise.allSettled(
      admins
        .filter((admin) => admin.id !== userId)
        .map((admin) =>
          createNotification({
            userId: admin.id,
            type: NotificationType.REPORT,
            relatedId: report.id,
            title: "Có báo cáo bài đăng mới",
            content: `Một bài đăng vừa bị báo cáo với lý do: ${reason}.`,
          }),
        ),
    );

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

    const where: Record<string, unknown> = {};
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
            select: {
              id: true,
              title: true,
              status: true,
              price: true,
              address: true,
              city: true,
              district: true,
              createdAt: true,
              author: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  avatarUrl: true,
                },
              },
              images: {
                select: {
                  id: true,
                  imageUrl: true,
                  order: true,
                },
                orderBy: { order: "asc" },
                take: 1,
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.report.count({ where }),
    ]);

    sendSuccess(
      res,
      {
        items,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page < Math.ceil(total / limit),
        },
      },
      "Reports fetched successfully",
    );
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
          select: {
            id: true,
            title: true,
            status: true,
            price: true,
            address: true,
            city: true,
            district: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
              },
            },
            images: {
              select: {
                id: true,
                imageUrl: true,
                order: true,
              },
              orderBy: { order: "asc" },
              take: 1,
            },
          },
        },
      },
    });

    if (status === "RESOLVED") {
      await prisma.propertyPost.update({
        where: { id: report.postId },
        data: { status: PostStatus.BANNED },
      });

      void createNotification({
        userId: updatedReport.post.author.id,
        type: NotificationType.POST,
        relatedId: report.postId,
        title: "Bài đăng của bạn đã bị khóa",
        content: "Bài đăng của bạn đã bị khóa do vi phạm và đang chờ xử lý hoặc khiếu nại.",
      });
    }

    await createSystemLog({
      module: "REPORT",
      actorId: adminId,
      action: `REPORT_${status}`,
      targetType: "Report",
      targetId: id,
      description:
        status === "RESOLVED"
          ? `Quản trị viên đã xử lý báo cáo #${id} cho bài đăng #${report.postId}.`
          : `Quản trị viên đã từ chối báo cáo #${id} cho bài đăng #${report.postId}.`,
      severity: status === "RESOLVED" ? "WARNING" : "INFO",
      status: "SUCCESS",
      request: req,
      metadata: {
        reportId: id,
        postId: report.postId,
        reportStatus: status,
        reporterId: report.reporterId,
      },
    });

    void createNotification({
      userId: report.reporterId,
      type: NotificationType.REPORT,
      relatedId: report.postId,
      title:
        status === "RESOLVED"
          ? "Báo cáo của bạn đã được xử lý"
          : "Báo cáo của bạn đã bị từ chối",
      content:
        status === "RESOLVED"
          ? "Cảm ơn bạn đã báo cáo. Nội dung vi phạm đã được xử lý."
          : "Báo cáo của bạn đã được xem xét nhưng chưa đủ điều kiện xử lý.",
    });

    sendSuccess(res, { report: updatedReport }, `Report ${status.toLowerCase()} successfully`);
  } catch (error) {
    next(error);
  }
};

export const appealReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actorId = req.user!.id;
    const reportId = req.params.id as string;
    const { message, evidence } = appealReportSchema.parse(req.body);

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            status: true,
            authorId: true,
          },
        },
      },
    });

    if (!report) {
      throw new AppError("Report not found.", 404);
    }

    if (report.post.authorId !== actorId) {
      throw new AppError("You do not have permission to appeal this report.", 403);
    }

    if (report.status !== ReportStatus.RESOLVED || report.post.status !== PostStatus.BANNED) {
      throw new AppError("Only banned posts can be appealed.", 400);
    }

    if (report.appealStatus === AppealStatus.PENDING) {
      throw new AppError("This report already has a pending appeal.", 409);
    }

    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: {
        appealStatus: AppealStatus.PENDING,
        appealMessage: message,
        appealEvidence: evidence,
        appealedAt: new Date(),
      },
      include: {
        reporter: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
        post: {
          select: {
            id: true,
            title: true,
            status: true,
            price: true,
            address: true,
            city: true,
            district: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
              },
            },
            images: {
              select: {
                id: true,
                imageUrl: true,
                order: true,
              },
              orderBy: { order: "asc" },
              take: 1,
            },
          },
        },
      },
    });

    await createSystemLog({
      module: "REPORT",
      actorId,
      action: "APPEAL_REPORT",
      targetType: "Report",
      targetId: reportId,
      description: `Người đăng ${actorId} đã gửi khiếu nại cho báo cáo #${reportId} của bài đăng #${report.post.id}.`,
      severity: "INFO",
      status: "SUCCESS",
      request: req,
      metadata: {
        reportId,
        postId: report.post.id,
        appealMessageLength: message.length,
      },
    });

    const admins = await prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      select: { id: true },
    });

    void Promise.allSettled(
      admins.map((admin) =>
        createNotification({
          userId: admin.id,
          type: NotificationType.REPORT,
          relatedId: reportId,
          title: "Có khiếu nại mới cho báo cáo",
          content: `Người đăng vừa gửi khiếu nại cho bài "${report.post.title}".`,
        }),
      ),
    );

    sendSuccess(res, { report: updatedReport }, "Appeal submitted successfully", 201);
  } catch (error) {
    next(error);
  }
};

export const reviewReportAppeal = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const reportId = req.params.id as string;
    const adminId = req.user!.id;
    const { decision } = reviewAppealSchema.parse(req.body);

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            status: true,
            author: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
              },
            },
            images: {
              select: {
                id: true,
                imageUrl: true,
                order: true,
              },
              orderBy: { order: "asc" },
              take: 1,
            },
          },
        },
        reporter: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!report) {
      throw new AppError("Report not found.", 404);
    }

    if (report.status !== ReportStatus.RESOLVED) {
      throw new AppError("Only resolved reports can be reviewed for appeal.", 400);
    }

    if (report.appealStatus !== AppealStatus.PENDING) {
      throw new AppError("This report does not have a pending appeal.", 400);
    }

    const nextPostStatus =
      decision === "APPROVE" ? PostStatus.ACTIVE : PostStatus.BANNED;

    const updatedReport = await prisma.$transaction(async (tx) => {
      await tx.propertyPost.update({
        where: { id: report.postId },
        data: { status: nextPostStatus },
      });

      return tx.report.update({
        where: { id: reportId },
        data: {
          appealStatus: AppealStatus.REVIEWED,
        },
        include: {
          reporter: {
            select: { id: true, fullName: true, email: true, avatarUrl: true },
          },
          post: {
            select: {
              id: true,
              title: true,
              status: true,
              price: true,
              address: true,
              city: true,
              district: true,
              createdAt: true,
              author: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  avatarUrl: true,
                },
              },
              images: {
                select: {
                  id: true,
                  imageUrl: true,
                  order: true,
                },
                orderBy: { order: "asc" },
                take: 1,
              },
            },
          },
        },
      });
    });

    await createSystemLog({
      module: "REPORT",
      actorId: adminId,
      action: `REVIEW_APPEAL_${decision}`,
      targetType: "Report",
      targetId: reportId,
      description:
        decision === "APPROVE"
          ? `Quản trị viên đã chấp nhận khiếu nại cho báo cáo #${reportId} và mở lại bài đăng #${report.post.id}.`
          : `Quản trị viên đã bác khiếu nại cho báo cáo #${reportId} và giữ nguyên trạng thái khóa của bài đăng #${report.post.id}.`,
      severity: decision === "APPROVE" ? "INFO" : "WARNING",
      status: "SUCCESS",
      request: req,
      metadata: {
        reportId,
        postId: report.post.id,
        decision,
      },
    });

    void createNotification({
      userId: report.post.author.id,
      type: NotificationType.REPORT,
      relatedId: reportId,
      title:
        decision === "APPROVE"
          ? "Khiếu nại của bạn đã được chấp nhận"
          : "Khiếu nại của bạn đã bị từ chối",
      content:
        decision === "APPROVE"
          ? "Bài đăng của bạn đã được mở lại sau khi quản trị viên xem xét khiếu nại."
          : "Quản trị viên đã xem xét khiếu nại nhưng vẫn giữ nguyên quyết định khóa bài đăng.",
    });

    sendSuccess(
      res,
      { report: updatedReport },
      decision === "APPROVE"
        ? "Appeal approved successfully"
        : "Appeal rejected successfully",
    );
  } catch (error) {
    next(error);
  }
};
