# Commission/Credit Audit (2026-04-09)

## Current Evidence Inputs

- Checkout/booking flows pass in smoke suites.
- Refund logic unit suite passes (`lib/orders/admin-stripe-order-refund.test.ts`).
- Commission helper unit suite passes (`lib/commission.test.ts`):
  - vendor/global commission rule precedence
  - admin-config fallback behavior
  - commission cents rounding behavior
  - marketing label generation for equal/range basis points
- Checkout commission-line construction suite passes (`lib/checkout-line-rows.test.ts`):
  - product-line commission and vendor split math
  - booking deposit-line commission math on charged amount
  - multi-vendor cart split guard (409) to prevent cross-studio leakage
- Ledger idempotency suite passes (`lib/finance/ledger.test.ts`):
  - absolute amount normalization
  - duplicate dedupe-key (`P2002`) swallow behavior
  - non-duplicate persistence error propagation

## Remaining for Full Correctness Claim

- End-to-end audited sample set of completed orders with:
  - expected commission
  - expected vendor amount
  - expected credit/adjustment behavior
- Ledger tie-out artifact for audited sample.

## Status

- **Partial (expanded coverage)**; commission and ledger idempotency primitives are now unit-covered with checkout-line assertions, but full DB-backed audited sample tie-out and credit-adjustment reconciliation remain pending.
