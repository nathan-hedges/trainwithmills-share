-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "read" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verdict" TEXT,
ADD COLUMN     "verdictNote" TEXT,
ADD COLUMN     "videoKey" TEXT,
ALTER COLUMN "text" SET DEFAULT '';
