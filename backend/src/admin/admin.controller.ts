import type { RequestHandler } from "express";
import {
  PostStatus,
  PostType,
  PropertyType,
  UserRole,
  UserStatus,
} from "@prisma/client";

import {
  getAdminDashboard,
  getAdminPosts,
  getAdminUsers,
  updateAdminUser,
} from "./admin.service.js";
import { sendSuccess } from "../utils/response.js";

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

    const result = await getAdminUsers({
      page,
      limit,
      keyword: keyword || undefined,
      role: parseUserRole(req.query.role),
      status: parseUserStatus(req.query.status),
    });

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
    const result = await updateAdminUser(
      String(req.params.id),
      {
        role: parseUserRole(req.body.role),
        status: parseUserStatus(req.body.status),
      },
      req.user!.id,
    );

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
