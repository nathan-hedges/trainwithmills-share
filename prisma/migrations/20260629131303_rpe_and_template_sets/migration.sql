/*
  Warnings:

 - You are about to drop the column `setCount` on the `TemplateExercise` table. All the data in the column will be lost.
 - You are about to drop the column `targetReps` on the `TemplateExercise` table. All the data in the column will be lost.
 - You are about to drop the column `targetWeight` on the `TemplateExercise` table. All the data in the column will be lost.
 - You are about to drop the column `targetWeight` on the `WorkoutSet` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TemplateExercise" DROP COLUMN "setCount",
DROP COLUMN "targetReps",
DROP COLUMN "targetWeight";

-- AlterTable
ALTER TABLE "WorkoutSet" DROP COLUMN "targetWeight",
ADD COLUMN     "targetRpe" TEXT;

-- CreateTable
CREATE TABLE "TemplateSet" (
    "id" TEXT NOT NULL,
    "templateExerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "targetReps" INTEGER NOT NULL DEFAULT 10,
    "targetRpe" TEXT,

    CONSTRAINT "TemplateSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TemplateSet_templateExerciseId_idx" ON "TemplateSet"("templateExerciseId");

-- AddForeignKey
ALTER TABLE "TemplateSet" ADD CONSTRAINT "TemplateSet_templateExerciseId_fkey" FOREIGN KEY ("templateExerciseId") REFERENCES "TemplateExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
