-- CreateEnum
CREATE TYPE "Result" AS ENUM ('win', 'loss');

-- AlterTable: cast existing text values to the new enum type, preserving all rows
ALTER TABLE "Match" ALTER COLUMN "result" TYPE "Result" USING "result"::"Result";
