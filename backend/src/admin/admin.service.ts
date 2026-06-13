import {
  PostStatus,
  PostType,
  PropertyType,
  ReportStatus,
  UserRole,
  UserStatus,
  type Prisma,
} from "@prisma/client";

import { invalidateCachedAuthUser } from "../auth/auth-user-cache.js";
import { revokeAllUserRefreshTokens } from "../auth/auth.service.js";
import { prisma } from "../prisma/prisma.service.js";



const ADMIN_STATS_CACHE_TTL_MS = 60_000;

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * DAY_MS);

const startOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

const previousMonthRange = (date: Date) => {
  const currentMonthStart = startOfMonth(date);
  const previousMonthStart = new Date(
    currentMonthStart.getFullYear(),
    currentMonthStart.getMonth() - 1,
    1,
  );

  return {
    previousMonthStart,
    currentMonthStart,
  };
};

const calculatePercentChange = (current: number, previous: number) => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return Number((((current - previous) / previous) * 100).toFixed(1));
};

const makeDateKey = (date: Date) => date.toISOString().slice(0, 10);

const makeViShortLabel = (date: Date) =>
  `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;

type CachedValue<T> = {
  expiresAt: number;
  value: T;
};

type DailyCountRow = {
  date: Date;
  total: number;
};

type UserSummaryRow = {
  total: number;
  banned: number;
  active: number;
  admins: number;
  currentMonth: number;
  previousMonth: number;
  activeCurrentMonth: number;
  activePreviousMonth: number;
  bannedCurrentMonth: number;
  bannedPreviousMonth: number;
  adminsCurrentMonth: number;
  adminsPreviousMonth: number;
  beforeRange: number;
};

type PostSummaryRow = {
  total: number;
  active: number;
  hidden: number;
  banned: number;
  currentMonth: number;
  previousMonth: number;
  activeCurrentMonth: number;
  activePreviousMonth: number;
  hiddenCurrentMonth: number;
  hiddenPreviousMonth: number;
  bannedCurrentMonth: number;
  bannedPreviousMonth: number;
  activeBeforeRange: number;
};

type PendingReportSummaryRow = {
  pending: number;
  currentMonth: number;
  previousMonth: number;
};

let dashboardCache: CachedValue<Awaited<ReturnType<typeof buildAdminDashboard>>> | null =
  null;
let adminUserStatsCache: CachedValue<
  Awaited<ReturnType<typeof buildAdminUserStats>>
> | null = null;
let adminPostStatsCache: CachedValue<
  Awaited<ReturnType<typeof buildAdminPostStats>>
> | null = null;

const getCachedValue = async <T>(
  cache: CachedValue<T> | null,
  builder: () => Promise<T>,
  assign: (value: CachedValue<T>) => void,
) => {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.value;
  }

  const value = await builder();
  assign({
    value,
    expiresAt: Date.now() + ADMIN_STATS_CACHE_TTL_MS,
  });

  return value;
};

const getDailyUserCounts = (rangeStart: Date, rangeEndExclusive: Date) =>
  prisma.$queryRaw<DailyCountRow[]>`
    SELECT
      DATE("createdAt") AS "date",
      COUNT(*)::int AS "total"
    FROM "User"
    WHERE "createdAt" >= ${rangeStart}
      AND "createdAt" < ${rangeEndExclusive}
    GROUP BY DATE("createdAt")
    ORDER BY DATE("createdAt") ASC
  `;

const getDailyActivePostCounts = (rangeStart: Date, rangeEndExclusive: Date) =>
  prisma.$queryRaw<DailyCountRow[]>`
    SELECT
      DATE("createdAt") AS "date",
      COUNT(*)::int AS "total"
    FROM "PropertyPost"
    WHERE "status" = ${PostStatus.ACTIVE}::"PostStatus"
      AND "createdAt" >= ${rangeStart}
      AND "createdAt" < ${rangeEndExclusive}
    GROUP BY DATE("createdAt")
    ORDER BY DATE("createdAt") ASC
  `;

const getUserSummary = (
  previousMonthStart: Date,
  currentMonthStart: Date,
  rangeStart: Date,
) =>
  prisma.$queryRaw<UserSummaryRow[]>`
    SELECT
      COUNT(*)::int AS "total",
      COUNT(*) FILTER (WHERE "status" = ${UserStatus.BANNED}::"UserStatus")::int AS "banned",
      COUNT(*) FILTER (WHERE "status" = ${UserStatus.ACTIVE}::"UserStatus")::int AS "active",
      COUNT(*) FILTER (WHERE "role" = ${UserRole.ADMIN}::"UserRole")::int AS "admins",
      COUNT(*) FILTER (WHERE "createdAt" >= ${currentMonthStart})::int AS "currentMonth",
      COUNT(*) FILTER (
        WHERE "createdAt" >= ${previousMonthStart}
          AND "createdAt" < ${currentMonthStart}
      )::int AS "previousMonth",
      COUNT(*) FILTER (
        WHERE "status" = ${UserStatus.ACTIVE}::"UserStatus"
          AND "createdAt" >= ${currentMonthStart}
      )::int AS "activeCurrentMonth",
      COUNT(*) FILTER (
        WHERE "status" = ${UserStatus.ACTIVE}::"UserStatus"
          AND "createdAt" >= ${previousMonthStart}
          AND "createdAt" < ${currentMonthStart}
      )::int AS "activePreviousMonth",
      COUNT(*) FILTER (
        WHERE "status" = ${UserStatus.BANNED}::"UserStatus"
          AND "createdAt" >= ${currentMonthStart}
      )::int AS "bannedCurrentMonth",
      COUNT(*) FILTER (
        WHERE "status" = ${UserStatus.BANNED}::"UserStatus"
          AND "createdAt" >= ${previousMonthStart}
          AND "createdAt" < ${currentMonthStart}
      )::int AS "bannedPreviousMonth",
      COUNT(*) FILTER (
        WHERE "role" = ${UserRole.ADMIN}::"UserRole"
          AND "createdAt" >= ${currentMonthStart}
      )::int AS "adminsCurrentMonth",
      COUNT(*) FILTER (
        WHERE "role" = ${UserRole.ADMIN}::"UserRole"
          AND "createdAt" >= ${previousMonthStart}
          AND "createdAt" < ${currentMonthStart}
      )::int AS "adminsPreviousMonth",
      COUNT(*) FILTER (WHERE "createdAt" < ${rangeStart})::int AS "beforeRange"
    FROM "User"
  `;

const getPostSummary = (
  previousMonthStart: Date,
  currentMonthStart: Date,
  rangeStart: Date,
) =>
  prisma.$queryRaw<PostSummaryRow[]>`
    SELECT
      COUNT(*)::int AS "total",
      COUNT(*) FILTER (WHERE "status" = ${PostStatus.ACTIVE}::"PostStatus")::int AS "active",
      COUNT(*) FILTER (WHERE "status" = ${PostStatus.HIDDEN}::"PostStatus")::int AS "hidden",
      COUNT(*) FILTER (WHERE "status" = ${PostStatus.BANNED}::"PostStatus")::int AS "banned",
      COUNT(*) FILTER (WHERE "createdAt" >= ${currentMonthStart})::int AS "currentMonth",
      COUNT(*) FILTER (
        WHERE "createdAt" >= ${previousMonthStart}
          AND "createdAt" < ${currentMonthStart}
      )::int AS "previousMonth",
      COUNT(*) FILTER (
        WHERE "status" = ${PostStatus.ACTIVE}::"PostStatus"
          AND "createdAt" >= ${currentMonthStart}
      )::int AS "activeCurrentMonth",
      COUNT(*) FILTER (
        WHERE "status" = ${PostStatus.ACTIVE}::"PostStatus"
          AND "createdAt" >= ${previousMonthStart}
          AND "createdAt" < ${currentMonthStart}
      )::int AS "activePreviousMonth",
      COUNT(*) FILTER (
        WHERE "status" = ${PostStatus.HIDDEN}::"PostStatus"
          AND "createdAt" >= ${currentMonthStart}
      )::int AS "hiddenCurrentMonth",
      COUNT(*) FILTER (
        WHERE "status" = ${PostStatus.HIDDEN}::"PostStatus"
          AND "createdAt" >= ${previousMonthStart}
          AND "createdAt" < ${currentMonthStart}
      )::int AS "hiddenPreviousMonth",
      COUNT(*) FILTER (
        WHERE "status" = ${PostStatus.BANNED}::"PostStatus"
          AND "createdAt" >= ${currentMonthStart}
      )::int AS "bannedCurrentMonth",
      COUNT(*) FILTER (
        WHERE "status" = ${PostStatus.BANNED}::"PostStatus"
          AND "createdAt" >= ${previousMonthStart}
          AND "createdAt" < ${currentMonthStart}
      )::int AS "bannedPreviousMonth",
      COUNT(*) FILTER (
        WHERE "status" = ${PostStatus.ACTIVE}::"PostStatus"
          AND "createdAt" < ${rangeStart}
      )::int AS "activeBeforeRange"
    FROM "PropertyPost"
  `;

const getPendingReportSummary = (
  previousMonthStart: Date,
  currentMonthStart: Date,
) =>
  prisma.$queryRaw<PendingReportSummaryRow[]>`
    SELECT
      COUNT(*) FILTER (WHERE "status" = ${ReportStatus.PENDING}::"ReportStatus")::int AS "pending",
      COUNT(*) FILTER (
        WHERE "status" = ${ReportStatus.PENDING}::"ReportStatus"
          AND "createdAt" >= ${currentMonthStart}
      )::int AS "currentMonth",
      COUNT(*) FILTER (
        WHERE "status" = ${ReportStatus.PENDING}::"ReportStatus"
          AND "createdAt" >= ${previousMonthStart}
          AND "createdAt" < ${currentMonthStart}
      )::int AS "previousMonth"
    FROM "Report"
  `;

const mergeDailySeries = (
  dates: Date[],
  createdRows: DailyCountRow[],
  baseTotal: number,
) => {
  const createdMap = new Map(
    createdRows.map((row) => [makeDateKey(new Date(row.date)), row.total]),
  );
  let runningTotal = baseTotal;

  return dates.map((date) => {
    const dateKey = makeDateKey(date);
    const created = createdMap.get(dateKey) ?? 0;
    runningTotal += created;

    return {
      date: dateKey,
      label: makeViShortLabel(date),
      total: runningTotal,
      created,
    };
  });
};

const buildAdminDashboard = async () => {
  const today = startOfDay(new Date());
  const dates = Array.from({ length: 7 }, (_, index) => addDays(today, index - 6));
  const rangeStart = dates[0];
  const rangeEndExclusive = addDays(today, 1);
  const { previousMonthStart, currentMonthStart } = previousMonthRange(today);

  const [[userSummary], [postSummary], [reportSummary], userCreatedRows, postCreatedRows] =
    await Promise.all([
      getUserSummary(previousMonthStart, currentMonthStart, rangeStart),
      getPostSummary(previousMonthStart, currentMonthStart, rangeStart),
      getPendingReportSummary(previousMonthStart, currentMonthStart),
      getDailyUserCounts(rangeStart, rangeEndExclusive),
      getDailyActivePostCounts(rangeStart, rangeEndExclusive),
    ]);

  return {
    stats: {
      users: {
        total: userSummary.total,
        banned: userSummary.banned,
        deltaPercent: calculatePercentChange(
          userSummary.currentMonth,
          userSummary.previousMonth,
        ),
      },
      posts: {
        total: postSummary.total,
        deltaPercent: calculatePercentChange(
          postSummary.currentMonth,
          postSummary.previousMonth,
        ),
      },
      activePosts: {
        total: postSummary.active,
        deltaPercent: calculatePercentChange(
          postSummary.activeCurrentMonth,
          postSummary.activePreviousMonth,
        ),
      },
      hiddenPosts: {
        total: postSummary.hidden + postSummary.banned,
        deltaPercent: calculatePercentChange(
          postSummary.hiddenCurrentMonth + postSummary.bannedCurrentMonth,
          postSummary.hiddenPreviousMonth + postSummary.bannedPreviousMonth,
        ),
      },
      pendingReports: {
        total: reportSummary.pending,
        deltaPercent: calculatePercentChange(
          reportSummary.currentMonth,
          reportSummary.previousMonth,
        ),
      },
    },
    charts: {
      users: mergeDailySeries(dates, userCreatedRows, userSummary.beforeRange),
      posts: mergeDailySeries(dates, postCreatedRows, postSummary.activeBeforeRange),
    },
  };
};

export const getAdminDashboard = async () =>
  getCachedValue(dashboardCache, buildAdminDashboard, (value) => {
    dashboardCache = value;
  });

export type AdminUserListFilter = {
  page: number;
  limit: number;
  keyword?: string;
  role?: UserRole;
  status?: UserStatus;
  dateFrom?: string;
  dateTo?: string;
};

const buildDateRange = (
  dateFrom?: string,
  dateTo?: string,
): Prisma.DateTimeFilter | undefined => {
  if (!dateFrom && !dateTo) {
    return undefined;
  }

  if (dateFrom && dateTo && dateFrom >= dateTo) {
    return {
      gte: new Date(`${dateFrom}T00:00:00.000+07:00`),
      lte: new Date(`${dateFrom}T00:00:00.000+07:00`),
    };
  }

  return {
    ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00.000+07:00`) } : {}),
    ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999+07:00`) } : {}),
  };
};

const buildAdminUserStats = async () => {
  const today = startOfDay(new Date());
  const { previousMonthStart, currentMonthStart } = previousMonthRange(today);
  const [userSummary] = await getUserSummary(
    previousMonthStart,
    currentMonthStart,
    today,
  );

  return {
    totalUsers: {
      total: userSummary.total,
      deltaPercent: calculatePercentChange(
        userSummary.currentMonth,
        userSummary.previousMonth,
      ),
    },
    newUsersThisMonth: {
      total: userSummary.currentMonth,
      deltaPercent: calculatePercentChange(
        userSummary.currentMonth,
        userSummary.previousMonth,
      ),
    },
    activeUsers: {
      total: userSummary.active,
      deltaPercent: calculatePercentChange(
        userSummary.activeCurrentMonth,
        userSummary.activePreviousMonth,
      ),
    },
    bannedUsers: {
      total: userSummary.banned,
      deltaPercent: calculatePercentChange(
        userSummary.bannedCurrentMonth,
        userSummary.bannedPreviousMonth,
      ),
    },
    admins: {
      total: userSummary.admins,
      deltaPercent: calculatePercentChange(
        userSummary.adminsCurrentMonth,
        userSummary.adminsPreviousMonth,
      ),
    },
  };
};

export const getAdminUsers = async ({
  page,
  limit,
  keyword,
  role,
  status,
  dateFrom,
  dateTo,
}: AdminUserListFilter) => {
  const where: Prisma.UserWhereInput = {};

  if (keyword) {
    where.OR = [
      {
        fullName: {
          contains: keyword,
          mode: "insensitive",
        },
      },
      {
        email: {
          contains: keyword,
          mode: "insensitive",
        },
      },
      {
        phone: {
          contains: keyword,
          mode: "insensitive",
        },
      },
    ];
  }

  if (role) {
    where.role = role;
  }

  if (status) {
    where.status = status;
  }

  const createdAt = buildDateRange(dateFrom, dateTo);
  if (createdAt) {
    where.createdAt = createdAt;
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.user.count({ where }),
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

export const getAdminUsersStats = async () =>
  getCachedValue(adminUserStatsCache, buildAdminUserStats, (value) => {
    adminUserStatsCache = value;
  });

export const getAdminUserDetail = async (id: string) => {
  return prisma.user.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      avatarUrl: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      posts: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          posts: true,
          reports: true,
          comments: true,
          savedPosts: true,
        },
      },
    },
  });
};

export const updateAdminUser = async (
  id: string,
  input: {
    role?: UserRole;
    status?: UserStatus;
  },
  actorId: string,
) => {
  const data: Prisma.UserUpdateInput = {};

  if (input.role) {
    data.role = input.role;
  }

  if (input.status) {
    if (id === actorId && input.status === UserStatus.BANNED) {
      throw new Error("Admin cannot ban their own account.");
    }
    data.status = input.status;
  }

  if (!Object.keys(data).length) {
    throw new Error("No user fields to update.");
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      avatarUrl: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      posts: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          posts: true,
          reports: true,
          comments: true,
          savedPosts: true,
        },
      },
    },
  });

  if (input.status === UserStatus.BANNED) {
    await revokeAllUserRefreshTokens(id);
  }

  await invalidateCachedAuthUser(id);

  return updatedUser;
};

export type AdminPostListFilter = {
  page: number;
  limit: number;
  keyword?: string;
  status?: PostStatus;
  propertyType?: PropertyType;
  postType?: PostType;
  minPrice?: number;
  maxPrice?: number;
};

const buildAdminPostStats = async () => {
  const today = startOfDay(new Date());
  const { previousMonthStart, currentMonthStart } = previousMonthRange(today);
  const [[postSummary], [reportSummary]] = await Promise.all([
    getPostSummary(previousMonthStart, currentMonthStart, today),
    getPendingReportSummary(previousMonthStart, currentMonthStart),
  ]);

  return {
    totalPosts: {
      total: postSummary.total,
      deltaPercent: calculatePercentChange(
        postSummary.currentMonth,
        postSummary.previousMonth,
      ),
    },
    activePosts: {
      total: postSummary.active,
      deltaPercent: calculatePercentChange(
        postSummary.activeCurrentMonth,
        postSummary.activePreviousMonth,
      ),
    },
    hiddenPosts: {
      total: postSummary.hidden,
      deltaPercent: calculatePercentChange(
        postSummary.hiddenCurrentMonth,
        postSummary.hiddenPreviousMonth,
      ),
    },
    bannedPosts: {
      total: postSummary.banned,
      deltaPercent: calculatePercentChange(
        postSummary.bannedCurrentMonth,
        postSummary.bannedPreviousMonth,
      ),
    },
    pendingReports: {
      total: reportSummary.pending,
      deltaPercent: calculatePercentChange(
        reportSummary.currentMonth,
        reportSummary.previousMonth,
      ),
    },
  };
};

export const getAdminPosts = async ({
  page,
  limit,
  keyword,
  status,
  propertyType,
  postType,
  minPrice,
  maxPrice,
}: AdminPostListFilter) => {
  const where: Prisma.PropertyPostWhereInput = {};

  if (keyword) {
    where.OR = [
      { id: { contains: keyword, mode: "insensitive" } },
      { title: { contains: keyword, mode: "insensitive" } },
      { description: { contains: keyword, mode: "insensitive" } },
      { address: { contains: keyword, mode: "insensitive" } },
      { city: { contains: keyword, mode: "insensitive" } },
      { district: { contains: keyword, mode: "insensitive" } },
      {
        author: {
          OR: [
            { fullName: { contains: keyword, mode: "insensitive" } },
            { email: { contains: keyword, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  if (status) {
    where.status = status;
  }

  if (propertyType) {
    where.propertyType = propertyType;
  }

  if (postType) {
    where.postType = postType;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {
      ...(minPrice !== undefined ? { gte: minPrice } : {}),
      ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
    };
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.propertyPost.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        area: true,
        address: true,
        city: true,
        district: true,
        ward: true,
        propertyType: true,
        postType: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
        images: {
          orderBy: {
            order: "asc",
          },
          take: 1,
          select: {
            id: true,
            imageUrl: true,
            order: true,
          },
        },
        _count: {
          select: {
            reports: true,
            comments: true,
            savedBy: true,
          },
        },
      },
    }),
    prisma.propertyPost.count({ where }),
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

export const getAdminPostsStats = async () =>
  getCachedValue(adminPostStatsCache, buildAdminPostStats, (value) => {
    adminPostStatsCache = value;
  });

