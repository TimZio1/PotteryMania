-- One `stripe_subscription_ended` row per catalog feature per Stripe subscription id (concurrent cancel + webhook, retries).
CREATE UNIQUE INDEX "studio_feature_activation_events_feature_sub_ended_uidx"
ON "studio_feature_activation_events" ("feature_id", "stripe_subscription_id")
WHERE kind = 'stripe_subscription_ended' AND "stripe_subscription_id" IS NOT NULL;
