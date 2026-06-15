import { Prisma } from "@prisma/client";
import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../prisma/prisma.service.js";
import { sendSuccess } from "../utils/response.js";
import { AppError } from "../middlewares/error.middleware.js";
import { uploadChatImage as uploadChatImageService } from "../services/upload.service.js";
import { emitToUser } from "../utils/realtime.helper.js";

const createConversationSchema = z.object({
  postId: z.string().optional().nullable(),
  sellerId: z.string()
});

const conversationInclude = {
  buyer: { select: { id: true, fullName: true, avatarUrl: true } },
  seller: { select: { id: true, fullName: true, avatarUrl: true } },
  post: {
    select: {
      id: true,
      title: true,
      price: true,
      area: true,
      propertyType: true,
      city: true,
      images: { take: 1, select: { imageUrl: true } }
    }
  }
} as const;

const normalizeConversationParticipants = (firstUserId: string, secondUserId: string) =>
  [firstUserId, secondUserId].sort((left, right) => left.localeCompare(right)) as [string, string];

const getConversationDeletionFieldNames = (conversation: {
  buyerId: string;
  sellerId: string;
}, userId: string) => {
  if (conversation.buyerId === userId) {
    return {
      deletedAtField: "buyerDeletedAt" as const,
    };
  }

  if (conversation.sellerId === userId) {
    return {
      deletedAtField: "sellerDeletedAt" as const,
    };
  }

  throw new AppError("Conversation not found or unauthorized.", 404);
};

const getConversationDeletedAt = (conversation: {
  buyerId: string;
  sellerId: string;
  buyerDeletedAt?: Date | null;
  sellerDeletedAt?: Date | null;
}, userId: string) => {
  const { deletedAtField } = getConversationDeletionFieldNames(conversation, userId);
  return conversation[deletedAtField] ?? null;
};

const senderSelect = {
  select: { id: true, fullName: true, avatarUrl: true }
} as const;

type ConversationWithRelations = Prisma.ConversationGetPayload<{
  include: typeof conversationInclude;
}>;

type ConversationParticipantVisibility = {
  id: string;
  buyerId: string;
  sellerId: string;
  buyerDeletedAt?: Date | null;
  sellerDeletedAt?: Date | null;
};

type ConversationAccessRecord = {
  buyerId: string;
  sellerId: string;
  deletedByIds: string[];
  buyerDeletedAt?: Date | null;
  sellerDeletedAt?: Date | null;
};

type LatestConversationMessage = Prisma.MessageGetPayload<{
  include: {
    sender: typeof senderSelect;
  };
}>;

const isUniqueConstraintError = (
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

const buildVisibleConversationFilters = (
  conversations: ConversationParticipantVisibility[],
  userId: string
): Prisma.MessageWhereInput[] =>
  conversations.map((conversation) => {
    const deletedAt = getConversationDeletedAt(conversation, userId);
    return deletedAt
      ? {
          conversationId: conversation.id,
          createdAt: { gt: deletedAt }
        }
      : {
          conversationId: conversation.id
        };
  });

const getLatestVisibleMessageIdsByConversation = async (
  conversations: ConversationParticipantVisibility[],
  userId: string
) => {
  if (conversations.length === 0) {
    return [];
  }

  const visibilityRows = conversations.map((conversation) =>
    Prisma.sql`(CAST(${conversation.id} AS text), CAST(${getConversationDeletedAt(conversation, userId)} AS timestamp))`
  );

  return prisma.$queryRaw<Array<{ id: string; conversationId: string }>>(Prisma.sql`
    WITH visible_conversations("conversationId", "deletedAt") AS (
      VALUES ${Prisma.join(visibilityRows)}
    ),
    ranked_messages AS (
      SELECT
        m."id",
        m."conversationId",
        ROW_NUMBER() OVER (
          PARTITION BY m."conversationId"
          ORDER BY m."createdAt" DESC, m."id" DESC
        ) AS rn
      FROM "Message" m
      INNER JOIN visible_conversations vc
        ON vc."conversationId" = m."conversationId"
      WHERE vc."deletedAt" IS NULL OR m."createdAt" > vc."deletedAt"
    )
    SELECT "id", "conversationId"
    FROM ranked_messages
    WHERE rn = 1
  `);
};

export const createOrGetConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user!.id;
    const { postId, sellerId: targetUserId } = createConversationSchema.parse(req.body);

    if (currentUserId === targetUserId) {
      throw new AppError("You cannot message yourself.", 400);
    }

    const normalizedPostId = postId ?? null;

    if (normalizedPostId) {
      const post = await prisma.propertyPost.findUnique({
        where: { id: normalizedPostId },
        select: {
          id: true,
          authorId: true
        }
      });

      if (!post) {
        throw new AppError("Property post not found.", 404);
      }

      if (post.authorId !== targetUserId) {
        throw new AppError("Seller does not own this property post.", 400);
      }
    }

    const [buyerId, sellerId] = normalizeConversationParticipants(currentUserId, targetUserId);

    // Persist each user pair in a canonical order so the same two users always share one conversation.
    let conversation: ConversationWithRelations | null = await prisma.conversation.findFirst({
      where: {
        buyerId,
        sellerId
      },
      include: conversationInclude
    });

    if (!conversation) {
      try {
        const createConversationData: Prisma.ConversationCreateInput = {
          buyer: {
            connect: { id: buyerId }
          },
          seller: {
            connect: { id: sellerId }
          },
          ...(normalizedPostId
            ? {
                post: {
                  connect: { id: normalizedPostId }
                }
              }
            : {})
        };

        conversation = await prisma.conversation.create({
          data: createConversationData,
          include: conversationInclude
        });

        // Notify the target user that a new conversation has been initiated.
        emitToUser(targetUserId, "conversation_created", { conversation });
      } catch (error: unknown) {
        // Handle race condition: if another request created the same conversation
        if (isUniqueConstraintError(error)) {
          conversation = await prisma.conversation.findFirst({
            where: { buyerId, sellerId },
            include: conversationInclude
          });

          if (!conversation) {
            throw new AppError("Failed to create or find conversation.", 500);
          }
        } else {
          throw error;
        }
      }
    } else if (
      (normalizedPostId !== null && conversation.postId !== normalizedPostId) ||
      conversation.deletedByIds.includes(currentUserId)
    ) {
      const nextDeletedByIds = conversation.deletedByIds.filter((id: string) => id !== currentUserId);
      const updateConversationData: Prisma.ConversationUpdateInput = {
        ...(normalizedPostId !== null ? { postId: normalizedPostId } : {}),
        deletedByIds: nextDeletedByIds
      };

      conversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: updateConversationData,
        include: conversationInclude
      });

      emitToUser(buyerId, "conversation_updated", { conversation });
      emitToUser(sellerId, "conversation_updated", { conversation });
    }

    sendSuccess(res, { conversation }, "Conversation fetched successfully", 200);
  } catch (error) {
    next(error);
  }
};

