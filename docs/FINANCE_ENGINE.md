# Financial Hyperadmin Engine

## What it does

- **Immutable ledger** (`finance_ledger_entries`): GMV, platform commission, vendor pass-through, activation fees, Stripe fees/refunds, manual cost lines.
- **Daily snapshots** (`financial_snapshot_daily`): platform and per-user rollups for trends and margin.
- **Stripe sync**: recent balance transactions → `stripe_fee` and `refund` rows (idempotent).
- **Intelligence**: rule-based `financial_alerts` and `financial_recommendations` (cron).
- **Pricing simulation**: `POST /api/admin/finance/scenarios` persists `pricing_scenarios`.
- **Future billing**: `billing_plans`, `subscriptions`, `coupons`, etc. (schema ready; populate when product ships).

## Deploy

1. Run migrations: `npx prisma migrate deploy` (includes `20260404140000_financial_hyperadmin_engine`).
2. Schedule cron (e.g. hourly on Railway):

   `GET /api/cron/finance-reconcile`  
   Header: `Authorization: Bearer <CRON_SECRET>`

3. Ensure `STRIPE_SECRET_KEY` is set for fee/refund ingestion.

## APIs (admin session)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/finance/overview` | Today/month KPIs, streams, user slices |
| GET | `/api/admin/finance/timeseries` | Platform snapshot series |
| GET | `/api/admin/finance/users?days=30` | User profitability |
| GET | `/api/admin/finance/features?days=30` | Feature usage + cost facts |
| GET | `/api/admin/finance/plans` | Billing plans + subscriber counts |
| GET | `/api/admin/finance/alerts` | Open alerts |
| GET | `/api/admin/finance/recommendations` | Suggested actions |
| POST | `/api/admin/finance/scenarios` | Pricing / take-rate simulation |
| GET | `/api/admin/finance/exports?type=ledger|snapshots` | CSV |
| POST | `/api/admin/finance/ledger-adjustment` | Manual infra/email/AI/storage cost lines |

## Feature usage tracking

`POST /api/analytics/feature-usage` (authenticated) with JSON `{ "featureKey": "checkout", "eventName": "start", "studioId"?: "...", "costCents"?: 0 }` aggregates into `feature_usage_facts`.

## UI

- `/admin/finance` — Financial command center (loads overview, alerts, recommendations).
