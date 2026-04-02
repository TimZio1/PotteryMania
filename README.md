# PotteryMania

Next.js (App Router) + PostgreSQL + Prisma + Auth.js. PWA manifest included; no WordPress/WooCommerce.

## Setup

1. Copy `.env.example` to `.env` and fill `DATABASE_URL`, `AUTH_SECRET`, and provider keys as you enable them.
2. `npm install`
3. `npx prisma migrate deploy` (against Railway Postgres) **or** `npm run db:push` for a throwaway local DB.
4. `npm run dev`

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `start` | Production |
| `npm run db:migrate` | Apply migrations |
| `npm run db:push` | Sync schema without migration history |
| `npm run db:studio` | Prisma Studio |

## Docs

Phase 0 extraction notes: [`docs/PLUGIN_AUDIT.md`](docs/PLUGIN_AUDIT.md) and sibling files in `docs/`.

## Schema

Prisma schema mirrors [`../DATABASE_SCHEMA.md`](../DATABASE_SCHEMA.md) with an explicit `users` model and FK from `experiences.cancellation_policy_id` to `cancellation_policies`.
