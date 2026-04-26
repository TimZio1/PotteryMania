-- Wear order ops escalation when Spreadconnect submit fails (audit ID 0019)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WearOrderStatus') THEN
    ALTER TYPE "WearOrderStatus" ADD VALUE IF NOT EXISTS 'manual_review';
  END IF;
END
$$;
