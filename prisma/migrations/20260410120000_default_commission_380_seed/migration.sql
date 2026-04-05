-- P5-K: Ensure new/provisioned DBs default to 380 bps (3.8%) when nothing was configured.
-- Does not overwrite existing admin_configs or active global commission_rules.

INSERT INTO "admin_configs" ("id", "config_key", "config_value", "created_at", "updated_at")
SELECT gen_random_uuid(), 'default_product_commission_bps', '{"bps": 380}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "admin_configs" WHERE "config_key" = 'default_product_commission_bps'
);

INSERT INTO "commission_rules" (
  "id",
  "studio_id",
  "rule_scope",
  "item_type",
  "percentage_basis_points",
  "is_active",
  "created_at",
  "updated_at"
)
SELECT gen_random_uuid(), NULL, 'global', 'product', 380, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1
  FROM "commission_rules"
  WHERE "rule_scope" = 'global'
    AND "studio_id" IS NULL
    AND "item_type" = 'product'
    AND "is_active" = true
);

INSERT INTO "commission_rules" (
  "id",
  "studio_id",
  "rule_scope",
  "item_type",
  "percentage_basis_points",
  "is_active",
  "created_at",
  "updated_at"
)
SELECT gen_random_uuid(), NULL, 'global', 'booking', 380, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1
  FROM "commission_rules"
  WHERE "rule_scope" = 'global'
    AND "studio_id" IS NULL
    AND "item_type" = 'booking'
    AND "is_active" = true
);
