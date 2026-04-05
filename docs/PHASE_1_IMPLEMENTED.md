# Phase 1 — Implemented (marketplace core)

## What works

- **Auth**: register (customer / vendor), credentials login, `SessionProvider`, middleware on `/dashboard/*`, `/admin/*`, `/account`, `/my-bookings`, `/my-waitlist`, `/cart`.
- **Studios**: vendor creates draft studio (`POST /api/studios`), edits (`PATCH`), submits for review (`POST .../submit`). Owners can edit while **suspended** is blocked.
- **Admin**: `hyper_admin` / `admin` lists pending studios (`GET /api/admin/studios?status=pending_review`), approve/reject (`PATCH /api/admin/studios/[id]`). UI at `/admin`.
- **Categories**: `GET /api/categories`; admin `POST /api/categories` (name → slug).
- **Products**: vendor CRUD under `/api/studios/[studioId]/products` (requires **approved** studio). Public list `GET /api/products` (filters) and detail `GET /api/products/[productId]`. Marketplace UI uses Prisma on `/marketplace`.
- **Cart**: guest cookie `pm_cart_id` or logged-in user cart; **single-studio** cart; `GET/POST/PATCH/DELETE /api/cart`.
- **Checkout**: `POST /api/checkout` creates **pending** order + Stripe Checkout (destination charge + `application_fee_amount` from dynamic commission). Metadata: `orderId`, `cartId`.
- **Webhook**: `POST /api/webhooks/stripe` handles `checkout.session.completed` (idempotent payment row, stock decrement, clear cart).
- **Stripe Connect**: `POST /api/studios/[studioId]/stripe/onboard` (Express, country `GR` default), `GET .../stripe/sync` refreshes flags.
- **Commission**: `resolveCommissionBps` (vendor rule → global rule → `admin_configs` `default_product_commission_bps` → 1000 bps). `GET/PATCH /api/admin/commission` for global product rate.
- **Seed**: hyper admin user, pottery categories, global 10% product commission + admin config.

## Launch tiers (done)

