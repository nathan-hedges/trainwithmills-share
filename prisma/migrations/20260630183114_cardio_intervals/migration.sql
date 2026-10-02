-- AlterTable
ALTER TABLE "TemplateSet" ADD COLUMN     "pace" TEXT,
ADD COLUMN     "restSeconds" INTEGER,
ADD COLUMN     "workSeconds" INTEGER;

-- AlterTable
ALTER TABLE "WorkoutSet" ADD COLUMN     "loggedDistance" DOUBLE PRECISION,
ADD COLUMN     "loggedPace" TEXT,
ADD COLUMN     "pace" TEXT,
ADD COLUMN     "restSeconds" INTEGER,
ADD COLUMN     "workSeconds" INTEGER,
ALTER COLUMN "targetReps" SET DEFAULT 0;
