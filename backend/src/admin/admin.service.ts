import {
  PostStatus,
  PostType,
  PropertyType,
  ReportStatus,
  UserRole,
  UserStatus,
  type Prisma,
} from "@prisma/client";

import { prisma } from "../prisma/prisma.service.js";



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

const countByDay = async (
  model: "user" | "propertyPost",
  dates: Date[],
  options?: {
    where?: Record<string, unknown>;
  },
) => {
  const result = await Promise.all(
    dates.map(async (date) => {
      const nextDate = addDays(date, 1);
      const where = {
        ...options?.where,
        createdAt: {
          gte: date,
          lt: nextDate,
        },
      };

      const count =
        model === "user"
          ? await prisma.user.count({ where })
          : await prisma.propertyPost.count({ where });

      return {
        date: makeDateKey(date),
        label: makeViShortLabel(date),
        count,
      };
    }),
  );

  return result;
};

export const getAdminDashboard = async () => {
  const today = startOfDay(new Date());
  const dates = Array.from({ length: 7 }, (_, index) =>
    addDays(today, index - 6),
  );
  const { previousMonthStart, currentMonthStart } = previousMonthRange(today);

  const [
    totalUsers,
    bannedUsers,
    totalPosts,
    activePosts,
    hiddenPosts,
    pendingReports,
    usersThisMonth,
    usersPreviousMonth,
    postsThisMonth,
    postsPreviousMonth,
    activePostsThisMonth,
    activePostsPreviousMonth,
    hiddenPostsThisMonth,
    hiddenPostsPreviousMonth,
    reportsThisMonth,
    reportsPreviousMonth,
    newUsersByDay,
    newPostsByDay,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: UserStatus.BANNED } }),
    prisma.propertyPost.count(),
    prisma.propertyPost.count({ where: { status: PostStatus.ACTIVE } }),
    prisma.propertyPost.count({
      where: { status: { in: [PostStatus.HIDDEN, PostStatus.BANNED] } },
    }),
    prisma.report.count({ where: { status: ReportStatus.PENDING } }),
    prisma.user.count({ where: { createdAt: { gte: currentMonthStart } } }),
    prisma.user.count({
      where: {
        createdAt: {
          gte: previousMonthStart,
          lt: currentMonthStart,
        },
      },
    }),
    prisma.propertyPost.count({
      where: { createdAt: { gte: currentMonthStart } },
    }),
    prisma.propertyPost.count({
      where: {
        createdAt: {
          gte: previousMonthStart,
          lt: currentMonthStart,
        },
      },
    }),
    prisma.propertyPost.count({
      where: {
        status: PostStatus.ACTIVE,
        createdAt: { gte: currentMonthStart },
      },
    }),
    prisma.propertyPost.count({
      where: {
        status: PostStatus.ACTIVE,
        createdAt: {
          gte: previousMonthStart,
          lt: currentMonthStart,
        },
      },
    }),
    prisma.propertyPost.count({
      where: {
        status: { in: [PostStatus.HIDDEN, PostStatus.BANNED] },
        createdAt: { gte: currentMonthStart },
      },
    }),
    prisma.propertyPost.count({
      where: {
        status: { in: [PostStatus.HIDDEN, PostStatus.BANNED] },
        createdAt: {
          gte: previousMonthStart,
          lt: currentMonthStart,
        },
      },
    }),
    prisma.report.count({
      where: {
        status: ReportStatus.PENDING,
        createdAt: { gte: currentMonthStart },
      },
    }),
    prisma.report.count({
      where: {
        status: ReportStatus.PENDING,
        createdAt: {
          gte: previousMonthStart,
          lt: currentMonthStart,
        },
      },
    }),
    countByDay("user", dates),
    countByDay("propertyPost", dates),
  ]);

  const cumulativeUserSeries = await Promise.all(
    dates.map(async (date) => ({
      date: makeDateKey(date),
      label: makeViShortLabel(date),
      total: await prisma.user.count({
        where: {
          createdAt: {
            lt: addDays(date, 1),
          },
        },
      }),
    })),
  );

  const activePostSeries = await Promise.all(
    dates.map(async (date) => ({
      date: makeDateKey(date),
      label: makeViShortLabel(date),
      total: await prisma.propertyPost.count({
        where: {
          status: PostStatus.ACTIVE,
          createdAt: {
            lt: addDays(date, 1),
          },
        },
      }),
    })),
  );

  return {
    stats: {
      users: {
        total: totalUsers,
        banned: bannedUsers,
        deltaPercent: calculatePercentChange(usersThisMonth, usersPreviousMonth),
      },
      posts: {
        total: totalPosts,
        deltaPercent: calculatePercentChange(postsThisMonth, postsPreviousMonth),
      },
      activePosts: {
        total: activePosts,
        deltaPercent: calculatePercentChange(activePostsThisMonth, activePostsPreviousMonth),
      },
      hiddenPosts: {
        total: hiddenPosts,
        deltaPercent: calculatePercentChange(hiddenPostsThisMonth, hiddenPostsPreviousMonth),
      },
      pendingReports: {
        total: pendingReports,
        deltaPercent: calculatePercentChange(reportsThisMonth, reportsPreviousMonth),
      },
    },
    charts: {
      users: cumulativeUserSeries.map((item, index) => ({
        ...item,
        created: newUsersByDay[index]?.count ?? 0,
      })),
      posts: activePostSeries.map((item, index) => ({
        ...item,
        created: newPostsByDay[index]?.count ?? 0,
      })),
    },
  };
};

