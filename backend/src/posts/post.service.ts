import type { Express } from "express";
import type { Prisma } from "@prisma/client";

import { PostStatus, ReportStatus, UserRole } from "@prisma/client";

import type { AuthenticatedUser } from "../types/auth.type.js";

import { AppError } from "../middlewares/error.middleware.js";
import { prisma } from "../prisma/prisma.service.js";
import { redisClient } from "../config/redis.js";
import { clearHomeCache } from "../home/home.service.js";
import { deleteImageByUrl, uploadPostImages } from "../services/upload.service.js";
import type {
  CreatePostInput,
  PostFilterInput,
  UpdatePostInput,
} from "./post.validation.js";

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
      order: "asc",
    },
  },
  features: {
    include: {
      feature: true,
    },
  },
  _count: {
    select: {
      likes: true,
      comments: true,
      images: true,
    },
  },
} satisfies Prisma.PropertyPostInclude;

const postListSelect = {
  id: true,
  authorId: true,
  title: true,
  description: true,
  price: true,
  area: true,
  address: true,
  city: true,
  district: true,
  ward: true,
  latitude: true,
  longitude: true,
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
      order: "asc" as const,
    },
    select: {
      id: true,
      imageUrl: true,
      caption: true,
      order: true,
    },
  },
  _count: {
    select: {
      images: true,
      comments: true,
      likes: true,
    },
  },
} satisfies Prisma.PropertyPostSelect;

const relatedPostSelect = {
  id: true,
  title: true,
  price: true,
  area: true,
  address: true,
  city: true,
  district: true,
  ward: true,
  images: {
    orderBy: {
      order: "asc" as const,
    },
    take: 1,
    select: {
      imageUrl: true,
    },
  },
} satisfies Prisma.PropertyPostSelect;

type PostListItem = Prisma.PropertyPostGetPayload<{
  select: typeof postListSelect;
}>;

type PostDetailItem = Prisma.PropertyPostGetPayload<{
  include: typeof postInclude;
}>;

type PostBanContext = {
  reportId: string;
  reason: string;
  description?: string | null;
  resolvedAt?: Date | null;
  appealStatus: "NONE" | "PENDING" | "REVIEWED";
  appealMessage?: string | null;
  appealEvidence?: string | null;
  appealedAt?: Date | null;
};

const POSTS_CACHE_TTL_MS = 15_000;
const postsCache = new Map<
  string,
  {
    expiresAt: number;
    data: {
      items: Array<Record<string, unknown>>;
      meta: {
        page: number;
        limit: number;
        total: number | null;
        totalPages: number | null;
        hasMore: boolean;
      };
    };
  }
>();

const localPostDetailCache = new Map<string, { expiresAt: number; data: any }>();

export const clearPostsCache = () => {
  postsCache.clear();
  localPostDetailCache.clear();
};

export const invalidatePostDetailCache = async (postId: string) => {
  const cacheKey = `posts:detail:base:${postId}`;
  localPostDetailCache.delete(cacheKey);
  if (redisClient?.isOpen) {
    try {
      await redisClient.del(cacheKey);
    } catch (err) {
      console.warn("Failed to delete Redis cache key:", err);
    }
  }
};

const invalidateCaches = (postId?: string) => {
  clearPostsCache();
  clearHomeCache();
  if (postId) {
    invalidatePostDetailCache(postId).catch(console.error);
  }
};

const ensureAuthenticated = (user?: AuthenticatedUser) => {
  if (!user) {
    throw new AppError("Authentication required.", 401);
  }

  return user;
};

const canManagePost = (user: AuthenticatedUser, authorId: string) =>
  user.id === authorId;

const getSavedPostIds = async (postIds: string[], user?: AuthenticatedUser) => {
  if (!user || postIds.length === 0) {
    return new Set<string>();
  }

  const savedPosts = await prisma.savedPost.findMany({
    where: {
      userId: user.id,
      postId: {
        in: postIds,
      },
    },
    select: {
      postId: true,
    },
  });

  return new Set(savedPosts.map((item) => item.postId));
};

