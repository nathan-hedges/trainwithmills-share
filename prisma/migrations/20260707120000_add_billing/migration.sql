-- Billing fields (all additive; stripeCustomerId starts NULL for everyone, so
-- the unique index cannot conflict).
ALTER TABLE "User"
  ADD COLUMN "stripeCustomerId" TEXT,
  ADD COLUMN "subscriptionStatus" TEXT,
  ADD COLUMN "billingExempt" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