export const getConversations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [conversations, total] = await prisma.$transaction([
      prisma.conversation.findMany({
        where: {
          OR: [
            { buyerId: userId },
            { sellerId: userId }
          ],
          NOT: { deletedByIds: { has: userId } }
        },
        take: limit,
        skip: skip,
        include: {
          buyer: { select: { id: true, fullName: true, avatarUrl: true } },
          seller: { select: { id: true, fullName: true, avatarUrl: true } },
          post: { select: { id: true, title: true, price: true, images: { take: 1, select: { imageUrl: true } } } }
        },
        orderBy: { updatedAt: "desc" }
      }),
      prisma.conversation.count({
        where: {
          OR: [
            { buyerId: userId },
            { sellerId: userId }
          ],
          NOT: { deletedByIds: { has: userId } }
        }
      })
    ]);

    const visibleConversationFilters = buildVisibleConversationFilters(conversations, userId);
    const unreadCountRows = visibleConversationFilters.length > 0
      ? await prisma.message.groupBy({
          by: ["conversationId"],
          where: {
            isRead: false,
            senderId: { not: userId },
            OR: visibleConversationFilters
          },
          _count: {
            _all: true
          }
        })
      : [];
    const latestVisibleMessageIds = visibleConversationFilters.length > 0
      ? await getLatestVisibleMessageIdsByConversation(conversations, userId)
      : [];

    const latestMessageIds = latestVisibleMessageIds.map((message) => message.id);
    const latestMessages: LatestConversationMessage[] = latestMessageIds.length > 0
      ? await prisma.message.findMany({
          where: {
            id: { in: latestMessageIds }
          },
          include: {
            sender: senderSelect
          }
        })
      : [];

    const unreadCounts = new Map(
      unreadCountRows.map((row) => [row.conversationId, row._count._all])
    );
    const latestVisibleMessages = new Map(
      latestMessages.map((message) => [message.conversationId, message])
    );

    const normalizedConversations = conversations.map((conversation) => {
      return {
        ...conversation,
        messages: latestVisibleMessages.get(conversation.id) ? [latestVisibleMessages.get(conversation.id)!] : [],
        _count: {
          messages: unreadCounts.get(conversation.id) ?? 0
        }
      };
    });

    const hasMore = skip + conversations.length < total;

    sendSuccess(res, { conversations: normalizedConversations, pagination: { page, limit, total, hasMore } }, "Conversations fetched successfully");
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { buyerId: userId },
          { sellerId: userId }
        ],
        NOT: { deletedByIds: { has: userId } }
      },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        buyerDeletedAt: true,
        sellerDeletedAt: true
      }
    });

    const visibleConversationFilters = buildVisibleConversationFilters(conversations, userId);
    const unreadCountRows = visibleConversationFilters.length > 0
      ? await prisma.message.groupBy({
          by: ["conversationId"],
          where: {
            isRead: false,
            senderId: { not: userId },
            OR: visibleConversationFilters
          },
          _count: {
            _all: true
          }
        })
      : [];

    const unreadCount = unreadCountRows.reduce((sum, row) => sum + row._count._all, 0);

    sendSuccess(res, { unreadCount }, "Unread message count fetched successfully");
  } catch (error) {
    next(error);
  }
};

