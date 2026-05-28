import { z } from "zod";

export const createCommentSchema = z.object({
  postId: z.string().min(1, "Post id is required."),
  content: z.string().min(1, "Comment content cannot be empty.").max(1000, "Comment is too long."),
});

export const getCommentsQuerySchema = z.object({
  postId: z.string().min(1, "Post id is required."),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
});

export const commentIdParamSchema = z.object({
  id: z.string().min(1, "Comment id is required."),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type GetCommentsQueryInput = z.infer<typeof getCommentsQuerySchema>;
