import { NotificationType, UserRole } from "@prisma/client";

import { AppError } from "../middlewares/error.middleware.js";
import { prisma } from "../prisma/prisma.service.js";
import { createNotification } from "../utils/notification.helper.js";
import { emitToRoom } from "../utils/realtime.helper.js";

const commentInclude = {
  author: {
    select: {
      id: true,
      fullName: true,
      email: true,
      avatarUrl: true,
    },
  },
  replyToUser: {
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
      replyToUser: {
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

const getPostCommentRoom = (postId: string) => `post_comments:${postId}`;

export const createComment = async (
  postId: string,
  authorId: string,
  content: string,
  parentId?: string,
  replyToUserId?: string,
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

  let rootParentId: string | undefined;
  let targetReplyToUserId: string | undefined;

  if (parentId) {
    const parentComment = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { id: true, postId: true, authorId: true, parentId: true },
    });

    if (!parentComment) {
      throw new AppError("Parent comment not found.", 404);
    }

    if (parentComment.postId !== postId) {
      throw new AppError("Parent comment must belong to the same post.", 400);
    }

    rootParentId = parentComment.parentId ?? parentComment.id;
    targetReplyToUserId = replyToUserId ?? parentComment.authorId;
  }

  const comment = await prisma.comment.create({
    data: {
      postId,
      authorId,
      content,
      parentId: rootParentId,
      replyToUserId: targetReplyToUserId,
    },
    include: commentInclude,
  });

  const recipients = new Set<string>();
  if (post.authorId !== authorId) {
    recipients.add(post.authorId);
  }

  if (targetReplyToUserId && targetReplyToUserId !== authorId) {
    recipients.add(targetReplyToUserId);
  }

  void Promise.allSettled(
    Array.from(recipients).map((userId) =>
      createNotification({
        userId,
        type: NotificationType.POST,
        relatedId: post.id,
        title: rootParentId ? "Có phản hồi mới trong bài đăng" : "Có bình luận mới trong bài đăng",
        content: `${comment.author.fullName} đã bình luận về bài "${post.title}".`,
      }),
    ),
  );

  emitToRoom(getPostCommentRoom(postId), "comment_created", comment);

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
    select: { id: true, postId: true, authorId: true, parentId: true },
  });

  if (!comment) {
    throw new AppError("Comment not found.", 404);
  }

  if (comment.authorId !== actorId && role !== UserRole.ADMIN) {
    throw new AppError("You are not authorized to delete this comment.", 403);
  }

  const replyCount = comment.parentId
    ? 0
    : await prisma.comment.count({
        where: { parentId: comment.id },
      });

  await prisma.comment.delete({
    where: { id: commentId },
  });

  const result = {
    success: true,
    commentId,
    postId: comment.postId,
    parentId: comment.parentId,
    deletedCount: 1 + replyCount,
  };

  emitToRoom(getPostCommentRoom(comment.postId), "comment_deleted", result);

  return result;
};

export const updateComment = async (
  commentId: string,
  actorId: string,
  role: UserRole,
  content: string,
) => {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, authorId: true },
  });

  if (!comment) {
    throw new AppError("Comment not found.", 404);
  }

  if (comment.authorId !== actorId && role !== UserRole.ADMIN) {
    throw new AppError("You are not authorized to update this comment.", 403);
  }

  const updatedComment = await prisma.comment.update({
    where: { id: commentId },
    data: { content },
    include: commentInclude,
  });

  emitToRoom(getPostCommentRoom(updatedComment.postId), "comment_updated", updatedComment);

  return updatedComment;
};
