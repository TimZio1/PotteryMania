-- Unique constraint: Order.stripeCheckoutSessionId (webhook idempotency)
CREATE UNIQUE INDEX "orders_stripe_checkout_session_id_key"
  ON "orders" ("stripe_checkout_session_id")
  WHERE "stripe_checkout_session_id" IS NOT NULL;

-- Payment indexes
CREATE INDEX "payments_order_id_idx" ON "payments" ("order_id");
CREATE INDEX "payments_provider_payment_id_idx" ON "payments" ("provider_payment_id");

-- CartItem indexes (zero indexes before this migration)
CREATE INDEX "cart_items_cart_id_idx" ON "cart_items" ("cart_id");
CREATE INDEX "cart_items_vendor_id_idx" ON "cart_items" ("vendor_id");
CREATE INDEX "cart_items_product_id_idx" ON "cart_items" ("product_id");
CREATE INDEX "cart_items_experience_id_idx" ON "cart_items" ("experience_id");
CREATE INDEX "cart_items_slot_id_idx" ON "cart_items" ("slot_id");

-- Cart indexes
CREATE INDEX "carts_user_id_idx" ON "carts" ("user_id");
CREATE INDEX "carts_session_token_idx" ON "carts" ("session_token");

-- Studio.ownerUserId
CREATE INDEX "studios_owner_user_id_idx" ON "studios" ("owner_user_id");

-- BookingCancellation
CREATE INDEX "booking_cancellations_booking_id_idx" ON "booking_cancellations" ("booking_id");

-- BookingReschedule
CREATE INDEX "booking_reschedules_booking_id_idx" ON "booking_reschedules" ("booking_id");

-- OrderItem (orderId + bookingId — vendorId already exists)
CREATE INDEX "order_items_order_id_idx" ON "order_items" ("order_id");
CREATE INDEX "order_items_booking_id_idx" ON "order_items" ("booking_id");

-- CalendarConnection
CREATE INDEX "calendar_connections_studio_id_idx" ON "calendar_connections" ("studio_id");

-- ShippingRateQuote.orderId
CREATE INDEX "shipping_rate_quotes_order_id_idx" ON "shipping_rate_quotes" ("order_id");

-- BookingAuditLog
CREATE INDEX "booking_audit_log_booking_id_idx" ON "booking_audit_log" ("booking_id");
