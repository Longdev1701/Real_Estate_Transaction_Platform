ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "replyToUserId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Comment_replyToUserId_fkey'
  ) THEN
    ALTER TABLE "Comment"
    ADD CONSTRAINT "Comment_replyToUserId_fkey"
    FOREIGN KEY ("replyToUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Comment_replyToUserId_idx" ON "Comment"("replyToUserId");
