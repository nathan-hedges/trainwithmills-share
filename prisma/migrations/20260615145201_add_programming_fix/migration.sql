/*
  Warnings:

 - You are about to drop the column `notes` on the `WorkoutExercise` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Template" DROP CONSTRAINT "Template_coachId_fkey";

-- AlterTable
ALTER TABLE "WorkoutExercise" DROP COLUMN "notes",
ADD COLUMN     "note" TEXT;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