export type AdminUserListFilter = {
  page: number;
  limit: number;
  keyword?: string;
  role?: UserRole;
  status?: UserStatus;
};

export const getAdminUsers = async ({
  page,
  limit,
  keyword,
  role,
  status,
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

  const today = startOfDay(new Date());
  const { previousMonthStart, currentMonthStart } = previousMonthRange(today);
  const skip = (page - 1) * limit;

  const [
    items,
    total,
    totalUsers,
    usersThisMonth,
    usersPreviousMonth,
    activeUsers,
    activeUsersThisMonth,
    activeUsersPreviousMonth,
    bannedUsers,
    bannedUsersThisMonth,
    bannedUsersPreviousMonth,
    admins,
    adminsThisMonth,
    adminsPreviousMonth,
  ] = await Promise.all([
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
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: currentMonthStart } } }),
    prisma.user.count({
      where: {
        createdAt: {
          gte: previousMonthStart,
          lt: currentMonthStart,
        },
      },
    }),
    prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
    prisma.user.count({
      where: {
        status: UserStatus.ACTIVE,
        createdAt: { gte: currentMonthStart },
      },
    }),
    prisma.user.count({
      where: {
        status: UserStatus.ACTIVE,
        createdAt: {
          gte: previousMonthStart,
          lt: currentMonthStart,
        },
      },
    }),
    prisma.user.count({ where: { status: UserStatus.BANNED } }),
    prisma.user.count({
      where: {
        status: UserStatus.BANNED,
        createdAt: { gte: currentMonthStart },
      },
    }),
    prisma.user.count({
      where: {
        status: UserStatus.BANNED,
        createdAt: {
          gte: previousMonthStart,
          lt: currentMonthStart,
        },
      },
    }),
    prisma.user.count({ where: { role: UserRole.ADMIN } }),
    prisma.user.count({
      where: {
        role: UserRole.ADMIN,
        createdAt: { gte: currentMonthStart },
      },
    }),
    prisma.user.count({
      where: {
        role: UserRole.ADMIN,
        createdAt: {
          gte: previousMonthStart,
          lt: currentMonthStart,
        },
      },
    }),
  ]);

  return {
    items,
    stats: {
      totalUsers: {
        total: totalUsers,
        deltaPercent: calculatePercentChange(usersThisMonth, usersPreviousMonth),
      },
      newUsersThisMonth: {
        total: usersThisMonth,
        deltaPercent: calculatePercentChange(usersThisMonth, usersPreviousMonth),
      },
      activeUsers: {
        total: activeUsers,
        deltaPercent: calculatePercentChange(activeUsersThisMonth, activeUsersPreviousMonth),
      },
      bannedUsers: {
        total: bannedUsers,
        deltaPercent: calculatePercentChange(bannedUsersThisMonth, bannedUsersPreviousMonth),
      },
      admins: {
        total: admins,
        deltaPercent: calculatePercentChange(adminsThisMonth, adminsPreviousMonth),
      },
    },
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasMore: page * limit < total,
    },
  };
};

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

  return prisma.user.update({
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

  const today = startOfDay(new Date());
  const { previousMonthStart, currentMonthStart } = previousMonthRange(today);
  const skip = (page - 1) * limit;

  const [
    items,
    total,
    totalPosts,
    postsThisMonth,
    postsPreviousMonth,
    activePosts,
    activePostsThisMonth,
    activePostsPreviousMonth,
    hiddenPosts,
    hiddenPostsThisMonth,
    hiddenPostsPreviousMonth,
    bannedPosts,
    bannedPostsThisMonth,
    bannedPostsPreviousMonth,
    pendingReports,
    pendingReportsThisMonth,
    pendingReportsPreviousMonth,
  ] = await Promise.all([
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
    prisma.propertyPost.count(),
    prisma.propertyPost.count({
      where: {
        createdAt: { gte: currentMonthStart },
      },
    }),
    prisma.propertyPost.count({
      where: {
        createdAt: {
          gte: previousMonthStart,
          lt: currentMonthStart,
        },
      },
    }),
    prisma.propertyPost.count({ where: { status: PostStatus.ACTIVE } }),
    prisma.propertyPost.count({
      where: {
        status: PostStatus.ACTIVE,
        createdAt: { gte: currentMonthStart },
      },
    }),
    prisma.propertyPost.count({
      where: {
        status: PostStatus.ACTIVE,
        createdAt: {
          gte: previousMonthStart,
          lt: currentMonthStart,
        },
      },
    }),
    prisma.propertyPost.count({ where: { status: PostStatus.HIDDEN } }),
    prisma.propertyPost.count({
      where: {
        status: PostStatus.HIDDEN,
        createdAt: { gte: currentMonthStart },
      },
    }),
    prisma.propertyPost.count({
      where: {
        status: PostStatus.HIDDEN,
        createdAt: {
          gte: previousMonthStart,
          lt: currentMonthStart,
        },
      },
    }),
    prisma.propertyPost.count({ where: { status: PostStatus.BANNED } }),
    prisma.propertyPost.count({
      where: {
        status: PostStatus.BANNED,
        createdAt: { gte: currentMonthStart },
      },
    }),
    prisma.propertyPost.count({
      where: {
        status: PostStatus.BANNED,
        createdAt: {
          gte: previousMonthStart,
          lt: currentMonthStart,
        },
      },
    }),
    prisma.report.count({ where: { status: ReportStatus.PENDING } }),
    prisma.report.count({
      where: {
        status: ReportStatus.PENDING,
        createdAt: { gte: currentMonthStart },
      },
    }),
    prisma.report.count({
      where: {
        status: ReportStatus.PENDING,
        createdAt: {
          gte: previousMonthStart,
          lt: currentMonthStart,
        },
      },
    }),
  ]);

  return {
    items,
    stats: {
      totalPosts: {
        total: totalPosts,
        deltaPercent: calculatePercentChange(postsThisMonth, postsPreviousMonth),
      },
      activePosts: {
        total: activePosts,
        deltaPercent: calculatePercentChange(activePostsThisMonth, activePostsPreviousMonth),
      },
      hiddenPosts: {
        total: hiddenPosts,
        deltaPercent: calculatePercentChange(hiddenPostsThisMonth, hiddenPostsPreviousMonth),
      },
      bannedPosts: {
        total: bannedPosts,
        deltaPercent: calculatePercentChange(bannedPostsThisMonth, bannedPostsPreviousMonth),
      },
      pendingReports: {
        total: pendingReports,
        deltaPercent: calculatePercentChange(pendingReportsThisMonth, pendingReportsPreviousMonth),
      },
    },
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasMore: page * limit < total,
    },
  };
};

