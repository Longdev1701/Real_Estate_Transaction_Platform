import { z } from "zod";

export const savedPostBodySchema = z.object({
  postId: z.string().min(1, "Post id is required."),
});

export const savedPostParamSchema = z.object({
  postId: z.string().min(1, "Post id is required."),
});

export const bulkSavedPostBodySchema = z.object({
  postIds: z
    .array(z.string().min(1, "Post id is required."))
    .min(1, "At least one post id is required."),
});

export type SavedPostBodyInput = z.infer<typeof savedPostBodySchema>;
