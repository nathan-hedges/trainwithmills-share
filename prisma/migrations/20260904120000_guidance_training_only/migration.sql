-- Cycle guidance is training-only now: nutrition and mindset are dropped.
ALTER TABLE "CycleGuidance" DROP COLUMN "nutrition";
ALTER TABLE "CycleGuidance" DROP COLUMN "mindset";
