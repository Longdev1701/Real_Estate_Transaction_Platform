import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../prisma/prisma.service.js";
import { sendSuccess } from "../utils/response.js";
import { AppError } from "../middlewares/error.middleware.js";
import { uploadChatImage as uploadChatImageService } from "../services/upload.service.js";

const createConversationSchema = z.object({
  postId: z.string(),
  sellerId: z.string()
});

export const createOrGetConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const buyerId = req.user!.id;
    const { postId, sellerId } = createConversationSchema.parse(req.body);

    if (buyerId === sellerId) {
      throw new AppError("You cannot message yourself.", 400);
    }

    // Check if conversation already exists
    let conversation = await prisma.conversation.findFirst({
      where: {
        postId,
        buyerId,
        sellerId
      },
      include: {
        buyer: { select: { id: true, fullName: true, avatarUrl: true } },
        seller: { select: { id: true, fullName: true, avatarUrl: true } },
        post: { select: { id: true, title: true, price: true, area: true, propertyType: true, city: true, images: { take: 1, select: { imageUrl: true } } } }
      }
    });

    if (!conversation) {
      // Check if post exists
      const post = await prisma.propertyPost.findUnique({
        where: { id: postId }
      });
      if (!post) {
        throw new AppError("Property post not found.", 404);
      }

      try {
        conversation = await prisma.conversation.create({
          data: {
            postId,
            buyerId,
            sellerId
          },
          include: {
            buyer: { select: { id: true, fullName: true, avatarUrl: true } },
            seller: { select: { id: true, fullName: true, avatarUrl: true } },
            post: { select: { id: true, title: true, price: true, area: true, propertyType: true, city: true, images: { take: 1, select: { imageUrl: true } } } }
          }
        });
      } catch (error: any) {
        // Handle race condition: if another request created the same conversation
        if (error?.code === "P2002") {
          conversation = await prisma.conversation.findFirst({
            where: { postId, buyerId, sellerId },
            include: {
              buyer: { select: { id: true, fullName: true, avatarUrl: true } },
              seller: { select: { id: true, fullName: true, avatarUrl: true } },
              post: { select: { id: true, title: true, price: true, area: true, propertyType: true, city: true, images: { take: 1, select: { imageUrl: true } } } }
            }
          });

          if (!conversation) {
            throw new AppError("Failed to create or find conversation.", 500);
          }
        } else {
          throw error;
        }
      }
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

    const [conversations, total] = await Promise.all([
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
          post: { select: { id: true, title: true, price: true, images: { take: 1, select: { imageUrl: true } } } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1
          },
          _count: {
            select: {
              messages: {
                where: {
                  isRead: false,
                  NOT: { senderId: userId }
                }
              }
            }
          }
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

    const hasMore = skip + conversations.length < total;

    sendSuccess(res, { conversations, pagination: { page, limit, total, hasMore } }, "Conversations fetched successfully");
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    // Count messages that are unread, not sent by this user, and belong to an active conversation
    const unreadCount = await prisma.message.count({
      where: {
        isRead: false,
        NOT: { senderId: userId },
        conversation: {
          OR: [
            { buyerId: userId },
            { sellerId: userId }
          ],
          NOT: { deletedByIds: { has: userId } }
        }
      }
    });

    sendSuccess(res, { unreadCount }, "Unread message count fetched successfully");
  } catch (error) {
    next(error);
  }
};

export const getConversationMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;

    const conversation = await prisma.conversation.findUnique({
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

    const cursor = req.query.cursor as string;
    const limit = parseInt(req.query.limit as string) || 50;

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
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

    await prisma.message.updateMany({
      where: {
        conversationId: id,
        NOT: { senderId: userId },
        isRead: false
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
      await prisma.conversation.update({
        where: { id },
        data: {
          deletedByIds: {
            push: userId
          }
        }
      });
    }

    sendSuccess(res, null, "Conversation deleted successfully");
  } catch (error) {
    next(error);
  }
};
