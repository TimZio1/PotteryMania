# PotteryMania — Upgrade Plan: 6.5 → 9.0+

> Generated from full technical due diligence audit.
> Each task has: severity, current score impact, expected score after fix, and implementation notes.

---

## Current Scores → Target

| Dimension              | Current | Target | Gap   |
|------------------------|---------|--------|-------|
| Architecture           | 7.0     | 9.0    | +2.0  |
| Security               | 6.5     | 9.0    | +2.5  |
| Payment integrity      | 6.0     | 9.5    | +3.5  |
| Test coverage          | 5.0     | 8.5    | +3.5  |
| Feature completeness   | 7.0     | 9.0    | +2.0  |
| Code quality           | 6.0     | 9.0    | +3.0  |
| Deployment readiness   | 7.5     | 9.5    | +2.0  |
| **Overall**            | **6.5** | **9.0+** | **+2.5+** |

---

## PHASE 1 — CRITICAL MONEY BUGS (Score impact: 6.0 → 8.5 payment)

### P1-01: Fix Stripe Connect refunds (CRITICAL)
- **File**: `lib/bookings/stripe-refund-booking.ts`
- **File**: `lib/orders/admin-stripe-order-refund.ts`
- **Bug**: `stripe.refunds.create()` missing `{ stripeAccount }` option
- **Impact**: Refunds against Connect PaymentIntents will fail or hit wrong account
- **Fix**: Look up `StripeAccount.stripeAccountId` via order→items→vendor→stripeAccount, pass as option

### P1-02: Add unique constraint on Order.stripeCheckoutSessionId
- **File**: `prisma/schema.prisma` (Order model)
- **Bug**: Session ID not unique — webhook idempotency can create duplicate rows
- **Fix**: Add `@unique` on `stripeCheckoutSessionId` field + migration

### P1-03: Add indexes on Payment.orderId and OrderItem.orderId
- **File**: `prisma/schema.prisma` (Payment, OrderItem models)
- **Bug**: No indexes on most-queried FK columns in financial tables
- **Fix**: Add `@@index([orderId])` to both models + migration

### P1-04: Pin Stripe API version in lib/stripe.ts
- **File**: `lib/stripe.ts`
- **Bug**: No `apiVersion` set — uses SDK default which can change on update
- **Fix**: Add explicit `apiVersion: "2024-12-18.acacia"` (or current)

---

## PHASE 2 — SECURITY HARDENING (Score impact: 6.5 → 9.0 security)

### P2-01: Authenticate upload signing endpoint
- **File**: `app/api/uploads/public-sign/route.ts`
- **Bug**: No auth check — anyone can request signed upload URLs
- **Fix**: Require `getSessionUser()` or restrict to authenticated users only

### P2-02: Require VENDOR_DOMAIN_RESOLVE_SECRET in production
- **File**: `app/api/vendor-domains/resolve/route.ts`
- **Bug**: Secret check skipped when env var unset — any caller can map hosts to studioIds
- **Fix**: Return 403 when secret is missing in production

### P2-03: Sanitize error messages in API responses
- **Files**: `app/api/bookings/pay-at-studio/route.ts`, `app/api/studios/[studioId]/guided/suggest/route.ts`
- **Bug**: Raw `e.message` returned to clients — leaks internal details
- **Fix**: Return generic error message, log details server-side via `logApiError`

### P2-04: Add global-error.tsx for root layout errors
- **File**: `app/global-error.tsx` (new)
- **Bug**: Errors in root layout have no boundary — shows raw Next.js error page
- **Fix**: Create App Router `global-error.tsx` with Sentry capture + user-friendly UI

### P2-05: Protect review author email from public API
- **File**: `app/api/experiences/[experienceId]/reviews/route.ts`
- **Bug**: Returns `author.email` in public GET response — privacy/enumeration risk
- **Fix**: Remove email from public select, only return `author.name` or initials

---

## PHASE 3 — DATABASE INTEGRITY (Score impact: 7.0 → 9.0 architecture)

### P3-01: Add missing indexes on CartItem FKs
- **Model**: `CartItem` — `cartId`, `vendorId`, `productId`, `experienceId`, `slotId`
- **Impact**: Cart operations do full table scans on every FK