| Tier | Scope | Status |
|------|--------|--------|
| **T1 — Trust & compliance** | Password reset (`/forgot-password`, `/reset-password`, `POST` forgot/reset APIs, Resend). Email verification (tokens, `GET /api/auth/verify-email`, resend, dashboard banner, JWT `emailVerified`). Legal: `/terms`, `/privacy`, `/vendor-terms` (public in prereg), sitemap + marketing/auth/early-access footers; vendor registration links studio terms. | **Done** |
| **T2 — Hyperadmin orders** | `/admin/orders` list + filters, `/admin/orders/[id]` detail, nav link, `GET /api/admin/orders` shares `lib/admin-orders-query.ts`. | **Done** |
| **T2C — Hyperadmin bookings** | `/admin/bookings` list (studio, statuses, session date range, search, row limit), `/admin/bookings/[id]` detail (money breakdown, linked orders, cancellations, reschedules). API: `GET /api/admin/bookings` with same filters via `lib/admin-bookings-query.ts`. Nav + Operations shortcut. | **Done** |
| **Scheduling 2A — Vendor schedule UI** | `/dashboard/experiences/[studioId]`: studio closed days, experience rules (add/list, toggle active, delete), slot generation entrypoints wired to existing APIs. | **Done** |
| **Scheduling 2B — Extended rule types** | `manually_added_dates` and `flexible_window` allowed in rules API, stored consistently, and handled in `lib/scheduling/generate-slots.ts`; dashboard pattern options for specific dates vs date range. | **Done** |
| **Platform add-ons (schema + admin)** | Prisma `PlatformFeature`, `StudioFeatureActivation`, studio feature requests API, vendor Features page, kiln guards, `/admin/platform-features`. | **Done** |
| **T3 — Reschedule UI** | `GET /api/bookings/[id]/reschedule-options` (authorized customer, vendor, admin). Shared `RescheduleBookingPanel` on `/my-bookings`, vendor dashboard bookings, and `/admin/bookings/[id]`. Uses `lib/bookings/reschedule-slot-utils.ts` for capacity checks aligned with `safeReserveCapacity`. | **Done** |
| **T4 — Runtime checkout flags** | `lib/runtime-feature-flags.ts` (cached reads). `booking_checkout_enabled` / `marketplace_checkout_enabled` gate `/api/bookings/checkout` and mixed `/api/checkout` cart lines. Admin PATCH clears cache. Seed upserts flags. `/admin/operations` lists **Manual refund queue** with links to booking detail. | **Done** |
| **Tier 3D — Booking cancel refunds** | After `cancelBooking`, `stripeRefundForBooking` issues a Stripe Refund on the order’s PaymentIntent (`reverse_transfer` + `refund_application_fee`). Failures set `manual_refund_review_required` and `stripe_refund_failed` audit row. | **Done** |
| **Tier 3E — Booking audit (admin)** | `/admin/bookings/[id]` shows **Audit trail** from `booking_audit_log` (newest first, payload JSON). | **Done** |
| **Tier 4B — Discovery filters** | `/classes` and `/studios` use `lib/public-discovery.ts` for URL-driven filters (search, country/city, category, skill, experience type, € min/max, session date range, open spots; studios + “has public classes” and sort links that preserve filters). | **Done** |
| **Tier 3B — ICS / Apple Calendar** | `GET /api/bookings/[id]/calendar` (customer, studio owner, admin) and `GET /api/my-bookings/calendar` download `.ics`. `users.calendar_feed_token` + `GET /api/calendar/feed/[token]` for subscription URLs; `GET /api/my-bookings/calendar-link` returns HTTPS + webcal. `/my-bookings` exposes download, copy link, and webcal hint. Vendor dashboard booking rows link to the same per-booking `.ics`. | **Done** |
| **Tier 5C — Customer account** | `/account` (login required): view email (read-only), edit `CustomerProfile` (name, phone, preferred language, preferred currency). `GET`/`PATCH /api/me/customer-profile` with upsert + rate limit. **Account** in site header (desktop + mobile). | **Done** |
| **Marketing — promo strip** | Landing / early-access countdown headline: **FREE PRE-REGISTRATION ENDS IN** + timer + date suffix (`lib/promo.ts`, `PromoCountdown`). | **Done** |

Migrations to apply on the database (in order among others): `20260405230000_password_reset_tokens`, `20260406120000_email_verification_tokens`, `20260406180000_user_calendar_feed_token`.

## Env (add to `.env`)

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (optional for hosted Checkout redirect-only).
- `AUTH_URL` / `NEXT_PUBLIC_SITE_URL` = public site URL (Railway) for Stripe, auth email links, and verification redirects.
- `RESEND_API_KEY`, `RESEND_FROM` — transactional email (reset, verify, order/booking mail); optional in dev (sends skipped).

## Not in Phase 1 (by design) / still open

- Hybrid cart, multi-vendor checkout, rich media pipeline beyond URL-based product images, and other backlog items not listed under **Launch tiers** above.

## Deploy (Railway)

`railway.json` runs **`npm run db:migrate`** (`prisma migrate deploy`) as **preDeployCommand**, then **`npm run start`**. Pushing/linking the service deploys migrations automatically once `DATABASE_URL` is set.

Local: `npx prisma migrate deploy` (requires a reachable `DATABASE_URL`). CLI: `npx @railway/cli login` → `railway link` → `railway up` from `potterymania/` if you deploy from the terminal.

## Smoke test order

1. `npx prisma migrate deploy` → `npx prisma db seed`
2. Sign in as seeded admin → `/admin` → approve a vendor studio (after vendor registers and submits).
3. Vendor: Connect Stripe → add product with image URL → activate.
4. Customer: marketplace → add to cart → checkout (Stripe test mode) → webhook marks paid.
