UPDATE "Comment" AS reply
SET "replyToUserId" = parent."authorId"
FROM "Comment" AS parent
WHERE reply."parentId" = parent."id"
  AND reply."replyToUserId" IS NULL;