### P3-02: Add missing indexes on Cart
- **Model**: `Cart` — `userId`, `sessionToken`
- **Impact**: Cart lookup by user or session is unindexed

### P3-03: Add missing indexes on BookingAuditLog
- **Model**: `BookingAuditLog` — `bookingId`
- **Impact**: Audit trail queries scan full table

### P3-04: Add missing indexes on BookingCancellation, BookingReschedule
- **Models**: `BookingCancellation.bookingId`, `BookingReschedule.bookingId`

### P3-05: Add missing index on Studio.ownerUserId
- **Model**: `Studio`
- **Impact**: "My studios" query for vendors is unindexed

### P3-06: Add missing index on ShippingRateQuote.orderId
- **Model**: `ShippingRateQuote`

### P3-07: Add missing index on CalendarConnection.studioId
- **Model**: `CalendarConnection`

### P3-08: Add index/unique on Payment.providerPaymentId
- **Model**: `Payment`
- **Impact**: Duplicate Stripe payment rows possible without constraint

---

## PHASE 4 — CODE QUALITY + MAINTAINABILITY (Score impact: 6.0 → 9.0 quality)

### P4-01: Create shared API error response helper
- **New file**: `lib/api-response.ts`
- **Problem**: Inconsistent error envelopes across 241 routes
- **Fix**: `apiError(msg, status)` and `apiSuccess(data)` helpers

### P4-02: Create shared studio auth helper
- **New file**: `lib/studio-api-auth.ts`
- **Problem**: `canManageStudio` pattern duplicated across dozens of studio routes
- **Fix**: Extract to shared helper, import everywhere

### P4-03: Remove dead code — european-preregistration.ts
- **File**: `lib/european-preregistration.ts`
- **Action**: Delete — confirmed zero imports

### P4-04: Move @playwright/test to devDependencies
- **File**: `package.json`
- **Impact**: Reduces production install size

---

## PHASE 5 — DEPLOYMENT + RELIABILITY (Score impact: 7.5 → 9.5 deployment)

### P5-01: Add global-error.tsx boundary
- Already in P2-04

### P5-02: Add Dockerfile for portability
- **New file**: `Dockerfile`
- **Impact**: Makes app deployable to any container host, not just Railway

### P5-03: Document deployment in README
- **File**: `README.md`
- **Impact**: Onboarding for new developers / buyers

---

## PHASE 6 — FEATURE GAPS (Score impact: 7.0 → 9.0 completeness)

### P6-01: Remove or properly gate membership purchase
- **File**: `app/api/memberships/purchase/route.ts` (already 503)
- **Fix**: Hide membership purchase UI entirely until implemented; remove from navigation

### P6-02: Remove /marketplace references from remaining files
- **Files**: Various admin, checkout, middleware references
- **Fix**: Clean up dead marketplace concept consistently

---

## EXECUTION ORDER

| Batch | Tasks | Est. effort | Score lift |
|-------|-------|------------|------------|
| **Batch 1** | P1-01 through P1-04 (money bugs) | 30 min | Payment: 6→8.5 |
| **Batch 2** | P2-01 through P2-05 (security) | 30 min | Security: 6.5→9 |
| **Batch 3** | P3-01 through P3-08 (indexes) | 20 min | Arch: 7→9 |
| **Batch 4** | P4-01 through P4-04 (code quality) | 30 min | Quality: 6→8.5 |
| **Batch 5** | P5-02, P5-03, P6-01, P6-02 (deploy+features) | 20 min | Deploy: 7.5→9.5, Features: 7→9 |
| **Batch 6** | Full test run + verification | 10 min | Confidence |

**Total estimated: ~2.5 hours of focused implementation.**

---

## POST-UPGRADE PROJECTED SCORES

| Dimension              | After  |
|------------------------|--------|
| Architecture           | 9.0    |
| Security               | 9.0    |
| Payment integrity      | 9.0    |
| Test coverage          | 7.0*   |
| Feature completeness   | 9.0    |
| Code quality           | 8.5    |
| Deployment readiness   | 9.5    |
| **Overall**            | **8.7-9.0** |

*Test coverage stays at 7.0 because adding comprehensive component tests is a multi-day effort beyond this sprint. The existing 239 test cases on critical paths are acceptable.*
