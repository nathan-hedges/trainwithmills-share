-- Cycle tracking: opt-in profile, day logs, and Millie's phase guidance.

-- CreateTable
CREATE TABLE "CycleProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contraception" TEXT NOT NULL DEFAULT 'none',
    "avgCycleLength" INTEGER NOT NULL DEFAULT 28,
    "avgPeriodLength" INTEGER NOT NULL DEFAULT 5,
    "shareLevel" TEXT NOT NULL DEFAULT 'minimal',
    "setupByCoachAt" TIMESTAMP(3),
    "consentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CycleProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CycleLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "flow" TEXT,
    "symptoms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mood" INTEGER,
    "sleepQuality" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CycleLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CycleGuidance" (
    "phase" TEXT NOT NULL,
    "training" TEXT NOT NULL,
    "nutrition" TEXT NOT NULL,
    "mindset" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CycleGuidance_pkey" PRIMARY KEY ("phase")
);

-- CreateIndex
CREATE UNIQUE INDEX "CycleProfile_userId_key" ON "CycleProfile"("userId");

-- CreateIndex
CREATE INDEX "CycleLog_userId_date_idx" ON "CycleLog"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CycleLog_userId_date_key" ON "CycleLog"("userId", "date");

-- AddForeignKey
ALTER TABLE "CycleProfile" ADD CONSTRAINT "CycleProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CycleLog" ADD CONSTRAINT "CycleLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
