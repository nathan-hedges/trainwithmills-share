-- AlterTable
ALTER TABLE "User" ADD COLUMN     "goal" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "program" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';
