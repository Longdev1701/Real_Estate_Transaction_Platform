import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { UserStatus } from "@prisma/client";

import { getCachedAuthUser } from "../auth/auth-user-cache.js";
import { recordAuthMetric } from "../auth/auth.observability.js";
import { revokeAllUserRefreshTokens } from "../auth/auth.service.js";
import { isAllowedOrigin } from "../config/cors.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { prisma } from "../prisma/prisma.service.js";
import { createAdapter } from "@socket.io/redis-adapter";
import { pubClient, subClient, redisClient } from "../config/redis.js";
import { setRealtimeServer } from "../utils/realtime.helper.js";

export interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

const conversationAuthCache = new Map<string, { buyerId: string; sellerId: string; expiresAt: number }>();

const getCachedConversationAuth = async (conversationId: string) => {
  const cacheKey = `conv_auth:${conversationId}`;

  if (redisClient?.isOpen) {
    const cachedAuth = await redisClient.get(cacheKey);
    return cachedAuth ? JSON.parse(cachedAuth) as { buyerId: string; sellerId: string } : null;
  }

  const cachedAuth = conversationAuthCache.get(cacheKey);
  if (!cachedAuth || cachedAuth.expiresAt < Date.now()) {
    conversationAuthCache.delete(cacheKey);
    return null;
  }

  return { buyerId: cachedAuth.buyerId, sellerId: cachedAuth.sellerId };
};

const setCachedConversationAuth = async (conversationId: string, buyerId: string, sellerId: string) => {
  const cacheKey = `conv_auth:${conversationId}`;

  if (redisClient?.isOpen) {
    await redisClient.setEx(cacheKey, 3600, JSON.stringify({ buyerId, sellerId }));
    return;
  }

  conversationAuthCache.set(cacheKey, {
    buyerId,
    sellerId,
    expiresAt: Date.now() + 3_600_000,
  });
};

