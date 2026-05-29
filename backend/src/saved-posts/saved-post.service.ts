import { PostStatus } from "@prisma/client";

import type { AuthenticatedUser } from "../types/auth.type.js";

import { AppError } from "../middlewares/error.middleware.js";
import { prisma } from "../prisma/prisma.service.js";

const savedPostInclude = {
  post: {
    include: {
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
      features: {
        include: {
          feature: true,
        },
      },
    },
  },
} as const;

type SavedPostListOptions = {
  includeFeatures?: boolean;
  imageLimit?: number;
};

const buildSavedPostListInclude = (options: SavedPostListOptions = {}) => ({
  post: {
    include: {
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
        take: options.imageLimit ?? 1,
      },
      features: options.includeFeatures
        ? {
            include: {
              feature: true,
            },
          }
        : false,
    },
  },
});

const ensureAuthenticated = (user?: AuthenticatedUser) => {
  if (!user) {
    throw new AppError("Authentication required.", 401);
  }

  return user;
};

const getExistingPost = async (postId: string) => {
  const post = await prisma.propertyPost.findUnique({
    where: {
      id: postId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!post) {
    throw new AppError("Post not found.", 404);
  }

  return post;
};

export const savePost = async (postId: string, user?: AuthenticatedUser) => {
  const actor = ensureAuthenticated(user);
  const post = await getExistingPost(postId);

  if (post.status !== PostStatus.ACTIVE) {
    throw new AppError("Only active posts can be saved.", 400);
  }

  const existingSavedPost = await prisma.savedPost.findUnique({
    where: {
      userId_postId: {
        userId: actor.id,
        postId,
      },
    },
    include: savedPostInclude,
  });

  if (existingSavedPost) {
    return {
      ...existingSavedPost,
      isSaved: true,
    };
  }

  const savedPost = await prisma.savedPost.create({
    data: {
      userId: actor.id,
      postId,
    },
    include: savedPostInclude,
  });

  return {
    ...savedPost,
    isSaved: true,
  };
};

export const unsavePost = async (postId: string, user?: AuthenticatedUser) => {
  const actor = ensureAuthenticated(user);

  const existingSavedPost = await prisma.savedPost.findUnique({
    where: {
      userId_postId: {
        userId: actor.id,
        postId,
      },
    },
  });

  if (!existingSavedPost) {
    throw new AppError("Saved post not found.", 404);
  }

  await prisma.savedPost.delete({
    where: {
      id: existingSavedPost.id,
    },
  });
};

export const bulkUnsavePosts = async (postIds: string[], user?: AuthenticatedUser) => {
  const actor = ensureAuthenticated(user);
  const uniquePostIds = Array.from(new Set(postIds));

  const deleteResult = await prisma.savedPost.deleteMany({
    where: {
      userId: actor.id,
      postId: {
        in: uniquePostIds,
      },
    },
  });

  return {
    removedCount: deleteResult.count,
    requestedCount: uniquePostIds.length,
    postIds: uniquePostIds,
  };
};

export const getSavedPosts = async (
  user?: AuthenticatedUser,
  options: SavedPostListOptions = {},
) => {
  const actor = ensureAuthenticated(user);

  const savedPosts = await prisma.savedPost.findMany({
    where: {
      userId: actor.id,
      post: {
        status: PostStatus.ACTIVE,
      },
    },
    include: buildSavedPostListInclude(options),
    orderBy: {
      createdAt: "desc",
    },
  });

  return savedPosts.map((savedPost) => ({
    id: savedPost.id,
    createdAt: savedPost.createdAt,
    postId: savedPost.postId,
    userId: savedPost.userId,
    isSaved: true,
    post: {
      ...savedPost.post,
      features: Array.isArray(savedPost.post.features)
        ? savedPost.post.features.map((item: any) => item.feature)
        : [],
      isSaved: true,
    },
  }));
};

export const checkSavedPost = async (postId: string, user?: AuthenticatedUser) => {
  const actor = ensureAuthenticated(user);

  const savedPost = await prisma.savedPost.findUnique({
    where: {
      userId_postId: {
        userId: actor.id,
        postId,
      },
    },
    select: {
      id: true,
    },
  });

  return {
    isSaved: Boolean(savedPost),
  };
};
