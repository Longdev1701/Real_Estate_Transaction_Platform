UPDATE "PropertyPost"
SET "postType" = 'RENT'
WHERE "postType" = 'FIND';

ALTER TYPE "PostType" RENAME TO "PostType_old";

CREATE TYPE "PostType" AS ENUM ('SELL', 'RENT');

ALTER TABLE "PropertyPost"
  ALTER COLUMN "postType" TYPE "PostType"
  USING "postType"::text::"PostType";

DROP TYPE "PostType_old";
