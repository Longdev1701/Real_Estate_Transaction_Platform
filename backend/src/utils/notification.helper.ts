import { NotificationType } from "@prisma/client";

import { prisma } from "../prisma/prisma.service.js";
import { emitToUser } from "./realtime.helper.js";

type CreateNotificationInput = {
  userId: string;
  title: string;
  content: string;
  type: NotificationType;
  relatedId?: string | null;
};

export const createNotification = async (input: CreateNotificationInput) => {
  try {
    if (!input.userId) return null;

    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        content: input.content,
        type: input.type,
        relatedId: input.relatedId,
      },
    });

    emitToUser(input.userId, "notification_created", notification);
    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
};
