-- CreateEnum
CREATE TYPE "CenterServiceStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "Center"
  ADD COLUMN "serviceStatus" "CenterServiceStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "suspensionReason" TEXT,
  ADD COLUMN "suspendedAt" TIMESTAMP(3);
