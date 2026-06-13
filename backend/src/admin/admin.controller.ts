import type { RequestHandler } from "express";
import {
  PostStatus,
  PostType,
  PropertyType,
  UserRole,
  UserStatus,
  ReportStatus,
  SystemLogModule,
  SystemLogSeverity,
  SystemLogStatus,
} from "@prisma/client";

import {
  getAdminDashboard,
  getAdminPosts,
  getAdminPostsStats,
  getAdminUserDetail,
  getAdminUsers,
  getAdminUsersStats,
  updateAdminUser,
} from "./admin.service.js";
import {
  getAdminReports,
  getAdminReportsStats,
} from "./admin-report.service.js";
import {
  getAdminSystemLogs,
  getAdminSystemLogsStats,
  type AdminLogCategory,
} from "./admin-log.service.js";
import { sendSuccess } from "../utils/response.js";
import { createSystemLog } from "../utils/system-log.helper.js";

const toPositiveNumber = (
  value: unknown,
  fallback: number,
  options?: { max?: number },
) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(Math.floor(parsed), options?.max ?? parsed);
};

const parseUserRole = (value: unknown) => {
  if (typeof value !== "string" || !value) {
    return undefined;
  }

  return Object.values(UserRole).includes(value as UserRole)
    ? (value as UserRole)
    : undefined;
};

const parseUserStatus = (value: unknown) => {
  if (typeof value !== "string" || !value) {
    return undefined;
  }

  return Object.values(UserStatus).includes(value as UserStatus)
    ? (value as UserStatus)
    : undefined;
};

const parsePostStatus = (value: unknown) => {
  if (typeof value !== "string" || !value) {
    return undefined;
  }

  return Object.values(PostStatus).includes(value as PostStatus)
    ? (value as PostStatus)
    : undefined;
};

const parsePropertyType = (value: unknown) => {
  if (typeof value !== "string" || !value) {
    return undefined;
  }

  return Object.values(PropertyType).includes(value as PropertyType)
    ? (value as PropertyType)
    : undefined;
};

const parsePostType = (value: unknown) => {
  if (typeof value !== "string" || !value) {
    return undefined;
  }

  return Object.values(PostType).includes(value as PostType)
    ? (value as PostType)
    : undefined;
};

const parseOptionalNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

const parseReportStatus = (value: unknown) => {
  if (typeof value !== "string" || !value) {
    return undefined;
  }

  return Object.values(ReportStatus).includes(value as ReportStatus)
    ? (value as ReportStatus)
    : undefined;
};

const parseSystemLogModule = (value: unknown) => {
  if (typeof value !== "string" || !value) {
    return undefined;
  }

  return Object.values(SystemLogModule).includes(value as SystemLogModule)
    ? (value as SystemLogModule)
    : undefined;
};

const parseSystemLogSeverity = (value: unknown) => {
  if (typeof value !== "string" || !value) {
    return undefined;
  }

  return Object.values(SystemLogSeverity).includes(
    value as SystemLogSeverity,
  )
    ? (value as SystemLogSeverity)
    : undefined;
};

const parseSystemLogStatus = (value: unknown) => {
  if (typeof value !== "string" || !value) {
    return undefined;
  }

  return Object.values(SystemLogStatus).includes(value as SystemLogStatus)
    ? (value as SystemLogStatus)
    : undefined;
};

const parseAdminLogCategory = (value: unknown) => {
  if (typeof value !== "string" || !value) {
    return undefined;
  }

  return ["AUTH", "USER", "POST", "ADMIN", "ERROR"].includes(value)
    ? (value as AdminLogCategory)
    : undefined;
};

export const getAdminDashboardController: RequestHandler = async (
  _req,
  res,
  next,
) => {
  try {
    const dashboard = await getAdminDashboard();
    sendSuccess(res, dashboard);
  } catch (error) {
    next(error);
  }
};

