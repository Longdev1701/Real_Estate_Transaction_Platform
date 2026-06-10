import { PostStatus, PostType, PropertyType } from "@prisma/client";

import { prisma } from "../prisma/prisma.service.js";

const HOME_CACHE_TTL_MS = 30_000;
let homeCache:
  | {
      expiresAt: number;
      data: Awaited<ReturnType<typeof fetchHomeData>>;
    }
  | null = null;

export const clearHomeCache = () => {
  homeCache = null;
};

const postInclude = {
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
      order: "asc" as const,
    },
  },
};

const propertyTypeLabels: Record<PropertyType, string> = {
  APARTMENT: "Căn hộ",
  HOUSE: "Nhà riêng",
  LAND: "Đất",
  ROOM: "Phòng trọ",
  VILLA: "Biệt thự",
  OFFICE: "Văn phòng",
  SHOPHOUSE: "Shophouse / Mặt bằng kinh doanh",
  WAREHOUSE: "Kho / Xưởng",
};

const sortPropertyTypes: PropertyType[] = [
  PropertyType.APARTMENT,
  PropertyType.HOUSE,
  PropertyType.LAND,
  PropertyType.ROOM,
  PropertyType.VILLA,
  PropertyType.OFFICE,
  PropertyType.SHOPHOUSE,
  PropertyType.WAREHOUSE,
];

export const getHomeData = async () => {
  const now = Date.now();
  if (homeCache && homeCache.expiresAt > now) {
    return homeCache.data;
  }

  const data = await fetchHomeData();
  homeCache = {
    data,
    expiresAt: now + HOME_CACHE_TTL_MS,
  };

  return data;
};

const fetchHomeData = async () => {
  const [
    featuredPosts,
    activePostCount,
    sellPostCount,
    rentPostCount,
    userCount,
    propertyTypeCounts,
    cityCounts,
  ] = await prisma.$transaction([
    prisma.propertyPost.findMany({
      where: {
        status: PostStatus.ACTIVE,
      },
      include: postInclude,
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
    prisma.propertyPost.count({
      where: {
        status: PostStatus.ACTIVE,
      },
    }),
    prisma.propertyPost.count({
      where: {
        status: PostStatus.ACTIVE,
        postType: PostType.SELL,
      },
    }),
    prisma.propertyPost.count({
      where: {
        status: PostStatus.ACTIVE,
        postType: PostType.RENT,
      },
    }),
    prisma.user.count(),
    prisma.propertyPost.groupBy({
      by: ["propertyType"],
      where: {
        status: PostStatus.ACTIVE,
      },
      _count: {
        propertyType: true,
      },
    }),
    prisma.propertyPost.groupBy({
      by: ["city"],
      where: {
        status: PostStatus.ACTIVE,
      },
      _count: {
        city: true,
      },
      orderBy: {
        _count: {
          city: "desc",
        },
      },
      take: 4,
    }),
  ]);

  const countByPropertyType = new Map(
    propertyTypeCounts.map((item) => [item.propertyType, item._count.propertyType]),
  );

  return {
    stats: {
      activePostCount,
      sellPostCount,
      rentPostCount,
      userCount,
    },
    featuredPosts,
    categories: sortPropertyTypes.map((propertyType) => ({
      propertyType,
      label: propertyTypeLabels[propertyType],
      count: countByPropertyType.get(propertyType) ?? 0,
    })),
    popularLocations: cityCounts.map((item) => ({
      city: item.city,
      count: item._count.city,
    })),
  };
};
