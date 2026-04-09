# Action Coverage Map (2026-04-09)

## Scope

Mapped against currently executed smoke/role-matrix suites.

## Covered Actions

| Area | Action | Covered By | Status |
|---|---|---|---|
| Auth | Login invalid credentials | `tests/e2e/smoke/auth.spec.ts` | Covered |
| Auth | Login success + session persistence | `tests/e2e/smoke/auth.spec.ts` | Covered |
| Auth | Logout blocks protected route | `tests/e2e/smoke/auth.spec.ts` | Covered |
| Early Access | Submit desktop form | `tests/e2e/smoke/early-access.spec.ts` | Covered |
| Early Access | Submit mobile form | `tests/e2e/smoke/early-access.spec.ts` | Covered |
| Early Access | Duplicate email handling | `tests/e2e/smoke/early-access.spec.ts` | Covered |
| Product | Vendor creates product | `tests/e2e/smoke/product-create.spec.ts` | Covered |
| Booking | Class slot to cart | `tests/e2e/smoke/booking.spec.ts` | Covered |
| Booking | Booking UI mobile route | `tests/e2e/smoke/booking.spec.ts` | Covered |
| Checkout | Continue to payment (booking line) | `tests/e2e/smoke/checkout.spec.ts` | Covered |
| Routing | Public routes load | `tests/e2e/smoke/routes.spec.ts` | Covered |
| Routing | Dashboard/cart guard redirect | `tests/e2e/smoke/routes.spec.ts` | Covered |
| Routing | Admin route behavior | `tests/e2e/smoke/routes.spec.ts` | Covered |

## Gaps (Not yet covered end-to-end)

- Full refund paths (partial/full/multi-item) with post-checkout assertions.
- Commission and credits correctness assertions on completed orders.
- Privilege escalation and abuse-path scenario matrix.
- Hyperadmin deep operational flows beyond route access.
- UI action map for all major forms (settings, feature controls, billing controls).

## Current Assessment

- Action coverage is improving but **not yet 100%** against full release gate expectations.
