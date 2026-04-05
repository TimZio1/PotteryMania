# Phase 1 — Implemented (marketplace core)

## What works

- **Auth**: register (customer / vendor), credentials login, `SessionProvider`, middleware on `/dashboard/*`, `/admin/*`, `/account`, `/my-bookings`, `/my-waitlist`, `/cart`. Hyperadmin **impersonation**: short-lived `ImpersonationGrant` + `session.update({ impersonationGrantId })`, JWT `impersonatorSub`, `/admin` blocked while active, site banner + exit to restore admin session.
- **Studios**: vendor creates draft studio (`POST /api/studios`), edits (`PATCH`), submits for review (`POST .../submit`). Owners can edit while **suspended** is blocked.
- **Admin**: `hyper_admin` / `admin` lists pending studios (`GET /api/admin/studios?status=pending_review`), approve/reject (`PATCH /api/admin/studios/[id]`). UI at `/admin`.
- **Categories**: `GET /api/categories`; admin `POST /api/categories` (name → slug).
- **Products**: vendor CRUD under `/api/studios/[studioId]/products` (requires **approved** studio). Public list `GET /api/products` (filters) and detail `GET /api/products/[productId]`. Marketplace UI uses Prisma on `/marketplace`.
- **Cart**: guest cookie `pm_cart_id` or logged-in user cart; **single-studio** cart; `GET/POST/PATCH/DELETE /api/cart`.
- **Checkout**: `POST /api/checkout` creates **pending** order + Stripe Checkout (destination charge + `application_fee_amount` from dynamic commission). Optional `couponCode` (platform `Coupon`): proportional discount on line subtotals, recomputed commission, session metadata `couponId` / `discountCents`. `POST /api/coupon/preview` previews discount + est. shipping/tax. Metadata: `orderId`, `cartId`.
- **Webhook**: `POST /api/webhooks/stripe` handles `checkout.session.completed` (idempotent payment row, stock decrement, clear cart, `DiscountRedemption` + coupon `redeemedCount` when metadata includes a coupon).
- **Stripe Connect**: `POST /api/studios/[studioId]/stripe/onboard` (Express, country `GR` default), `GET .../stripe/sync` refreshes flags.
- **Commission**: `resolveCommissionBps` (vendor rule → global rule → `admin_configs` `default_product_commission_bps` → 1000 bps). `GET/PATCH /api/admin/commission` for global product rate.
- **Seed**: hyper admin user, pottery categories, global 10% product commission + admin config.

## Launch tiers (done)

