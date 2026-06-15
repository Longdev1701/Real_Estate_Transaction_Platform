import { PostStatus, PostType, PropertyType } from "@prisma/client";

import { prisma } from "../prisma/prisma.service.js";

const HOME_CACHE_TTL_MS = 30_000;
type HomeData = Awaited<ReturnType<typeof fetchHomeData>>;

let homeCache:
  | {
      expiresAt: number;
      data: HomeData;
    }
  | null = null;
let homeDataInFlight: Promise<HomeData> | null = null;

export const clearHomeCache = () => {
  homeCache = null;
  homeDataInFlight = null;
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
  SHOPHOUSE: "Mặt bằng",
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

  if (homeDataInFlight) {
    return homeDataInFlight;
  }

  homeDataInFlight = fetchHomeData()
    .then((data) => {
      homeCache = {
        data,
        expiresAt: Date.now() + HOME_CACHE_TTL_MS,
      };

      return data;
    })
    .finally(() => {
      homeDataInFlight = null;
    });

  return homeDataInFlight;
};

const fetchHomeData = async () => {
  const activePostWhere = {
    status: PostStatus.ACTIVE,
  } as const;

  const [
    featuredPosts,
    activePostTypeCounts,
    userCount,
    propertyTypeCounts,
    cityCounts,
  ] = await prisma.$transaction([
    prisma.propertyPost.findMany({
      where: activePostWhere,
      include: postInclude,
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
    prisma.propertyPost.groupBy({
      by: ["postType"],
      where: activePostWhere,
      _count: {
        postType: true,
      },
    }),
    prisma.user.count(),
    prisma.propertyPost.groupBy({
      by: ["propertyType"],
      where: activePostWhere,
      _count: {
        propertyType: true,
      },
    }),
    prisma.propertyPost.groupBy({
      by: ["city"],
      where: activePostWhere,
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
  const countByPostType = new Map(
    activePostTypeCounts.map((item) => [item.postType, item._count.postType]),
  );
  const sellPostCount = countByPostType.get(PostType.SELL) ?? 0;
  const rentPostCount = countByPostType.get(PostType.RENT) ?? 0;
  const activePostCount = sellPostCount + rentPostCount;

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
