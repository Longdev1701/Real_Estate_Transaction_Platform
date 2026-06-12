import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  createOrGetConversation,
  getConversations,
  getUnreadCount,
  getConversationMessages,
  markMessagesAsRead,
  uploadChatImage,
  editMessage,
  deleteMessage,
  deleteConversation
} from "./conversation.controllers.js";
import { postImageUpload } from "../middlewares/upload.middleware.js";

export const conversationRoutes = Router();

conversationRoutes.use(authenticate);

conversationRoutes.post("/", createOrGetConversation);
conversationRoutes.get("/", getConversations);
conversationRoutes.get("/unread-count", getUnreadCount);
conversationRoutes.get("/:id/messages", getConversationMessages);
conversationRoutes.patch("/:id/read", markMessagesAsRead);
conversationRoutes.post("/:id/images", postImageUpload.single("image"), uploadChatImage);

// New routes for edit/delete
conversationRoutes.patch("/:id/messages/:messageId", editMessage);
conversationRoutes.delete("/:id/messages/:messageId", deleteMessage);
conversationRoutes.delete("/:id", deleteConversation);
