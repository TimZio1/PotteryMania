# Phase 1 — Implemented (marketplace core)

## What works

- **Auth**: register (customer / vendor), credentials login, `SessionProvider`, middleware on `/dashboard/*` and `/admin/*`.
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

## Env (add to `.env`)

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (optional for hosted Checkout redirect-only).
- `AUTH_URL` = public site URL (e.g. Railway URL) for Stripe success/cancel links.

## Not in Phase 1 (by design)

- Bookings, hybrid cart, email verification, password reset UI, image upload (URLs only), multi-vendor checkout, rich admin (orders UI is API-only: `GET /api/admin/orders`).

## Smoke test order

1. `npx prisma migrate deploy` → `npx prisma db seed`
2. Sign in as seeded admin → `/admin` → approve a vendor studio (after vendor registers and submits).
3. Vendor: Connect Stripe → add product with image URL → activate.
4. Customer: marketplace → add to cart → checkout (Stripe test mode) → webhook marks paid.
