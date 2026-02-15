-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN "staffId" TEXT;

-- CreateIndex
CREATE INDEX "Reservation_staffId_startAt_idx" ON "Reservation"("staffId", "startAt");

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
