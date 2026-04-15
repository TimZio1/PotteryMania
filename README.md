# PotteryMania

B2B SaaS platform for pottery & craft studios. Studios onboard, connect Stripe, and manage classes, products, bookings, and customers. Built with Next.js 15 (App Router), PostgreSQL, Prisma 6, Stripe Connect, and Auth.js.

## Tech stack

- **Framework**: Next.js 15 (React 19, App Router, Turbopack dev)
- **Database**: PostgreSQL via Prisma 6 ORM (117 models, 71 migrations)
- **Payments**: Stripe Connect (Express accounts, platform fees)
- **Auth**: Auth.js v5 (credentials + Google OAuth, JWT strategy)
- **Email**: Resend
- **Monitoring**: Sentry
- **Deployment**: Railway (configured), Docker (Dockerfile included)

## Quick start

```bash
cp .env.example .env         # Fill DATABASE_URL, AUTH_SECRET, STRIPE_SECRET_KEY
npm install
npx prisma migrate deploy    # Or: npm run db:push for throwaway local DB
npm run dev                  # http://localhost:3000
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `start` | Production build & serve |
| `npm test` | Run Vitest unit/contract tests (147 cases) |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:smoke` | Smoke tests only |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:push` | Sync schema (no migration history) |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run db:seed` | Seed database |

## Deployment

### Railway (primary)

Pre-configured via `railway.json`:
- **Pre-deploy**: `npm run db:migrate`
- **Start**: `npm run start`
- **Healthcheck**: `/api/ready`

### Docker

```bash
docker build -t potterymania .
docker run -p 3000:3000 --env-file .env potterymania
```

## Architecture

- **241 API routes** under `app/api/` (studios, bookings, checkout, admin, cron, etc.)
- **121 pages** across admin console, studio dashboard, and customer-facing flows
- **Strict TypeScript** (`strict: true`, no `any`)
- **CSRF protection** via origin/referer validation in middleware
- **Rate limiting** on all critical endpoints
- **Webhook idempotency** via event dedup store + row-level locks

## Environment variables

See `.env.example` for full documentation. Key variables:

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | Auth.js session encryption |
| `STRIPE_SECRET_KEY` | Yes | Stripe platform secret |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signature verification |
| `RESEND_API_KEY` | For emails | Transactional email delivery |
| `SENTRY_DSN` | For monitoring | Error tracking |

## Docs

See `docs/` folder for architecture docs, QA reports, and upgrade plans.
