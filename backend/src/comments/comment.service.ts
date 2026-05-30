import { NotificationType, UserRole } from "@prisma/client";

import { AppError } from "../middlewares/error.middleware.js";
import { prisma } from "../prisma/prisma.service.js";
import { createNotification } from "../utils/notification.helper.js";

const commentInclude = {
  author: {
    select: {
      id: true,
      fullName: true,
      email: true,
      avatarUrl: true,
    },
  },
  replies: {
    include: {
      author: {
        select: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc" as const,
    },
  },
} as const;

export const createComment = async (
  postId: string,
  authorId: string,
  content: string,
  parentId?: string,
) => {
  const post = await prisma.propertyPost.findUnique({
    where: { id: postId },
    select: {
      id: true,
      title: true,
      authorId: true,
    },
  });

  if (!post) {
    throw new AppError("Post not found.", 404);
  }

  if (parentId) {
    const parentComment = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { id: true, postId: true, authorId: true },
    });

    if (!parentComment) {
      throw new AppError("Parent comment not found.", 404);
    }

    if (parentComment.postId !== postId) {
      throw new AppError("Parent comment must belong to the same post.", 400);
    }
  }

  const comment = await prisma.comment.create({
    data: {
      postId,
      authorId,
      content,
      parentId,
    },
    include: commentInclude,
  });

  const recipients = new Set<string>();
  if (post.authorId !== authorId) {
    recipients.add(post.authorId);
  }

  if (parentId) {
    const parentComment = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { authorId: true },
    });

    if (parentComment?.authorId && parentComment.authorId !== authorId) {
      recipients.add(parentComment.authorId);
    }
  }

  void Promise.allSettled(
    Array.from(recipients).map((userId) =>
      createNotification({
        userId,
        type: NotificationType.POST,
        relatedId: post.id,
        title: parentId ? "Có phản hồi mới trong bài đăng" : "Có bình luận mới trong bài đăng",
        content: `${comment.author.fullName} đã bình luận về bài "${post.title}".`,
      }),
    ),
  );

  return comment;
};

export const getComments = async (postId: string, page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;

  const [items, total] = await prisma.$transaction([
    prisma.comment.findMany({
      where: {
        postId,
        parentId: null,
      },
      include: commentInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.comment.count({
      where: {
        postId,
        parentId: null,
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
};

export const deleteComment = async (commentId: string, actorId: string, role: UserRole) => {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, authorId: true },
  });

  if (!comment) {
    throw new AppError("Comment not found.", 404);
  }

  if (comment.authorId !== actorId && role !== UserRole.ADMIN) {
    throw new AppError("You are not authorized to delete this comment.", 403);
  }

  await prisma.comment.delete({
    where: { id: commentId },
  });

  return { success: true };
};