| Tier | Scope | Status |
|------|--------|--------|
| **T1 — Trust & compliance** | Password reset (`/forgot-password`, `/reset-password`, `POST` forgot/reset APIs, Resend). Email verification (tokens, `GET /api/auth/verify-email`, resend, dashboard banner, JWT `emailVerified`). Legal: `/terms`, `/privacy`, `/vendor-terms` (public in prereg), sitemap + marketing/auth/early-access footers; vendor registration links studio terms. | **Done** |
| **T2 — Hyperadmin orders** | `/admin/orders` list + filters, `/admin/orders/[id]` detail (line items, payments incl. PaymentIntent id), nav link, `GET /api/admin/orders` + `lib/admin-orders-query.ts`. **Stripe refund:** `AdminOrderRefundPanel` + `POST /api/admin/orders/[orderId]/refund` + `lib/orders/admin-stripe-order-refund.ts` (full/partial, Connect reverse transfer + app fee, audit `order.stripe_refund`). | **Done** |
| **T2C — Hyperadmin bookings** | `/admin/bookings` list (studio, statuses, session date range, search, row limit), `/admin/bookings/[id]` detail (money breakdown, linked orders, cancellations, reschedules). API: `GET /api/admin/bookings` with same filters via `lib/admin-bookings-query.ts`. Nav + Operations shortcut. | **Done** |
| **Scheduling 2A — Vendor schedule UI** | `/dashboard/experiences/[studioId]`: studio closed days, experience rules (add/list, toggle active, delete), slot generation entrypoints wired to existing APIs. | **Done** |
| **Scheduling 2B — Extended rule types** | `manually_added_dates` and `flexible_window` allowed in rules API, stored consistently, and handled in `lib/scheduling/generate-slots.ts`; dashboard pattern options for specific dates vs date range. | **Done** |
| **Platform add-ons (schema + admin)** | Prisma `PlatformFeature`, `StudioFeatureActivation`, studio feature requests API, vendor Features page, kiln guards, `/admin/platform-features` with **POST create** + full row **PATCH** (name, description, category, sort, price, Stripe price, visibility, toggles). Hyperadmin **grant/revoke** add-on + **override price** on `/admin/studios/[id]` via `PATCH /api/admin/studios/[id]/feature-activations`. | **Done** |
| **P2-C — Feature bundles** | Prisma `FeatureBundle`, `FeatureBundleItem` (`20260408130000_feature_bundles`); optional **`stripe_price_id`** (`20260408140000_feature_bundle_stripe_price`). Hyperadmin **`/admin/feature-bundles`** + APIs. Vendors: **`/dashboard/[studioId]/features`** — **Bundles** section (`studio-features-client`), `GET` **`/api/studios/[id]/feature-requests`** includes **`bundles`**; **`POST`** `{ bundleId }` via `lib/studio-feature-bundle-apply.ts` (free batch + optional bundle Checkout). Stripe webhook **`studio_feature_bundle`**; **`markActivationsEndedForStripeSubscription`** on sub delete / vendor off (shared subscription id across included features). | **Done (v2)** |
| **P2-F — Feature billing (partial)** | Unchanged: per-feature subscription Checkout + webhook. **Added:** bundle-level Checkout (`lib/studio-feature-billing.ts` `createStudioBundleSubscriptionCheckout`), same subscription id on each included activation, cancel clears all rows with that sub. **Still open:** proration, cancel at period end, subscription items model. | **Partial** |
| **P2-G — Feature analytics (v1)** | **`/admin/features?tab=analytics`**, `lib/admin-feature-analytics.ts` (`featureAnalyticsSnapshot`): per-SKU total activation rows, counts by **active / inactive / trialing / pending_cancel**, **Stripe-backed** rows, **inactive updated in last 30d** (directional churn proxy), billable + est. MRR + adoption (same basis as hub). **Still open:** time-series, cohort churn, CSV. | **Done (v1)** |
| **P5-E — Feature control hub (partial)** | `/admin/features` — **Overview** + **Analytics** tabs; `lib/admin-feature-hub-stats.ts` + `lib/admin-feature-analytics.ts`; **`?featureId=`** studio directory; cross-links to **Feature bundles** + revenue. Promos / inline hub edits / analytics v2 still open. | **Done (v1–v4)** |
| **T3 — Reschedule UI** | `GET /api/bookings/[id]/reschedule-options` (authorized customer, vendor, admin). Shared `RescheduleBookingPanel` on `/my-bookings`, vendor dashboard bookings, and `/admin/bookings/[id]`. Uses `lib/bookings/reschedule-slot-utils.ts` for capacity checks aligned with `safeReserveCapacity`. | **Done** |
| **T4 — Runtime checkout flags** | `lib/runtime-feature-flags.ts` (cached reads). `booking_checkout_enabled` / `marketplace_checkout_enabled` gate `/api/bookings/checkout` and mixed `/api/checkout` cart lines. Admin PATCH clears cache. Seed upserts flags. `/admin/operations` lists **Manual refund queue** with links to booking detail. | **Done** |
| **Tier 3D — Booking cancel refunds** | After `cancelBooking`, `stripeRefundForBooking` issues a Stripe Refund on the order’s PaymentIntent (`reverse_transfer` + `refund_application_fee`). Failures set `manual_refund_review_required` and `stripe_refund_failed` audit row. | **Done** |
| **Tier 3E — Booking audit (admin)** | `/admin/bookings/[id]` shows **Audit trail** from `booking_audit_log` (newest first, payload JSON). | **Done** |
| **Tier 4B — Discovery filters** | `/classes` and `/studios` use `lib/public-discovery.ts` for URL-driven filters (search, country/city, category, skill, experience type, € min/max, session date range, open spots; studios + “has public classes” and sort links that preserve filters). | **Done** |
| **Tier 4A — Geo + map discovery** | URL params `lat`, `lng`, optional `radius` (km): haversine filter/sort after `GEO_SCAN_LIMIT` scan; `NearPointFields` (**Use my location**). **`NearResultsMap`** (Leaflet + OSM): radius circle + pins + popups on `/classes` and `/studios` when geo search is active. PostGIS / tile providers optional later. | **Done** |
| **P4-D — Studio public listing** | `/studios/[id]`: photo carousel, CTAs (book / shop / contact), upcoming session rows with deep link `?slot=`, product **Add to cart** (runtime marketplace flag), reviews summary. `/classes/[id]?slot=` preselects slot in `ClassBookingForm`. | **Done** |
| **Tier 3B — ICS / Apple Calendar** | `GET /api/bookings/[id]/calendar` (customer, studio owner, admin) and `GET /api/my-bookings/calendar` download `.ics`. `users.calendar_feed_token` + `GET /api/calendar/feed/[token]` for subscription URLs; `GET /api/my-bookings/calendar-link` returns HTTPS + webcal. `/my-bookings` exposes download, copy link, and webcal hint. Vendor dashboard booking rows link to the same per-booking `.ics`. | **Done** |
| **Tier 5B — Coupons** | `Coupon` / `DiscountRedemption` wired to `POST /api/checkout` + Stripe metadata; redemption on successful payment. Cart promo field + `POST /api/coupon/preview`. Hyperadmin `/admin/coupons`, `GET`/`POST /api/admin/coupons`, `PATCH /api/admin/coupons/[id]`. | **Done** |
| **Tier 5C — Customer account** | `/account` (login required): view email (read-only), edit `CustomerProfile` (name, phone, preferred language, preferred currency). `GET`/`PATCH /api/me/customer-profile` with upsert + rate limit. **Account** in site header (desktop + mobile). | **Done** |
| **P5-B — Hyperadmin studios** | `/admin/studios` + `/admin/studios/[studioId]`: search, status filter, pagination; detail (owner, Stripe Connect, catalog counts, orders snapshot, platform add-ons, marketplace rank weight, status actions). `GET /api/admin/studios` extended query; nav + Operations link to full directory. | **Done (v1)** |
| **P5-C — Hyperadmin users** | **v1:** `/admin/users` filters, activity columns, **Recent activity** + studio links. **v2:** **Impersonate** (grant, JWT, banner, `/admin` block). **v3:** **`admin_tags`** on `users`, list `?tag=` + Flags column, **Admin flags** panel, `PATCH` + audit. Stretch: platform credits/wallet. | **Done (v1–v3)** |
| **P5-D — Hyperadmin revenue (partial)** | `/admin/revenue`: rolling window **`?days=30`** (default) or **`?days=90`** — KPIs tied to window (refunds, booking deposits, coupons), GMV + commission charts, **per-studio throughput** + **`?q=`**, **Breakdown** tab (`?tab=breakdown`). Libs: `lib/admin-revenue-per-studio.ts`, `lib/admin-revenue-streams.ts`. **Refunds:** `/admin/orders/[id]`. Still open: insight purchase revenue, global pricing-rule UI, CSV export. | **Done (v1–v4)** |
| **Marketing — promo strip** | Landing / early-access countdown headline: **FREE PRE-REGISTRATION ENDS IN** + timer + date suffix (`lib/promo.ts`, `PromoCountdown`). | **Done** |