const getLikedPostIds = async (postIds: string[], user?: AuthenticatedUser) => {
  if (!user || postIds.length === 0) {
    return new Set<string>();
  }

  const likedPosts = await prisma.postLike.findMany({
    where: {
      userId: user.id,
      postId: {
        in: postIds,
      },
    },
    select: {
      postId: true,
    },
  });

  return new Set(likedPosts.map((item) => item.postId));
};

const attachSavedStateToListItems = async (
  items: PostListItem[],
  user?: AuthenticatedUser,
) => {
  const postIds = items.map((item) => item.id);
  const [savedPostIds, likedPostIds] = await Promise.all([
    getSavedPostIds(postIds, user),
    getLikedPostIds(postIds, user),
  ]);

  return items.map((item) => {
    const { _count, ...rest } = item;

    return {
      ...rest,
      imageCount: _count.images,
      commentCount: _count.comments,
      likeCount: _count.likes,
      isSaved: savedPostIds.has(item.id),
      isLiked: likedPostIds.has(item.id),
    };
  });
};

const attachSavedStateToDetailItem = async (
  post: PostDetailItem,
  user?: AuthenticatedUser,
) => {
  const savedPostIds = await getSavedPostIds([post.id], user);
  const likedPostIds = await getLikedPostIds([post.id], user);
  const { features, _count, ...rest } = post;

  return {
    ...rest,
    features: features?.map((f: any) => f.feature) ?? [],
    imageCount: _count.images,
    commentCount: _count.comments,
    likeCount: _count.likes,
    isSaved: savedPostIds.has(post.id),
    isLiked: likedPostIds.has(post.id),
  };
};

const toOptionalString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const toOptionalNumber = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : undefined;
};

const toPaginationNumber = (
  value: unknown,
  fallback: number,
  min: number,
  max?: number,
) => {
  const numberValue = toOptionalNumber(value) ?? fallback;
  const roundedValue = Math.trunc(numberValue);
  const minBounded = Math.max(min, roundedValue);

  return max === undefined ? minBounded : Math.min(max, minBounded);
};

const parseImageMetadata = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  if (typeof value !== "string") {
    throw new AppError("imageMetadata must be a JSON string.", 400);
  }

  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(value);
  } catch {
    throw new AppError("imageMetadata must be valid JSON.", 400);
  }

  if (!Array.isArray(parsedValue)) {
    throw new AppError("imageMetadata must be an array.", 400);
  }

  return parsedValue.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new AppError(`imageMetadata[${index}] is invalid.`, 400);
    }

    const record = item as Record<string, unknown>;
    const caption =
      typeof record.caption === "string" && record.caption.trim()
        ? record.caption.trim()
        : undefined;
    const order =
      record.order === undefined ? undefined : Number(record.order);

    if (caption && caption.length > 255) {
      throw new AppError(`imageMetadata[${index}].caption is too long.`, 400);
    }

    if (
      order !== undefined &&
      (!Number.isInteger(order) || order < 0 || !Number.isFinite(order))
    ) {
      throw new AppError(`imageMetadata[${index}].order is invalid.`, 400);
    }

    return { caption, order };
  });
};

const validateImageMetadataCount = (
  files: Express.Multer.File[],
  imageMetadata: Array<{ caption?: string; order?: number }>,
) => {
  if (imageMetadata.length > files.length) {
    throw new AppError(
      "imageMetadata cannot contain more items than uploaded images.",
      400,
    );
  }
};

const getPostOwnership = async (postId: string) => {
  const post = await prisma.propertyPost.findUnique({
    where: {
      id: postId,
    },
    select: {
      id: true,
      authorId: true,
      status: true,
    },
  });

  if (!post) {
    throw new AppError("Post not found.", 404);
  }

  return post;
};

