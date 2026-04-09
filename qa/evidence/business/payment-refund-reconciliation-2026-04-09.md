# Payment/Refund Reconciliation Unit Report (2026-04-09)

## Command

- `npx vitest run lib/orders/admin-stripe-order-refund.test.ts`

## Result

- Test files: `1`
- Tests: `9`
- Passed: `9`
- Failed: `0`

## Coverage Notes

- Snapshot and refundability logic.
- Full and partial refund behavior.
- Refund status transition assertions on `Payment` + `Order` rows.
- Connect refund options (`reverse_transfer`, `refund_application_fee`).
- Amount-capping behavior when requested refund exceeds remaining refundable balance.
- Validation guard for non-positive refund amounts.
- Error mapping for refund failures.
