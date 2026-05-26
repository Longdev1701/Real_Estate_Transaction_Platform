import type { Prisma } from "@prisma/client";

import { PostStatus, UserRole } from "@prisma/client";

import type { AuthenticatedUser } from "../types/auth.type.js";

import { AppError } from "../middlewares/error.middleware.js";
import { prisma } from "../prisma/prisma.service.js";
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
} satisfies Prisma.PropertyPostInclude;

const ensureAuthenticated = (user?: AuthenticatedUser) => {
  if (!user) {
    throw new AppError("Authentication required.", 401);
  }

  return user;
};

const canManagePost = (user: AuthenticatedUser, authorId: string) =>
  user.role === UserRole.ADMIN || user.id === authorId;

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

export const createPost = async (
  input: CreatePostInput,
  user?: AuthenticatedUser,
) => {
  const actor = ensureAuthenticated(user);
  const { images, ...postData } = input;

  return prisma.propertyPost.create({
    data: {
      ...postData,
      authorId: actor.id,
      status: PostStatus.ACTIVE,
      images: images?.length
        ? {
            create: images.map((image, index) => ({
              imageUrl: image.imageUrl,
              caption: image.caption,
              order: image.order ?? index,
            })),
          }
        : undefined,
    },
    include: postInclude,
  });
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

  const where: Prisma.PropertyPostWhereInput = {
    status:
      user?.role === UserRole.ADMIN && filter.status
        ? filter.status
        : PostStatus.ACTIVE,
    city: toOptionalString(filter.city)
      ? { contains: toOptionalString(filter.city), mode: "insensitive" }
      : undefined,
    district: toOptionalString(filter.district)
      ? { contains: toOptionalString(filter.district), mode: "insensitive" }
      : undefined,
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

  const [items, total] = await prisma.$transaction([
    prisma.propertyPost.findMany({
      where,
      include: postInclude,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    }),
    prisma.propertyPost.count({ where }),
  ]);

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getPostById = async (id: string, user?: AuthenticatedUser) => {
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
    (!user || !canManagePost(user, post.authorId))
  ) {
    throw new AppError("Post not found.", 404);
  }

  return post;
};

export const updatePost = async (
  id: string,
  input: UpdatePostInput,
  user?: AuthenticatedUser,
) => {
  const actor = ensureAuthenticated(user);
  const existingPost = await prisma.propertyPost.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      authorId: true,
    },
  });

  if (!existingPost) {
    throw new AppError("Post not found.", 404);
  }

  if (!canManagePost(actor, existingPost.authorId)) {
    throw new AppError("You do not have permission to update this post.", 403);
  }

  if (input.status && actor.role !== UserRole.ADMIN) {
    throw new AppError("Only admin can update post status.", 403);
  }

  const { images, ...postData } = input;

  return prisma.$transaction(async (tx) => {
    if (images) {
      await tx.propertyImage.deleteMany({
        where: {
          postId: id,
        },
      });
    }

    return tx.propertyPost.update({
      where: {
        id,
      },
      data: {
        ...postData,
        images: images
          ? {
              create: images.map((image, index) => ({
                imageUrl: image.imageUrl,
                caption: image.caption,
                order: image.order ?? index,
              })),
            }
          : undefined,
      },
      include: postInclude,
    });
  });
};

export const deletePost = async (id: string, user?: AuthenticatedUser) => {
  const actor = ensureAuthenticated(user);
  const existingPost = await prisma.propertyPost.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      authorId: true,
    },
  });

  if (!existingPost) {
    throw new AppError("Post not found.", 404);
  }

  if (!canManagePost(actor, existingPost.authorId)) {
    throw new AppError("You do not have permission to delete this post.", 403);
  }

  await prisma.propertyPost.update({
    where: {
      id,
    },
    data: {
      status: PostStatus.HIDDEN,
    },
  });
};
