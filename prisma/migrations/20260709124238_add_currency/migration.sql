-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('SOM', 'USD');

-- AlterTable
ALTER TABLE "ledger_entries" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'SOM';
