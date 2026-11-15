-- Additive: quorum snapshot stamped on each decision.
ALTER TABLE "decisions" ADD COLUMN IF NOT EXISTS "quorum" jsonb;
