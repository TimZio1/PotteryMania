-- Speed up customer booking history queries (`/api/my-bookings`).
CREATE INDEX "bookings_customer_user_id_idx"
ON "bookings"("customer_user_id");
