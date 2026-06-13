import { z } from "zod";

export const postLikeBodySchema = z.object({
  postId: z.string().min(1, "Post id is required."),
});

export const postLikeParamSchema = z.object({
  postId: z.string().min(1, "Post id is required."),
});

export type PostLikeBodyInput = z.infer<typeof postLikeBodySchema>;