export const createPost = async (
  input: CreatePostInput,
  files: Express.Multer.File[] = [],
  imageMetadataValue?: unknown,
  user?: AuthenticatedUser,
) => {
  const actor = ensureAuthenticated(user);
  const imageMetadata = parseImageMetadata(imageMetadataValue);
  validateImageMetadataCount(files, imageMetadata);
  if (files.length > 10) {
    throw new AppError("Mỗi bài đăng chỉ được tối đa 10 ảnh.", 400);
  }
  const { imageMetadata: _imageMetadata, featureIds, ...postData } = input;
  const post = await prisma.propertyPost.create({
    data: {
      ...postData,
      authorId: actor.id,
      status: PostStatus.ACTIVE,
      features: featureIds && featureIds.length > 0 ? {
        create: featureIds.map((id) => ({ featureId: id })),
      } : undefined,
    },
  });

  try {
    if (files.length > 0) {
      const uploadedImages = await uploadPostImages(post.id, files, imageMetadata);

      await prisma.propertyImage.createMany({
        data: uploadedImages.map((image) => ({
          postId: post.id,
          imageUrl: image.imageUrl,
          caption: image.caption,
          order: image.order,
        })),
      });
    }

    const createdPost = await prisma.propertyPost.findUniqueOrThrow({
      where: {
        id: post.id,
      },
      include: postInclude,
    });

    invalidateCaches();
    return attachSavedStateToDetailItem(createdPost, actor);
  } catch (error) {
    await prisma.propertyPost.delete({
      where: {
        id: post.id,
      },
    });
    throw error;
  }
};
const mapCityName = (city?: string): string | undefined => {
  if (!city) return undefined;
  const normalized = city.toLowerCase().trim();
  if (normalized.includes("hồ chí minh") || normalized.includes("ho chi minh") || normalized.includes("hcm")) {
    return "Ho Chi Minh City";
  }
  if (normalized.includes("hà nội") || normalized.includes("ha noi")) {
    return "Hanoi";
  }
  return city;
};

const mapDistrictName = (district?: string): string | undefined => {
  if (!district) return undefined;
  const normalized = district.toLowerCase().trim();
  const districtMatch = normalized.match(/quận\s+(\d+)/);
  if (districtMatch) {
    return `District ${districtMatch[1]}`;
  }
  if (normalized.includes("thủ đức")) {
    return "Thu Duc";
  }
  if (normalized.includes("bình thạnh")) {
    return "Binh Thanh";
  }
  return district
    .replace(/^(quận|huyện|thành phố|thị xã)\s+/i, "")
    .trim();
};

