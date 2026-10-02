-- Split the workout check-in into before (energy + cycle phase) and after
-- (energy + note). Existing rows keep their `energy` as the after value.
ALTER TABLE "CheckIn" ADD COLUMN "energyBefore" INTEGER;
ALTER TABLE "CheckIn" ALTER COLUMN "energy" DROP NOT NULL;
