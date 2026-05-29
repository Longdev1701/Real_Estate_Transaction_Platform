import { prisma } from "../prisma/prisma.service.js";

type CreateSystemLogInput = {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  description?: string;
};

export const createSystemLog = async (input: CreateSystemLogInput) => {
  try {
    await prisma.systemLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        description: input.description,
      },
    });
  } catch (error) {
    // Log creation should never break the main flow
    console.error("Failed to create system log:", error);
  }
};