export const getPosts = async (
  filter: PostFilterInput,
  user?: AuthenticatedUser,
) => {
  const page = toPaginationNumber(filter.page, 1, 1);
  const limit = toPaginationNumber(filter.limit, 10, 1, 100);
  const skip = (page - 1) * limit;
  const keyword = toOptionalString(filter.keyword);
  const minPrice = toOptionalNumber(filter.minPrice);
  const maxPrice = toOptionalNumber(filter.maxPrice);
  const minArea = toOptionalNumber(filter.minArea);
  const maxArea = toOptionalNumber(filter.maxArea);
  const featureIds = toOptionalString(filter.featureIds);
  const imageLimit = filter.imageLimit
    ? toPaginationNumber(filter.imageLimit, 1, 1, 10)
    : undefined;
  const featureIdsArray = featureIds
    ? featureIds
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
        .sort()
    : [];
  const authorId = toOptionalString(filter.authorId);
  const filterCity = toOptionalString(filter.city);
  const filterDistrict = toOptionalString(filter.district);

  const canViewOwnNonActivePosts =
    Boolean(user) &&
    Boolean(authorId) &&
    user?.id === authorId;
  const isCacheableQuery =
    !user && !canViewOwnNonActivePosts;

  const where: Prisma.PropertyPostWhereInput = {
    authorId,
    status:
      user?.role === UserRole.ADMIN && filter.status
        ? filter.status
        : canViewOwnNonActivePosts
          ? filter.status
          : PostStatus.ACTIVE,
    postType: filter.postType,
    propertyType: filter.propertyType,
    price:
      minPrice !== undefined || maxPrice !== undefined
        ? {
            gte: minPrice,
            lte: maxPrice,
          }
        : undefined,
    area:
      minArea !== undefined || maxArea !== undefined
        ? {
            gte: minArea,
            lte: maxArea,
          }
        : undefined,
    OR: keyword
      ? [
          { title: { contains: keyword, mode: "insensitive" } },
          { description: { contains: keyword, mode: "insensitive" } },
          { address: { contains: keyword, mode: "insensitive" } },
        ]
      : undefined,
  };

  const andConditions: Prisma.PropertyPostWhereInput[] = [];

  if (filterCity) {
    andConditions.push({
      OR: [
        { city: { contains: filterCity, mode: "insensitive" } },
        { city: { contains: mapCityName(filterCity) || "", mode: "insensitive" } }
      ]
    });
  }

  if (filterDistrict) {
    andConditions.push({
      OR: [
        { district: { contains: filterDistrict, mode: "insensitive" } },
        { district: { contains: mapDistrictName(filterDistrict) || "", mode: "insensitive" } }
      ]
    });
  }

  if (featureIdsArray.length > 0) {
    featureIdsArray.forEach((id) => {
      andConditions.push({
        features: {
          some: {
            featureId: id,
          },
        },
      });
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  const visibilityScope =
    user?.role === UserRole.ADMIN
      ? "admin"
      : canViewOwnNonActivePosts
        ? `owner:${user?.id ?? ""}`
        : "public";

  const cacheKey = isCacheableQuery
    ? JSON.stringify({
        visibilityScope,
        page,
        limit,
        authorId: authorId ?? "",
        keyword: keyword ?? "",
        city: toOptionalString(filter.city) ?? "",
        district: toOptionalString(filter.district) ?? "",
        postType: filter.postType ?? "",
        propertyType: filter.propertyType ?? "",
        minPrice: minPrice ?? null,
        maxPrice: maxPrice ?? null,
        minArea: minArea ?? null,
        maxArea: maxArea ?? null,
        featureIds: featureIdsArray.join(","),
        imageLimit: imageLimit ?? null,
        status: filter.status ?? "",
      })
    : null;

  if (cacheKey) {
    const cached = postsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
  }

  const [rawItems, total] = await Promise.all([
    prisma.propertyPost.findMany({
      where,
      select: imageLimit
        ? {
            ...postListSelect,
            images: {
              ...postListSelect.images,
              take: imageLimit,
            },
          }
        : postListSelect,
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],
      skip,
      take: limit + 1,
    }),
    prisma.propertyPost.count({
      where,
    }),
  ]);

  const hasMore = rawItems.length > limit;
  const pagedItems = hasMore ? rawItems.slice(0, limit) : rawItems;
  const items = pagedItems.map((item) => {
    return item;
  });
  const itemsWithSavedState = await attachSavedStateToListItems(items, user);

  const data = {
    items: itemsWithSavedState,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore,
    },
  };

  if (cacheKey) {
    postsCache.set(cacheKey, {
      data,
      expiresAt: Date.now() + POSTS_CACHE_TTL_MS,
    });
  }

  return data;
};

export const getPostById = async (id: string, user?: AuthenticatedUser) => {
  const cacheKey = `posts:detail:base:${id}`;
  let cachedBase: { post: any; relatedPosts: any[] } | null = null;

  if (redisClient?.isOpen) {
    try {
      const cachedValue = await redisClient.get(cacheKey);
      if (cachedValue) {
        cachedBase = JSON.parse(cachedValue);
      }
    } catch (err) {
      console.warn("Failed to read Redis cache key:", err);
    }
  } else {
    const localCached = localPostDetailCache.get(cacheKey);
    if (localCached && localCached.expiresAt > Date.now()) {
      cachedBase = localCached.data;
    }
  }

  if (cachedBase) {
    const isSavedResult = user
      ? await prisma.savedPost.findUnique({
          where: {
            userId_postId: {
              userId: user.id,
              postId: id,
            },
          },
          select: { id: true },
        })
      : null;

    const { features, ...rest } = cachedBase.post;
    return {
      ...rest,
      features: features?.map((f: any) => f.feature) ?? [],
      isSaved: Boolean(isSavedResult),
      relatedPosts: cachedBase.relatedPosts,
      banContext: null,
    };
  }

  const post = await prisma.propertyPost.findUnique({
    where: {
      id,
    },
    include: postInclude,
  });

  if (!post) {
    throw new AppError("Post not found.", 404);
  }

  if (
    post.status !== PostStatus.ACTIVE &&
    (!user || (user.role !== UserRole.ADMIN && !canManagePost(user, post.authorId)))
  ) {
    throw new AppError("Post not found.", 404);
  }

  // Fetch saved status and related posts in parallel to minimize network latency overhead
  const [isSavedResult, relatedPostsRaw, latestResolvedReport] = await Promise.all([
    user
      ? prisma.savedPost.findUnique({
          where: {
            userId_postId: {
              userId: user.id,
              postId: id,
            },
          },
          select: { id: true },
        })
      : null,
    prisma.propertyPost.findMany({
      where: {
        status: PostStatus.ACTIVE,
        city: post.city,
        propertyType: post.propertyType,
        id: { not: id },
      },
      select: relatedPostSelect,
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    post.status === PostStatus.BANNED && user && canManagePost(user, post.authorId)
      ? prisma.report.findFirst({
          where: {
            postId: id,
            status: ReportStatus.RESOLVED,
          },
          orderBy: {
            resolvedAt: "desc",
          },
          select: {
            id: true,
            reason: true,
            description: true,
            resolvedAt: true,
            appealStatus: true,
            appealMessage: true,
            appealEvidence: true,
            appealedAt: true,
          },
        })
      : null,
  ]);

  const relatedPosts = relatedPostsRaw.map((item) => ({
    ...item,
    imageCount: item.images.length,
    isSaved: false,
  }));

  // Only cache ACTIVE posts to ensure real-time status changes and security checks
  if (post.status === PostStatus.ACTIVE) {
    const cacheData = { post, relatedPosts };
    if (redisClient?.isOpen) {
      try {
        await redisClient.setEx(cacheKey, 5 * 60, JSON.stringify(cacheData)); // cache for 5 minutes
      } catch (err) {
        console.warn("Failed to set Redis cache key:", err);
      }
    } else {
      localPostDetailCache.set(cacheKey, {
        data: cacheData,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });
    }
  }

  const { features, ...rest } = post;

  return {
    ...rest,
    features: features?.map((f: any) => f.feature) ?? [],
    isSaved: Boolean(isSavedResult),
    relatedPosts,
    banContext: latestResolvedReport
      ? ({
          reportId: latestResolvedReport.id,
          reason: latestResolvedReport.reason,
          description: latestResolvedReport.description,
          resolvedAt: latestResolvedReport.resolvedAt,
          appealStatus: latestResolvedReport.appealStatus,
          appealMessage: latestResolvedReport.appealMessage,
          appealEvidence: latestResolvedReport.appealEvidence,
          appealedAt: latestResolvedReport.appealedAt,
        } satisfies PostBanContext)
      : null,
  };
};

export const updatePost = async (
  id: string,
  input: UpdatePostInput,
  user?: AuthenticatedUser,
) => {
  const actor = ensureAuthenticated(user);
  const existingPost = await getPostOwnership(id);

  if (!canManagePost(actor, existingPost.authorId)) {
    const isOnlyUpdatingStatus = Object.keys(input).length === 1 && input.status !== undefined;
    if (!(actor.role === UserRole.ADMIN && isOnlyUpdatingStatus)) {
      throw new AppError("You do not have permission to update this post.", 403);
    }
  }

  if (input.status && actor.role !== UserRole.ADMIN) {
    throw new AppError("Only admin can update post status.", 403);
  }

  if (Object.keys(input).length === 0) {
    throw new AppError("At least one field is required for update.", 400);
  }

  const { featureIds, ...updateData } = input;

  const updatedPost = await prisma.propertyPost.update({
    where: {
      id,
    },
    data: {
      ...updateData,
      features: featureIds ? {
        deleteMany: {},
        create: featureIds.map((fId) => ({ featureId: fId })),
      } : undefined,
    },
    include: postInclude,
  });

  invalidateCaches(id);
  return attachSavedStateToDetailItem(updatedPost, user);
};

export const deletePost = async (id: string, user?: AuthenticatedUser) => {
  const actor = ensureAuthenticated(user);
  const existingPost = await getPostOwnership(id);

  if (!canManagePost(actor, existingPost.authorId)) {
    throw new AppError("You do not have permission to delete this post.", 403);
  }

  const postImages = await prisma.propertyImage.findMany({
    where: { postId: id },
    select: { imageUrl: true },
  });

  await prisma.propertyPost.delete({
    where: {
      id,
    },
  });

  Promise.allSettled(
    postImages.map((img) => deleteImageByUrl(img.imageUrl)),
  ).catch(console.error);

  invalidateCaches(id);
};

export const addPostImages = async (
  postId: string,
  files: Express.Multer.File[] = [],
  imageMetadataValue: unknown,
  user?: AuthenticatedUser,
) => {
  const actor = ensureAuthenticated(user);

  if (files.length === 0) {
    throw new AppError("At least one image is required.", 400);
  }

  const existingPost = await getPostOwnership(postId);

  if (!canManagePost(actor, existingPost.authorId)) {
    throw new AppError("You do not have permission to add images to this post.", 403);
  }

  const existingImageCount = await prisma.propertyImage.count({
    where: {
      postId,
    },
  });

  if (existingImageCount + files.length > 10) {
    throw new AppError("Mỗi bài đăng chỉ được tối đa 10 ảnh.", 400);
  }

  const imageMetadata = parseImageMetadata(imageMetadataValue);
  validateImageMetadataCount(files, imageMetadata);
  const uploadedImages = await uploadPostImages(postId, files, imageMetadata);

  try {
    await prisma.propertyImage.createMany({
      data: uploadedImages.map((image, index) => ({
        postId,
        imageUrl: image.imageUrl,
        caption: image.caption,
        order: image.order ?? existingImageCount + index,
      })),
    });
  } catch (error) {
    await Promise.allSettled(
      uploadedImages.map((image) => deleteImageByUrl(image.imageUrl)),
    );
    throw error;
  }

  const post = await prisma.propertyPost.findUniqueOrThrow({
    where: {
      id: postId,
    },
    include: postInclude,
  });

  invalidateCaches(postId);
  return attachSavedStateToDetailItem(post, user);
};

export const deletePostImage = async (
  postId: string,
  imageId: string,
  user?: AuthenticatedUser,
) => {
  const actor = ensureAuthenticated(user);
  const image = await prisma.propertyImage.findUnique({
    where: {
      id: imageId,
    },
    include: {
      post: {
        select: {
          authorId: true,
        },
      },
    },
  });

  if (!image || image.postId !== postId) {
    throw new AppError("Post image not found.", 404);
  }

  if (!image.post || !canManagePost(actor, image.post.authorId)) {
    throw new AppError("You do not have permission to delete this image.", 403);
  }

  await prisma.propertyImage.delete({
    where: {
      id: imageId,
    },
  });

  try {
    await deleteImageByUrl(image.imageUrl);
  } catch (error) {
    await prisma.propertyImage.create({
      data: {
        id: image.id,
        postId: image.postId,
        imageUrl: image.imageUrl,
        caption: image.caption,
        order: image.order,
        createdAt: image.createdAt,
      },
    });

    throw error;
  }

  invalidateCaches(postId);
};

