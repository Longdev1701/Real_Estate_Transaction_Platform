CREATE TYPE "AppealStatus" AS ENUM ('NONE', 'PENDING', 'REVIEWED');

ALTER TABLE "Report"
ADD COLUMN "appealStatus" "AppealStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN "appealMessage" TEXT,
ADD COLUMN "appealEvidence" TEXT,
ADD COLUMN "appealedAt" TIMESTAMP(3);
