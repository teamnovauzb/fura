-- CreateEnum
CREATE TYPE "ExpenseKind" AS ENUM ('GENERAL', 'SALARY', 'CAR');

-- AlterTable
ALTER TABLE "ledger_entries" ADD COLUMN     "kind" "ExpenseKind" NOT NULL DEFAULT 'GENERAL';
