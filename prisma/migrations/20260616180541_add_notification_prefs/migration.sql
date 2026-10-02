-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notifyMessages" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyReminders" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifySummary" BOOLEAN NOT NULL DEFAULT true;
