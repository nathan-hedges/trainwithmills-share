-- Onboarding-call intake: date of birth, lifestyle, injuries, goal, and the
-- cycle-tracking arrangement. Captured on the invite, copied to the User.

ALTER TABLE "User" ADD COLUMN "dateOfBirth" TIMESTAMP(3),
ADD COLUMN "lifestyle" TEXT,
ADD COLUMN "injuries" TEXT;

ALTER TABLE "Invite" ADD COLUMN "dateOfBirth" TIMESTAMP(3),
ADD COLUMN "lifestyle" TEXT,
ADD COLUMN "injuries" TEXT,
ADD COLUMN "goal" TEXT,
ADD COLUMN "cycleTracking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "contraception" TEXT,
ADD COLUMN "avgCycleLength" INTEGER,
ADD COLUMN "avgPeriodLength" INTEGER;
