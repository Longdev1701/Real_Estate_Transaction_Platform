import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { verifyAccessToken } from "../utils/jwt.js";
import { prisma } from "../prisma/prisma.service.js";

export interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

const onlineUsers = new Map<string, number>();

export function initializeSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*", // Adjust for production
      methods: ["GET", "POST"]
    }
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
    
    // Handle Online Status
    const count = onlineUsers.get(user.id) || 0;
    onlineUsers.set(user.id, count + 1);
    if (count === 0) {
      io.emit("user_online", user.id);
    }
    
    socket.on("check_online_status", (userId: string) => {
      socket.emit("online_status_result", {
        userId,
        isOnline: onlineUsers.has(userId) && (onlineUsers.get(userId) || 0) > 0
      });
    });

    // Auto-join personal room to receive messages anywhere
    socket.join(user.id);

    socket.on("join_room", (conversationId: string) => {
      socket.join(conversationId); // Still keep this for backwards compatibility or specific needs
      console.log(`User ${user.id} joined conversation: ${conversationId}`);
    });

    socket.on("send_message", async (data: { conversationId: string; content: string; messageType?: string }) => {
      try {
        const { conversationId, content, messageType = "TEXT" } = data;

        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId }
        });

        if (!conversation || (conversation.buyerId !== user.id && conversation.sellerId !== user.id)) {
          return socket.emit("error", { message: "Unauthorized or conversation not found" });
        }

        const message = await prisma.message.create({
          data: {
            conversationId,
            senderId: user.id,
            content,
            messageType: messageType as any,
          },
          include: {
            sender: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true
              }
            }
          }
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() }
        });

        // Emit to both buyer and seller personal rooms
        io.to(conversation.buyerId).emit("receive_message", message);
        io.to(conversation.sellerId).emit("receive_message", message);
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
          where: { id: data.messageId, conversationId: data.conversationId, senderId: user.id }
        });
        if (!message || message.messageType !== "TEXT") return;

        const updatedMessage = await prisma.message.update({
          where: { id: data.messageId },
          data: { content: data.content, isEdited: true },
          include: { sender: { select: { id: true, fullName: true, avatarUrl: true } } }
        });

        const conversation = await prisma.conversation.findUnique({ where: { id: data.conversationId } });
        if (conversation) {
          io.to(conversation.buyerId).emit("message_edited", updatedMessage);
          io.to(conversation.sellerId).emit("message_edited", updatedMessage);
        }
      } catch (error) {
        console.error("Error editing message:", error);
      }
    });

    socket.on("delete_message", async (data: { messageId: string, conversationId: string }) => {
      try {
        const message = await prisma.message.findFirst({
          where: { id: data.messageId, conversationId: data.conversationId, senderId: user.id }
        });
        if (!message) return;

        await prisma.message.delete({ where: { id: data.messageId } });

        const conversation = await prisma.conversation.findUnique({ where: { id: data.conversationId } });
        if (conversation) {
          io.to(conversation.buyerId).emit("message_deleted", { messageId: data.messageId, conversationId: data.conversationId });
          io.to(conversation.sellerId).emit("message_deleted", { messageId: data.messageId, conversationId: data.conversationId });
        }
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

    socket.on("disconnect", () => {
      console.log(`User disconnected from socket: ${user.fullName} (${user.id})`);
      const count = onlineUsers.get(user.id) || 0;
      if (count <= 1) {
        onlineUsers.delete(user.id);
        io.emit("user_offline", user.id);
      } else {
        onlineUsers.set(user.id, count - 1);
      }
    });
  });

  return io;
}
