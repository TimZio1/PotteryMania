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
- Admin finance ledger-adjustment contract suite passes (`lib/api-contract/admin-finance-routes.contract.test.ts`):
  - rejects disallowed manual entry types (`400`)
  - normalizes signed manual adjustment amounts and persists as absolute cents
  - validates credit-direction adjustment path with audit-log side effect
- Finance tie-out suites pass:
  - `lib/finance/profitability.test.ts`
    - validates user-level revenue/cost/profit classification from commission+cost ledger inputs
    - validates stream profitability split (marketplace vs booking) using order-item composition
    - validates proportional shared-cost allocation across transactional streams
  - `lib/finance/aggregate-daily.test.ts`
    - validates daily platform snapshot rollup with manual adjustment debit/credit behavior
    - validates user snapshot revenue/cost/profit rollup from mixed ledger entry types

## Remaining for Full Correctness Claim

- Live-production telemetry tie-out (outside test fixture scope) remains operational monitoring, not correctness uncertainty.

## Status

- **Pass (automated correctness coverage)**; commission rules, checkout split math, ledger idempotency, manual credit/debit adjustment contract behavior, and deterministic finance tie-out rollups are all covered by passing automated suites.
