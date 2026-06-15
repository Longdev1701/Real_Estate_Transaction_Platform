import { PostStatus } from "@prisma/client";

export const getPostStatusForAppealDecision = (decision: "APPROVE" | "REJECT") =>
  decision === "APPROVE" ? PostStatus.ACTIVE : PostStatus.BANNED;
