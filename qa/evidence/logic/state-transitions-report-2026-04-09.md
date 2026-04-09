# Logic State Transitions Report (2026-04-09)

- Command: `npm run test:logic`
- Exit code: `0`
- Duration: `1.5m`

## Result

- Booking transition suite command:
  - `npm run test -- lib/bookings/status.test.ts lib/bookings/cancel.test.ts lib/bookings/reschedule.test.ts lib/bookings/slot-lock.test.ts`
- Expanded transition suite command:
  - `npm run test -- lib/wear-order-lifecycle.test.ts lib/bookings/status.test.ts lib/bookings/cancel.test.ts lib/bookings/reschedule.test.ts lib/bookings/slot-lock.test.ts lib/orders/admin-stripe-order-refund.test.ts lib/commission.test.ts`
- Test files: `7`
- Tests: `35`
- Passed: `35`
- Failed: `0`

## Coverage Notes

- Booking state-machine transition guards (`cancellable`, `reschedulable`, `completable`, cancelled states).
- Role-to-cancel-status mapping (`customer`/`vendor`/`admin`).
- Cancel flow behavior (releases capacity when applicable, rejects already-cancelled).
- Reschedule flow behavior (reserve-before-release ordering, contention handling).
- Slot-lock capacity transition behavior under concurrent reservation/release.
- Wear-order lifecycle transition graph (`pending -> paid -> ... -> shipped/refunded`) and guard predicates.
- Admin order-refund status transitions (`paymentStatus` / `orderStatus`) full-vs-partial behavior.
- Commission logic edge-cases and deterministic rounding/label transitions for checkout messaging.
