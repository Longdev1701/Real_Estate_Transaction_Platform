import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { verifyAccessToken } from "../utils/jwt.js";
import { prisma } from "../prisma/prisma.service.js";
import { createAdapter } from "@socket.io/redis-adapter";
import { pubClient, subClient, redisClient } from "../config/redis.js";

export interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

export function initializeSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*", // Adjust for production
      methods: ["GET", "POST"]
    },
    adapter: createAdapter(pubClient, subClient)
  });

  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error: Token missing"));
      }

      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, fullName: true, avatarUrl: true }
      });

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    const user = socket.user;
    if (!user) return;

    console.log(`User connected to socket: ${user.fullName} (${user.id})`);
    
    // Handle Online Status via Redis
    (async () => {
      try {
        const countStr = await redisClient.hGet("onlineUsers", user.id);
        const count = countStr ? parseInt(countStr, 10) : 0;
        await redisClient.hSet("onlineUsers", user.id, count + 1);
        if (count === 0) {
          io.emit("user_online", user.id);
        }
      } catch (err) {
        console.error("Redis error on connect", err);
      }
    })();
    
    socket.on("check_online_status", async (userId: string) => {
      try {
        const countStr = await redisClient.hGet("onlineUsers", userId);
        const count = countStr ? parseInt(countStr, 10) : 0;
        socket.emit("online_status_result", {
          userId,
          isOnline: count > 0
        });
      } catch (err) {
        // Fallback or ignore
      }
    });

    // Auto-join personal room to receive messages anywhere
    socket.join(user.id);

    socket.on("join_room", (conversationId: string) => {
      socket.join(conversationId); // Still keep this for backwards compatibility or specific needs
      console.log(`User ${user.id} joined conversation: ${conversationId}`);
    });

    socket.on("send_message", async (data: { conversationId: string; content: string; messageType?: string; tempId?: string }) => {
      try {
        const { conversationId, content, messageType = "TEXT", tempId } = data;

        // 1. Check permissions
        const cacheKey = `conv_auth:${conversationId}`;
        let authorized = false;
        let buyerId = "";
        let sellerId = "";
        
        try {
          const cachedAuth = await redisClient.get(cacheKey);
          if (cachedAuth) {
            const parsed = JSON.parse(cachedAuth);
            buyerId = parsed.buyerId;
            sellerId = parsed.sellerId;
            authorized = (buyerId === user.id || sellerId === user.id);
          }
        } catch (e) { console.error(e); }

        if (!buyerId || !sellerId) {
          const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { buyerId: true, sellerId: true }
          });
          if (!conversation || (conversation.buyerId !== user.id && conversation.sellerId !== user.id)) {
            return socket.emit("error", { message: "Unauthorized or conversation not found" });
          }
          buyerId = conversation.buyerId;
          sellerId = conversation.sellerId;
          authorized = true;
          // Cache for 1 hour
          redisClient.setEx(cacheKey, 3600, JSON.stringify({ buyerId, sellerId })).catch(console.error);
        }

        if (!authorized) return socket.emit("error", { message: "Unauthorized" });

        // Generate optimistic message for emit
        const tempMessage = {
          id: tempId || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
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
            avatarUrl: user.avatarUrl
          }
        };

        // 2. Emit immediately (Fire and Forget)
        io.to(buyerId).emit("receive_message", tempMessage);
        io.to(sellerId).emit("receive_message", tempMessage);

        // 3. Persist to DB in the background
        Promise.allSettled([
          prisma.message.create({
            data: {
              id: tempId ? undefined : tempMessage.id,
              conversationId,
              senderId: user.id,
              content,
              messageType: messageType as any,
            }
          }),
          prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() }
          })
        ]).then((results) => {
          if (results[0].status === "rejected") {
            console.error("Failed to persist message:", results[0].reason);
            // Optionally emit rollback to sender
            socket.emit("error", { message: "Failed to persist message", tempId });
          }
        });

      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    socket.on("typing", (data: { conversationId: string }) => {
      socket.to(data.conversationId).emit("user_typing", { 
        conversationId: data.conversationId, 
        userId: user.id 
      });
    });

    socket.on("stop_typing", (data: { conversationId: string }) => {
      socket.to(data.conversationId).emit("user_stop_typing", { 
        conversationId: data.conversationId, 
        userId: user.id 
      });
    });

    socket.on("mark_read", (data: { conversationId: string }) => {
      socket.to(data.conversationId).emit("messages_read", { 
        conversationId: data.conversationId, 
        userId: user.id 
      });
    });

    socket.on("edit_message", async (data: { messageId: string, conversationId: string, content: string }) => {
      try {
        const message = await prisma.message.findFirst({
          where: { id: data.messageId, conversationId: data.conversationId, senderId: user.id },
          include: { sender: { select: { id: true, fullName: true, avatarUrl: true } } }
        });
        if (!message || message.messageType !== "TEXT") return;

        // Emit immediately (Emit-First)
        const updatedMessage = { ...message, content: data.content, isEdited: true };
        
        const cacheKey = `conv_auth:${data.conversationId}`;
        let buyerId = "";
        let sellerId = "";
        try {
          const cachedAuth = await redisClient.get(cacheKey);
          if (cachedAuth) {
            const parsed = JSON.parse(cachedAuth);
            buyerId = parsed.buyerId;
            sellerId = parsed.sellerId;
          }
        } catch (e) {}

        if (buyerId && sellerId) {
          io.to(buyerId).emit("message_edited", updatedMessage);
          io.to(sellerId).emit("message_edited", updatedMessage);
        } else {
          const conversation = await prisma.conversation.findUnique({ where: { id: data.conversationId } });
          if (conversation) {
            io.to(conversation.buyerId).emit("message_edited", updatedMessage);
            io.to(conversation.sellerId).emit("message_edited", updatedMessage);
          }
        }

        // Persist to DB in background
        prisma.message.update({
          where: { id: data.messageId },
          data: { content: data.content, isEdited: true }
        }).catch(console.error);

      } catch (error) {
        console.error("Error editing message:", error);
      }
    });

    socket.on("delete_message", async (data: { messageId: string, conversationId: string }) => {
      try {
        // Emit immediately (Emit-First)
        const cacheKey = `conv_auth:${data.conversationId}`;
        let buyerId = "";
        let sellerId = "";
        try {
          const cachedAuth = await redisClient.get(cacheKey);
          if (cachedAuth) {
            const parsed = JSON.parse(cachedAuth);
            buyerId = parsed.buyerId;
            sellerId = parsed.sellerId;
          }
        } catch (e) {}

        if (buyerId && sellerId) {
          io.to(buyerId).emit("message_deleted", { messageId: data.messageId, conversationId: data.conversationId });
          io.to(sellerId).emit("message_deleted", { messageId: data.messageId, conversationId: data.conversationId });
        } else {
          const conversation = await prisma.conversation.findUnique({ where: { id: data.conversationId } });
          if (conversation) {
            io.to(conversation.buyerId).emit("message_deleted", { messageId: data.messageId, conversationId: data.conversationId });
            io.to(conversation.sellerId).emit("message_deleted", { messageId: data.messageId, conversationId: data.conversationId });
          }
        }

        // Persist to DB in background
        prisma.message.deleteMany({
          where: { id: data.messageId, conversationId: data.conversationId, senderId: user.id }
        }).catch(console.error);

      } catch (error) {
        console.error("Error deleting message:", error);
      }
    });

    socket.on("delete_conversation", async (data: { conversationId: string }) => {
      try {
        const conversation = await prisma.conversation.findUnique({ where: { id: data.conversationId } });
        if (!conversation || (conversation.buyerId !== user.id && conversation.sellerId !== user.id)) return;

        if (!conversation.deletedByIds.includes(user.id)) {
          await prisma.conversation.update({
            where: { id: data.conversationId },
            data: { deletedByIds: { push: user.id } }
          });
        }
        
        io.to(user.id).emit("conversation_deleted", { conversationId: data.conversationId });
      } catch (error) {
        console.error("Error deleting conversation:", error);
      }
    });

    socket.on("disconnect", async () => {
      console.log(`User disconnected from socket: ${user.fullName} (${user.id})`);
      try {
        const countStr = await redisClient.hGet("onlineUsers", user.id);
        const count = countStr ? parseInt(countStr, 10) : 0;
        if (count <= 1) {
          await redisClient.hDel("onlineUsers", user.id);
          io.emit("user_offline", user.id);
        } else {
          await redisClient.hSet("onlineUsers", user.id, count - 1);
        }
      } catch (err) {
        console.error("Redis error on disconnect", err);
      }
    });
  });

  return io;
}