export const getConversationMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;

    const cursor = req.query.cursor as string;
    const limit = parseInt(req.query.limit as string) || 50;

    let conversation = null;

    if (!cursor) {
      conversation = await prisma.conversation.findUnique({
        where: { id },
        include: {
          buyer: { select: { id: true, fullName: true, avatarUrl: true } },
          seller: { select: { id: true, fullName: true, avatarUrl: true } },
          post: { select: { id: true, title: true, price: true, area: true, propertyType: true, city: true, images: { take: 1, select: { imageUrl: true } } } }
        }
      });

      if (!conversation || (conversation.buyerId !== userId && conversation.sellerId !== userId) || conversation.deletedByIds.includes(userId)) {
        throw new AppError("Conversation not found, unauthorized, or deleted.", 404);
      }
    } else {
      const lightConversation = await prisma.conversation.findUnique({
        where: { id },
        select: { buyerId: true, sellerId: true, deletedByIds: true, buyerDeletedAt: true, sellerDeletedAt: true }
      });

      if (!lightConversation || (lightConversation.buyerId !== userId && lightConversation.sellerId !== userId) || lightConversation.deletedByIds.includes(userId)) {
        throw new AppError("Conversation not found, unauthorized, or deleted.", 404);
      }

      conversation = lightConversation;
    }

    const deletedAt = getConversationDeletedAt(conversation, userId);

    const messages = await prisma.message.findMany({
      where: {
        conversationId: id,
        ...(deletedAt ? { createdAt: { gt: deletedAt } } : {})
      },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        sender: {
          select: { id: true, fullName: true, avatarUrl: true }
        }
      }
    });

    const reversedMessages = messages.reverse();
    const nextCursor = messages.length === limit ? reversedMessages[0].id : null;

    sendSuccess(res, { conversation, messages: reversedMessages, nextCursor }, "Messages fetched successfully");
  } catch (error) {
    next(error);
  }
};

export const markMessagesAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id }
    });

    if (!conversation || (conversation.buyerId !== userId && conversation.sellerId !== userId)) {
      throw new AppError("Conversation not found or unauthorized.", 404);
    }

    const deletedAt = getConversationDeletedAt(conversation, userId);

    await prisma.message.updateMany({
      where: {
        conversationId: id,
        NOT: { senderId: userId },
        isRead: false,
        ...(deletedAt ? { createdAt: { gt: deletedAt } } : {})
      },
      data: { isRead: true }
    });

    sendSuccess(res, null, "Messages marked as read");
  } catch (error) {
    next(error);
  }
};

export const uploadChatImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;
    const file = req.file;

    if (!file) {
      throw new AppError("No image file provided.", 400);
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id }
    });

    if (!conversation || (conversation.buyerId !== userId && conversation.sellerId !== userId)) {
      throw new AppError("Conversation not found or unauthorized.", 404);
    }

    const imageUrl = await uploadChatImageService(id, file);

    sendSuccess(res, { imageUrl }, "Image uploaded successfully");
  } catch (error) {
    next(error);
  }
};

const editMessageSchema = z.object({
  content: z.string().min(1)
});

export const editMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const messageId = req.params.messageId as string;
    const userId = req.user!.id;
    const { content } = editMessageSchema.parse(req.body);

    const message = await prisma.message.findFirst({
      where: { id: messageId, conversationId: id }
    });

    if (!message || message.senderId !== userId) {
      throw new AppError("Message not found or unauthorized.", 404);
    }
    if (message.messageType !== "TEXT") {
      throw new AppError("Can only edit text messages.", 400);
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: { content, isEdited: true }
    });

    sendSuccess(res, { message: updatedMessage }, "Message edited successfully");
  } catch (error) {
    next(error);
  }
};

export const deleteMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const messageId = req.params.messageId as string;
    const userId = req.user!.id;

    const message = await prisma.message.findFirst({
      where: { id: messageId, conversationId: id }
    });

    if (!message || message.senderId !== userId) {
      throw new AppError("Message not found or unauthorized.", 404);
    }

    await prisma.message.delete({
      where: { id: messageId }
    });

    sendSuccess(res, null, "Message deleted successfully");
  } catch (error) {
    next(error);
  }
};

export const deleteConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id }
    });

    if (!conversation || (conversation.buyerId !== userId && conversation.sellerId !== userId)) {
      throw new AppError("Conversation not found or unauthorized.", 404);
    }

    if (!conversation.deletedByIds.includes(userId)) {
      const { deletedAtField } = getConversationDeletionFieldNames(conversation, userId);
      await prisma.conversation.update({
        where: { id },
        data: {
          [deletedAtField]: new Date(),
          deletedByIds: {
            push: userId
          }
        }
      });
      // Emit socket event to notify other tabs/devices of the current user
      emitToUser(userId, "conversation_deleted", { conversationId: id });
    }

    sendSuccess(res, null, "Conversation deleted successfully");
  } catch (error) {
    next(error);
  }
};
