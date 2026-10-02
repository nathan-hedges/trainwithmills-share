-- AlterTable
ALTER TABLE "TemplateDay" ADD COLUMN     "warmup" TEXT;

-- AlterTable
ALTER TABLE "TemplateExercise" ADD COLUMN     "groupKey" TEXT,
ADD COLUMN     "groupType" TEXT;

-- AlterTable
ALTER TABLE "Workout" ADD COLUMN     "warmup" TEXT;

-- AlterTable
ALTER TABLE "WorkoutExercise" ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "groupType" TEXT;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
