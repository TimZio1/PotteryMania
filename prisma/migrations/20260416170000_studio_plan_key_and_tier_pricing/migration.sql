DO $$
BEGIN
  CREATE TYPE "StudioPlanKey" AS ENUM ('bookings', 'shop', 'both', 'pro');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE "studios"
ADD COLUMN IF NOT EXISTS "plan_key" "StudioPlanKey";
