import {
  SystemLogModule,
  SystemLogSeverity,
  SystemLogStatus,
  type Prisma,
} from "@prisma/client";

import { prisma } from "../prisma/prisma.service.js";

export type AdminLogCategory = "AUTH" | "USER" | "POST" | "ADMIN" | "ERROR";

export type AdminSystemLogListFilter = {
  page: number;
  limit: number;
  actorId?: string;
  action?: string;
  module?: SystemLogModule;
  targetType?: string;
  targetId?: string;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
  severity?: SystemLogSeverity;
  status?: SystemLogStatus;
  category?: AdminLogCategory;
};

export type AdminSystemLogStatsFilter = Omit<
  AdminSystemLogListFilter,
  "page" | "limit" | "category"
>;

const LOG_ADMIN_MODULES = [SystemLogModule.ADMIN, SystemLogModule.REPORT];
const LOG_ERROR_MODULES = [SystemLogModule.SYSTEM, SystemLogModule.STORAGE];

const buildDateRange = (dateFrom?: string, dateTo?: string) => {
  if (!dateFrom && !dateTo) {
    return undefined;
  }

  return {
    ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00.000+07:00`) } : {}),
    ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999+07:00`) } : {}),
  };
};

const buildCategoryWhere = (category?: AdminLogCategory): Prisma.SystemLogWhereInput | undefined => {
  if (!category) {
    return undefined;
  }

  if (category === "AUTH") {
    return { module: SystemLogModule.AUTH };
  }

  if (category === "USER") {
    return { module: SystemLogModule.USER };
  }

  if (category === "POST") {
    return { module: SystemLogModule.POST };
  }

  if (category === "ADMIN") {
    return { module: { in: LOG_ADMIN_MODULES } };
  }

  return { module: { in: LOG_ERROR_MODULES } };
};

const buildSystemLogWhere = (
  filter: Omit<AdminSystemLogListFilter, "page" | "limit">,
) => {
  const where: Prisma.SystemLogWhereInput = {};

  if (filter.actorId) where.actorId = filter.actorId;
  if (filter.action) where.action = filter.action;
  if (filter.module) where.module = filter.module;
  if (filter.targetType) where.targetType = filter.targetType;
  if (filter.targetId) where.targetId = filter.targetId;
  if (filter.severity) where.severity = filter.severity;
  if (filter.status) where.status = filter.status;

  if (filter.keyword) {
    where.OR = [
      { action: { contains: filter.keyword, mode: "insensitive" } },
      { description: { contains: filter.keyword, mode: "insensitive" } },
      { targetType: { contains: filter.keyword, mode: "insensitive" } },
      { targetId: { contains: filter.keyword, mode: "insensitive" } },
      {
        actor: {
          OR: [
            { fullName: { contains: filter.keyword, mode: "insensitive" } },
            { email: { contains: filter.keyword, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  const createdAt = buildDateRange(filter.dateFrom, filter.dateTo);
  if (createdAt) {
    where.createdAt = createdAt;
  }

  const categoryWhere = buildCategoryWhere(filter.category);
  if (!categoryWhere) {
    return where;
  }

  return {
    AND: [where, categoryWhere],
  };
};

export const getAdminSystemLogs = async ({
  page,
  limit,
  ...filter
}: AdminSystemLogListFilter) => {
  const where = buildSystemLogWhere(filter);
  const skip = (page - 1) * limit;

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

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasMore: page * limit < total,
    },
  };
};

export const getAdminSystemLogsStats = async (
  filter: AdminSystemLogStatsFilter,
) => {
  const where = buildSystemLogWhere(filter);

  const [
    total,
    security,
    errors,
    admin,
    auth,
    user,
    post,
    errorCategory,
    moduleGroups,
  ] = await prisma.$transaction([
    prisma.systemLog.count({ where }),
    prisma.systemLog.count({
      where: {
        AND: [
          where,
          {
            OR: [
              { severity: SystemLogSeverity.SECURITY },
              { status: SystemLogStatus.BLOCKED },
            ],
          },
        ],
      },
    }),
    prisma.systemLog.count({
      where: {
        AND: [where, { severity: SystemLogSeverity.ERROR }],
      },
    }),
    prisma.systemLog.count({
      where: {
        AND: [where, { module: { in: LOG_ADMIN_MODULES } }],
      },
    }),
    prisma.systemLog.count({
      where: {
        AND: [where, { module: SystemLogModule.AUTH }],
      },
    }),
    prisma.systemLog.count({
      where: {
        AND: [where, { module: SystemLogModule.USER }],
      },
    }),
    prisma.systemLog.count({
      where: {
        AND: [where, { module: SystemLogModule.POST }],
      },
    }),
    prisma.systemLog.count({
      where: {
        AND: [where, { module: { in: LOG_ERROR_MODULES } }],
      },
    }),
    prisma.systemLog.groupBy({
      by: ["module"],
      where,
    }),
  ]);

  return {
    total,
    security,
    errors,
    admin,
    categoryCounts: {
      ALL: total,
      AUTH: auth,
      USER: user,
      POST: post,
      ADMIN: admin,
      ERROR: errorCategory,
    },
    modules: moduleGroups.map((group) => group.module),
  };
};
