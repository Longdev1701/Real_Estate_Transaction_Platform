import { ReportStatus, type Prisma } from "@prisma/client";

import { prisma } from "../prisma/prisma.service.js";

export type AdminReportListFilter = {
  page: number;
  limit: number;
  keyword?: string;
  status?: ReportStatus;
};

export type AdminReportStatsFilter = {
  keyword?: string;
};

const adminReportInclude = {
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
} satisfies Prisma.ReportInclude;

const buildAdminReportsWhere = ({
  keyword,
  status,
}: {
  keyword?: string;
  status?: ReportStatus;
}) => {
  const where: Prisma.ReportWhereInput = {};

  if (keyword) {
    where.OR = [
      { id: { contains: keyword, mode: "insensitive" } },
      { reason: { contains: keyword, mode: "insensitive" } },
      { description: { contains: keyword, mode: "insensitive" } },
      { appealMessage: { contains: keyword, mode: "insensitive" } },
      { appealEvidence: { contains: keyword, mode: "insensitive" } },
      {
        reporter: {
          OR: [
            { fullName: { contains: keyword, mode: "insensitive" } },
            { email: { contains: keyword, mode: "insensitive" } },
          ],
        },
      },
      {
        post: {
          OR: [
            { id: { contains: keyword, mode: "insensitive" } },
            { title: { contains: keyword, mode: "insensitive" } },
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
          ],
        },
      },
    ];
  }

  if (status) {
    where.status = status;
  }

  return where;
};

export const getAdminReports = async ({
  page,
  limit,
  keyword,
  status,
}: AdminReportListFilter) => {
  const where = buildAdminReportsWhere({ keyword, status });
  const skip = (page - 1) * limit;

  const [items, total] = await prisma.$transaction([
    prisma.report.findMany({
      where,
      include: adminReportInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.report.count({ where }),
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

export const getAdminReportsStats = async ({
  keyword,
}: AdminReportStatsFilter) => {
  const where = buildAdminReportsWhere({ keyword });

  const [total, pending, resolved, rejected] = await prisma.$transaction([
    prisma.report.count({ where }),
    prisma.report.count({
      where: {
        AND: [where, { status: ReportStatus.PENDING }],
      },
    }),
    prisma.report.count({
      where: {
        AND: [where, { status: ReportStatus.RESOLVED }],
      },
    }),
    prisma.report.count({
      where: {
        AND: [where, { status: ReportStatus.REJECTED }],
      },
    }),
  ]);

  return {
    total,
    pending,
    resolved,
    rejected,
  };
};
