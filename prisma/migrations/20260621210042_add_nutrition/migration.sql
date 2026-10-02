-- AlterTable
ALTER TABLE "User" ADD COLUMN     "nutritionTier" TEXT NOT NULL DEFAULT 'student';

-- CreateTable
CREATE TABLE "NutritionProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bodyWeightKg" DOUBLE PRECISION,
    "proteinMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.6,
    "stepsGoal" INTEGER NOT NULL DEFAULT 10000,
    "sleepGoal" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "waterGoal" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "fiveADayGoal" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "protein" INTEGER NOT NULL DEFAULT 0,
    "steps" INTEGER NOT NULL DEFAULT 0,
    "sleep" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "water" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fiveADay" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NutritionProfile_userId_key" ON "NutritionProfile"("userId");

-- CreateIndex
CREATE INDEX "NutritionLog_userId_date_idx" ON "NutritionLog"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "NutritionLog_userId_date_key" ON "NutritionLog"("userId", "date");

-- AddForeignKey
ALTER TABLE "NutritionProfile" ADD CONSTRAINT "NutritionProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionLog" ADD CONSTRAINT "NutritionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
