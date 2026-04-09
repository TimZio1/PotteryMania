# Concurrency Report (2026-04-09)

## Command

- `npx vitest run lib/bookings/slot-lock.test.ts`
- `npm run test -- lib/bookings/slot-lock.test.ts lib/coupon-redemption-lock.test.ts`

## Result

- Test files: `2`
- Tests: `9`
- Passed: `9`
- Failed: `0`

## Coverage Notes

- Capacity reservation/release transitions.
- Overbooking rejection for seat-type constrained slots.
- Full-to-open status transitions under release.
- Coupon redemption row lock (`FOR UPDATE`) serialization coverage.
- Redemption-capacity checks under max/unlimited/at-limit scenarios.
