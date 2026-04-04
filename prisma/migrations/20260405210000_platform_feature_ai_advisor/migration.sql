-- AI Advisor add-on (platform catalog; grant-all by default for launch)
INSERT INTO "platform_features" ("id", "slug", "name", "description", "category", "price_cents", "currency", "is_active", "visibility", "grant_by_default", "sort_order", "stripe_price_id", "created_at", "updated_at")
VALUES (
  gen_random_uuid(),
  'ai_advisor',
  'AI Advisor',
  'Ask for pricing, scheduling, and growth ideas grounded in your studio''s activity on PotteryMania.',
  'addons',
  700,
  'EUR',
  true,
  'public',
  true,
  80,
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
