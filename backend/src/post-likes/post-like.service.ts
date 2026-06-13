import { NotificationType, PostStatus } from "@prisma/client";

import type { AuthenticatedUser } from "../types/auth.type.js";

import { AppError } from "../middlewares/error.middleware.js";
import { prisma } from "../prisma/prisma.service.js";
import { createNotification } from "../utils/notification.helper.js";

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
      title: true,
      authorId: true,
      status: true,
    },
  });

  if (!post) {
    throw new AppError("Post not found.", 404);
  }

  return post;
};

const getLikeCount = (postId: string) =>
  prisma.postLike.count({
    where: {
      postId,
    },
  });

export const likePost = async (postId: string, user?: AuthenticatedUser) => {
  const actor = ensureAuthenticated(user);
  const post = await getExistingPost(postId);

  if (post.status !== PostStatus.ACTIVE) {
    throw new AppError("Only active posts can be liked.", 400);
  }

  const existingLike = await prisma.postLike.findUnique({
    where: {
      userId_postId: {
        userId: actor.id,
        postId,
      },
    },
  });

  if (existingLike) {
    return {
      ...existingLike,
      isLiked: true,
      likeCount: await getLikeCount(postId),
    };
  }

  const postLike = await prisma.postLike.create({
    data: {
      userId: actor.id,
      postId,
    },
  });

  if (post.authorId !== actor.id) {
    void createNotification({
      userId: post.authorId,
      type: NotificationType.POST,
      relatedId: post.id,
      title: "Có người đã thích bài đăng của bạn",
      content: `${actor.fullName} đã thích bài "${post.title}".`,
    });
  }

  return {
    ...postLike,
    isLiked: true,
    likeCount: await getLikeCount(postId),
  };
};

export const unlikePost = async (postId: string, user?: AuthenticatedUser) => {
  const actor = ensureAuthenticated(user);

  const existingLike = await prisma.postLike.findUnique({
    where: {
      userId_postId: {
        userId: actor.id,
        postId,
      },
    },
  });

  if (!existingLike) {
    return {
      isLiked: false,
      likeCount: await getLikeCount(postId),
    };
  }

  await prisma.postLike.delete({
    where: {
      id: existingLike.id,
    },
  });

  return {
    isLiked: false,
    likeCount: await getLikeCount(postId),
  };
};

export const checkPostLike = async (postId: string, user?: AuthenticatedUser) => {
  const actor = ensureAuthenticated(user);

  const [postLike, likeCount] = await Promise.all([
    prisma.postLike.findUnique({
      where: {
        userId_postId: {
          userId: actor.id,
          postId,
        },
      },
      select: {
        id: true,
      },
    }),
    getLikeCount(postId),
  ]);

  return {
    isLiked: Boolean(postLike),
    likeCount,
  };
};
