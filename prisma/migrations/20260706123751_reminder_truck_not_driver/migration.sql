/*
  Warnings:

  - You are about to drop the column `driverId` on the `reminders` table. All the data in the column will be lost.
  - Added the required column `truckId` to the `reminders` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "reminders" DROP CONSTRAINT "reminders_driverId_fkey";

-- DropIndex
DROP INDEX "reminders_driverId_idx";

-- AlterTable
ALTER TABLE "reminders" DROP COLUMN "driverId",
ADD COLUMN     "truckId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "reminders_truckId_idx" ON "reminders"("truckId");

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "trucks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