export const getAdminUsersController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const page = toPositiveNumber(req.query.page, 1);
    const limit = toPositiveNumber(req.query.limit, 10, { max: 50 });
    const keyword =
      typeof req.query.keyword === "string" ? req.query.keyword.trim() : "";
    const dateFrom =
      typeof req.query.dateFrom === "string" ? req.query.dateFrom.trim() : "";
    const dateTo =
      typeof req.query.dateTo === "string" ? req.query.dateTo.trim() : "";

    const result = await getAdminUsers({
      page,
      limit,
      keyword: keyword || undefined,
      role: parseUserRole(req.query.role),
      status: parseUserStatus(req.query.status),
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getAdminUsersStatsController: RequestHandler = async (
  _req,
  res,
  next,
) => {
  try {
    const result = await getAdminUsersStats();
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getAdminUserDetailController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const result = await getAdminUserDetail(String(req.params.id));
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const updateAdminUserController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const nextRole = parseUserRole(req.body.role);
    const nextStatus = parseUserStatus(req.body.status);
    const result = await updateAdminUser(
      String(req.params.id),
      {
        role: nextRole,
        status: nextStatus,
      },
      req.user!.id,
    );

    if (nextRole) {
      await createSystemLog({
        module: "USER",
        actorId: req.user!.id,
        action: "UPDATE_USER_ROLE",
        targetType: "User",
        targetId: String(req.params.id),
        description: `Quản trị viên đã cập nhật vai trò của người dùng #${req.params.id} thành ${nextRole}.`,
        severity: "SECURITY",
        status: "SUCCESS",
        request: req,
        metadata: {
          targetUserId: String(req.params.id),
          role: nextRole,
        },
      });
    }

    if (nextStatus) {
      await createSystemLog({
        module: "USER",
        actorId: req.user!.id,
        action: nextStatus === UserStatus.BANNED ? "BAN_USER" : "ACTIVATE_USER",
        targetType: "User",
        targetId: String(req.params.id),
        description: `Quản trị viên đã cập nhật trạng thái của người dùng #${req.params.id} thành ${nextStatus}.`,
        severity: nextStatus === UserStatus.BANNED ? "WARNING" : "INFO",
        status: "SUCCESS",
        request: req,
        metadata: {
          targetUserId: String(req.params.id),
          status: nextStatus,
        },
      });
    }

    sendSuccess(res, result, "User updated successfully.");
  } catch (error) {
    next(error);
  }
};

export const getAdminPostsController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const page = toPositiveNumber(req.query.page, 1);
    const limit = toPositiveNumber(req.query.limit, 10, { max: 50 });
    const keyword =
      typeof req.query.keyword === "string" ? req.query.keyword.trim() : "";

    const result = await getAdminPosts({
      page,
      limit,
      keyword: keyword || undefined,
      status: parsePostStatus(req.query.status),
      propertyType: parsePropertyType(req.query.propertyType),
      postType: parsePostType(req.query.postType),
      minPrice: parseOptionalNumber(req.query.minPrice),
      maxPrice: parseOptionalNumber(req.query.maxPrice),
    });

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getAdminPostsStatsController: RequestHandler = async (
  _req,
  res,
  next,
) => {
  try {
    const result = await getAdminPostsStats();
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getAdminReportsController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const page = toPositiveNumber(req.query.page, 1);
    const limit = toPositiveNumber(req.query.limit, 10, { max: 50 });
    const keyword =
      typeof req.query.keyword === "string" ? req.query.keyword.trim() : "";

    const result = await getAdminReports({
      page,
      limit,
      keyword: keyword || undefined,
      status: parseReportStatus(req.query.status),
    });

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getAdminReportsStatsController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const keyword =
      typeof req.query.keyword === "string" ? req.query.keyword.trim() : "";

    const result = await getAdminReportsStats({
      keyword: keyword || undefined,
    });

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getAdminLogsController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const page = toPositiveNumber(req.query.page, 1);
    const limit = toPositiveNumber(req.query.limit, 10, { max: 100 });
    const keyword =
      typeof req.query.keyword === "string" ? req.query.keyword.trim() : "";
    const actorId =
      typeof req.query.actorId === "string" ? req.query.actorId.trim() : "";
    const action =
      typeof req.query.action === "string" ? req.query.action.trim() : "";
    const targetType =
      typeof req.query.targetType === "string"
        ? req.query.targetType.trim()
        : "";
    const targetId =
      typeof req.query.targetId === "string" ? req.query.targetId.trim() : "";
    const dateFrom =
      typeof req.query.dateFrom === "string" ? req.query.dateFrom.trim() : "";
    const dateTo =
      typeof req.query.dateTo === "string" ? req.query.dateTo.trim() : "";

    const result = await getAdminSystemLogs({
      page,
      limit,
      actorId: actorId || undefined,
      action: action || undefined,
      module: parseSystemLogModule(req.query.module),
      targetType: targetType || undefined,
      targetId: targetId || undefined,
      keyword: keyword || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      severity: parseSystemLogSeverity(req.query.severity),
      status: parseSystemLogStatus(req.query.status),
      category: parseAdminLogCategory(req.query.category),
    });

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getAdminLogsStatsController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const keyword =
      typeof req.query.keyword === "string" ? req.query.keyword.trim() : "";
    const actorId =
      typeof req.query.actorId === "string" ? req.query.actorId.trim() : "";
    const action =
      typeof req.query.action === "string" ? req.query.action.trim() : "";
    const targetType =
      typeof req.query.targetType === "string"
        ? req.query.targetType.trim()
        : "";
    const targetId =
      typeof req.query.targetId === "string" ? req.query.targetId.trim() : "";
    const dateFrom =
      typeof req.query.dateFrom === "string" ? req.query.dateFrom.trim() : "";
    const dateTo =
      typeof req.query.dateTo === "string" ? req.query.dateTo.trim() : "";

    const result = await getAdminSystemLogsStats({
      actorId: actorId || undefined,
      action: action || undefined,
      module: parseSystemLogModule(req.query.module),
      targetType: targetType || undefined,
      targetId: targetId || undefined,
      keyword: keyword || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      severity: parseSystemLogSeverity(req.query.severity),
      status: parseSystemLogStatus(req.query.status),
    });

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};
