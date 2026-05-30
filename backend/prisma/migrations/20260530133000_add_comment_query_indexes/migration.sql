CREATE INDEX IF NOT EXISTS "Comment_postId_parentId_createdAt_idx" ON "Comment"("postId", "parentId", "createdAt");
CREATE INDEX IF NOT EXISTS "Comment_parentId_createdAt_idx" ON "Comment"("parentId", "createdAt");
