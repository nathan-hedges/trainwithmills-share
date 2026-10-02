-- AlterTable
ALTER TABLE "WorkoutExercise" ADD COLUMN     "optOutNote" TEXT,
ADD COLUMN     "optedOut" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SelfWorkout" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SelfWorkout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SelfWorkout_clientId_date_idx" ON "SelfWorkout"("clientId", "date");

-- AddForeignKey
ALTER TABLE "SelfWorkout" ADD CONSTRAINT "SelfWorkout_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