Migrations to apply on the database (in order among others): `20260405230000_password_reset_tokens`, `20260406120000_email_verification_tokens`, `20260406180000_user_calendar_feed_token`, `20260407120000_impersonation_grants`, `20260407140000_user_admin_tags`, `20260408130000_feature_bundles`, `20260408140000_feature_bundle_stripe_price`.

## Env (add to `.env`)

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (optional for hosted Checkout redirect-only).
- `AUTH_URL` / `NEXT_PUBLIC_SITE_URL` = public site URL (Railway) for Stripe, auth email links, and verification redirects.
- `RESEND_API_KEY`, `RESEND_FROM` — transactional email (reset, verify, order/booking mail); optional in dev (sends skipped).

## Not in Phase 1 (by design) / still open

- Hybrid cart, multi-vendor checkout, rich media pipeline beyond URL-based product images, **platform user credits / wallet** (admin adjust balance), and other backlog items not listed under **Launch tiers** above.

## Deploy (Railway)

`railway.json` runs **`npm run db:migrate`** (`prisma migrate deploy`) as **preDeployCommand**, then **`npm run start`**. Pushing/linking the service deploys migrations automatically once `DATABASE_URL` is set.

Local: `npx prisma migrate deploy` (requires a reachable `DATABASE_URL`). CLI: `npx @railway/cli login` → `railway link` → `railway up` from `potterymania/` if you deploy from the terminal.

## Smoke test order

1. `npx prisma migrate deploy` → `npx prisma db seed`
2. Sign in as seeded admin → `/admin` → approve a vendor studio (after vendor registers and submits).
3. Vendor: Connect Stripe → add product with image URL → activate.
4. Customer: marketplace → add to cart → checkout (Stripe test mode) → webhook marks paid.