export function initializeSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Not allowed by CORS"));
      },
      methods: ["GET", "POST"],
    },
    ...(pubClient?.isOpen && subClient?.isOpen
      ? { adapter: createAdapter(pubClient, subClient) }
      : {}),
  });

  setRealtimeServer(io);

  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error: Token missing"));
      }

      const payload = verifyAccessToken(token);
      const user = await getCachedAuthUser(payload.sub);

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      if (user.status === UserStatus.BANNED) {
        await revokeAllUserRefreshTokens(user.id);
        recordAuthMetric("banned_access_attempt", {
          source: "socket",
          userId: user.id,
        });
        return next(new Error("Authentication error: Account banned"));
      }

      socket.user = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
      };
      next();
    } catch {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    const user = socket.user;
    if (!user) return;

    console.log(`User connected to socket: ${user.fullName} (${user.id})`);

    socket.join(user.id);

    (async () => {
      try {
        const sockets = await io.in(user.id).fetchSockets();
        if (sockets.length === 1) {
          io.emit("user_online", user.id);
        }
      } catch (err) {
        console.error("Online status error on connect", err);
      }
    })();

    socket.on("check_online_status", async (userId: string) => {
      try {
        const sockets = await io.in(userId).fetchSockets();

        socket.emit("online_status_result", {
          userId,
          isOnline: sockets.length > 0,
        });
      } catch {
        // ignore
      }
    });

    socket.on("join_room", (conversationId: string) => {
      if (!conversationId || socket.rooms.has(conversationId)) return;
      socket.join(conversationId);
      console.log(`User ${user.id} joined conversation: ${conversationId}`);
    });

    socket.on("leave_room", (conversationId: string) => {
      if (!conversationId || !socket.rooms.has(conversationId)) return;
      socket.leave(conversationId);
    });

    socket.on("join_post_comments", (postId: string) => {
      if (!postId) return;
      socket.join(`post_comments:${postId}`);
    });

    socket.on("leave_post_comments", (postId: string) => {
      if (!postId) return;
      socket.leave(`post_comments:${postId}`);
    });

    socket.on(
      "send_message",
      async (data: {
        conversationId: string;
        content: string;
        messageType?: string;
        tempId?: string;
      }) => {
        try {
          const { conversationId, content, messageType = "TEXT", tempId } = data;

          const cacheKey = `conv_auth:${conversationId}`;
          let authorized = false;
          let buyerId = "";
          let sellerId = "";

          try {
            const cachedAuth = await getCachedConversationAuth(conversationId);
            if (cachedAuth) {
              buyerId = cachedAuth.buyerId;
              sellerId = cachedAuth.sellerId;
              authorized = buyerId === user.id || sellerId === user.id;
            }
          } catch (err) {
            console.error(err);
          }

          if (!buyerId || !sellerId) {
            const conversation = await prisma.conversation.findUnique({
              where: { id: conversationId },
              select: { buyerId: true, sellerId: true },
            });

            if (
              !conversation ||
              (conversation.buyerId !== user.id &&
                conversation.sellerId !== user.id)
            ) {
              return socket.emit("error", {
                message: "Unauthorized or conversation not found",
              });
            }

            buyerId = conversation.buyerId;
            sellerId = conversation.sellerId;
            authorized = true;

            setCachedConversationAuth(conversationId, buyerId, sellerId).catch(console.error);
          }

          if (!authorized) {
            return socket.emit("error", { message: "Unauthorized" });
          }

          const messageId =
            tempId ||
            `msg_${Date.now()}_${Math.random()
              .toString(36)
              .substring(2, 9)}`;

          const tempMessage = {
            id: messageId,
            tempId: messageId,
            conversationId,
            senderId: user.id,
            content,
            messageType,
            createdAt: new Date(),
            updatedAt: new Date(),
            isRead: false,
            isEdited: false,
            sender: {
              id: user.id,
              fullName: user.fullName,
              avatarUrl: user.avatarUrl,
            },
          };

          io.to(buyerId).emit("receive_message", tempMessage);
          io.to(sellerId).emit("receive_message", tempMessage);

          Promise.allSettled([
            prisma.message.create({
              data: {
                id: tempMessage.id,
                conversationId,
                senderId: user.id,
                content,
                messageType: messageType as any,
              },
            }),
            prisma.conversation.update({
              where: { id: conversationId },
              data: { 
                updatedAt: new Date(),
                deletedByIds: [] // Reset deletedByIds so the conversation reappears if there is a new message
              },
            }),
          ]).then((results) => {
            if (results[0].status === "rejected") {
              console.error("Failed to persist message:", results[0].reason);
              socket.emit("error", {
                message: "Failed to persist message",
                tempId,
              });
            }
          });
        } catch (error) {
          console.error("Error sending message:", error);
          socket.emit("error", { message: "Failed to send message" });
        }
      },
    );

    socket.on("typing", (data: { conversationId: string }) => {
      socket.to(data.conversationId).emit("user_typing", {
        conversationId: data.conversationId,
        userId: user.id,
      });
    });

    socket.on("stop_typing", (data: { conversationId: string }) => {
      socket.to(data.conversationId).emit("user_stop_typing", {
        conversationId: data.conversationId,
        userId: user.id,
      });
    });

    socket.on("mark_read", (data: { conversationId: string }) => {
      const payload = {
        conversationId: data.conversationId,
        userId: user.id,
      };
      // Emit to the conversation room (for the other user)
      socket.to(data.conversationId).emit("messages_read", payload);
      // Emit to the user's own room (for ALL their devices, including the sender)
      io.to(user.id).emit("messages_read", payload);
    });

    socket.on(
      "edit_message",
      async (data: {
        messageId: string;
        conversationId: string;
        content: string;
      }) => {
        try {
          const message = await prisma.message.findFirst({
            where: {
              id: data.messageId,
              conversationId: data.conversationId,
              senderId: user.id,
            },
            include: {
              sender: {
                select: {
                  id: true,
                  fullName: true,
                  avatarUrl: true,
                },
              },
            },
          });

          if (!message || message.messageType !== "TEXT") return;

          const updatedMessage = {
            ...message,
            content: data.content,
            isEdited: true,
          };

          const cacheKey = `conv_auth:${data.conversationId}`;
          let buyerId = "";
          let sellerId = "";

          try {
            const cachedAuth = await getCachedConversationAuth(data.conversationId);
            if (cachedAuth) {
              buyerId = cachedAuth.buyerId;
              sellerId = cachedAuth.sellerId;
            }
          } catch {
            // ignore
          }

          if (buyerId && sellerId) {
            io.to(buyerId).emit("message_edited", updatedMessage);
            io.to(sellerId).emit("message_edited", updatedMessage);
          } else {
            const conversation = await prisma.conversation.findUnique({
              where: { id: data.conversationId },
            });

            if (conversation) {
              io.to(conversation.buyerId).emit("message_edited", updatedMessage);
              io.to(conversation.sellerId).emit("message_edited", updatedMessage);
            }
          }

          prisma
            .message.update({
              where: { id: data.messageId },
              data: { content: data.content, isEdited: true },
            })
            .catch(console.error);
        } catch (error) {
          console.error("Error editing message:", error);
        }
      },
    );

    socket.on(
      "delete_message",
      async (data: { messageId: string; conversationId: string }) => {
        try {
          const cacheKey = `conv_auth:${data.conversationId}`;
          let buyerId = "";
          let sellerId = "";

          try {
            const cachedAuth = await getCachedConversationAuth(data.conversationId);
            if (cachedAuth) {
              buyerId = cachedAuth.buyerId;
              sellerId = cachedAuth.sellerId;
            }
          } catch {
            // ignore
          }

          if (buyerId && sellerId) {
            io.to(buyerId).emit("message_deleted", {
              messageId: data.messageId,
              conversationId: data.conversationId,
            });
            io.to(sellerId).emit("message_deleted", {
              messageId: data.messageId,
              conversationId: data.conversationId,
            });
          } else {
            const conversation = await prisma.conversation.findUnique({
              where: { id: data.conversationId },
            });

            if (conversation) {
              io.to(conversation.buyerId).emit("message_deleted", {
                messageId: data.messageId,
                conversationId: data.conversationId,
              });
              io.to(conversation.sellerId).emit("message_deleted", {
                messageId: data.messageId,
                conversationId: data.conversationId,
              });
            }
          }

          prisma
            .message.deleteMany({
              where: {
                id: data.messageId,
                conversationId: data.conversationId,
                senderId: user.id,
              },
            })
            .catch(console.error);
        } catch (error) {
          console.error("Error deleting message:", error);
        }
      },
    );

    socket.on(
      "delete_conversation",
      async (data: { conversationId: string }) => {
        try {
          const conversation = await prisma.conversation.findUnique({
            where: { id: data.conversationId },
          });

          if (
            !conversation ||
            (conversation.buyerId !== user.id &&
              conversation.sellerId !== user.id)
          ) {
            return;
          }

          if (!conversation.deletedByIds.includes(user.id)) {
            await prisma.conversation.update({
              where: { id: data.conversationId },
              data: { deletedByIds: { push: user.id } },
            });
          }

          io.to(user.id).emit("conversation_deleted", {
            conversationId: data.conversationId,
          });
        } catch (error) {
          console.error("Error deleting conversation:", error);
        }
      },
    );

    socket.on("disconnect", async () => {
      console.log(`User disconnected from socket: ${user.fullName} (${user.id})`);

      try {
        const sockets = await io.in(user.id).fetchSockets();
        if (sockets.length === 0) {
          io.emit("user_offline", user.id);
        }
      } catch (err) {
        console.error("Online status error on disconnect", err);
      }
    });
  });

  return io;
}
