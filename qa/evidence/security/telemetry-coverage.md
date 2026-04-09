# Security Telemetry Coverage (2026-04-09)

## Static Coverage Scan

Scan target: `app/api/**/route.ts` for `logApiError` / telemetry hooks.

## Findings

- Files with explicit telemetry/error logging hooks: **54**
- Total API route files scanned: **155**
- Route files with `catch` blocks: **88**
- Route files with `catch` but no telemetry hook: **34** (reduced from prior scan)
- Sensitive catch-route coverage (admin/auth/checkout/cart/bookings/uploads/webhooks): **50 / 50** (**100%**)
- Total hook call-sites matched: **69**

High-signal examples include:
- `app/api/webhooks/stripe/route.ts`
- `app/api/bookings/[bookingId]/cancel/route.ts`
- `app/api/bookings/[bookingId]/reschedule/route.ts`
- `app/api/early-access/route.ts`
- `app/api/studios/[studioId]/ai/chat/route.ts`
- `app/api/register/route.ts`
- `app/api/admin/business-templates/[id]/route.ts`
- `app/api/admin/commission/route.ts`
- `app/api/admin/coupons/route.ts`
- `app/api/checkout/route.ts`
- `app/api/bookings/checkout/route.ts`
- `app/api/cart/route.ts`
- `app/api/uploads/sign/route.ts`
- `app/api/bookings/waitlist/route.ts`
- `app/api/admin/orders/[orderId]/refund/route.ts`
- `app/api/admin/finance/ledger-adjustment/route.ts`
- `app/api/admin/finance/scenarios/route.ts`
- `app/api/admin/webhook-events/route.ts`
- `app/api/admin/experiments/route.ts`
- `app/api/admin/experiments/[id]/route.ts`
- `app/api/admin/feature-bundles/route.ts`
- `app/api/admin/feature-bundles/[id]/route.ts`
- `app/api/admin/feature-flags/route.ts`
- `app/api/admin/featured-placements/route.ts`
- `app/api/admin/featured-placements/[id]/route.ts`
- `app/api/admin/platform-features/route.ts`
- `app/api/admin/platform-features/[id]/route.ts`
- `app/api/admin/ranking-boosts/route.ts`
- `app/api/admin/ranking-boosts/[id]/route.ts`
- `app/api/admin/settings/ranking-weights/route.ts`
- `app/api/admin/studios/[studioId]/feature-activations/route.ts`
- `app/api/admin/studios/[studioId]/route.ts`
- `app/api/admin/wear-product-variants/route.ts`
- `app/api/admin/wear-product-variants/[variantId]/route.ts`
- `app/api/admin/wear-products/test-spreadconnect/route.ts`
- `app/api/auth/reset-password/route.ts`
- `app/api/admin/notifications/route.ts`
- `app/api/admin/users/[id]/route.ts`
- `app/api/admin/users/[id]/notes/route.ts`
- `app/api/admin/insight-templates/[id]/route.ts`
- `app/api/admin/generated-insights/[id]/force-unlock/route.ts`
- `app/api/studios/[studioId]/bookings/mark-attended-batch/route.ts`

## Current Verdict

- **Pass (security gate scope)**: all sensitive catch-bearing routes now emit telemetry hooks.
- **Open (hardening backlog)**: 34 non-sensitive catch-bearing routes still lack hooks; close progressively.
