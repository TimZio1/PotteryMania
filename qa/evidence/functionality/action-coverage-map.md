# Action Coverage Map (2026-04-10)

## Scope

Mapped against the currently executed `test:functionality` gate (`test:smoke` + `test:e2e-role-matrix`).
This map covers release-critical public and authenticated button/form actions that are exercised in the gate.

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
| Marketplace | Public filter form apply + reset | `tests/e2e/smoke/form-actions.spec.ts` | Covered |
| Classes | Public filter form apply + clear | `tests/e2e/smoke/form-actions.spec.ts` | Covered |
| Studios | Public filter form apply + clear | `tests/e2e/smoke/form-actions.spec.ts` | Covered |
| Routing | Public routes load | `tests/e2e/smoke/routes.spec.ts` | Covered |
| Routing | Dashboard/cart guard redirect | `tests/e2e/smoke/routes.spec.ts` | Covered |
| Routing | Admin route behavior | `tests/e2e/smoke/routes.spec.ts` | Covered |

## Current Assessment

- For this release gate scope, mapped button/form actions are **100% covered and passing**.
- Validation run: `npm run test:functionality` -> passed (`13` smoke + `18` role-matrix tests).
