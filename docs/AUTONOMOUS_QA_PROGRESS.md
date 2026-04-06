# Autonomous QA + implementation progress

## QA pass (systematic)

- **Lint**: `npm run lint` — pass.
- **Build**: `npm run build` — pass (known Turbopack `import-in-the-middle` warnings from transitive OTEL; Prisma `generate --no-engine` hint in logs).
- **Unit tests**: Vitest was incorrectly executing Playwright `tests/e2e/smoke/*.spec.ts` — fixed via `vitest.config.ts` `include` / `exclude`. Latest: **4 files, 13 tests** pass.
- **Permissions**: Confirmed `studio ai/chat` gates owner + `ai_advisor` feature + rate limit; hyper_admin-only refund + impersonation from prior work.
- **Stripe add-ons**: Audited checkout webhook, feature-requests POST, admin feature-activations PATCH.

### QA verdict (latest run)

- **Checked**: ESLint, Vitest (`lib/**/*.test.ts` only), Next build + TypeScript, Stripe proration paths (subscription items + cancel-at-period-end guard), admin/vendor feature flows, cohort CSV route wiring, audit reason surfaces touched in this pass.
- **Fixed this session**: `POST /api/admin/generated-insights/[id]/force-unlock` requires **≥8** char `reason` (aligned with other admin mutations); unlock button prompts until valid; vendor **Features** page shows a persistent banner on **409** `MULTI_ITEM_CANCEL_AT_PERIOD_END` (in addition to alert).
- **Remains (non-blocking)**: OTEL `import-in-the-middle` version skew warnings; Prisma production engine recommendation; Playwright smoke not run in this pass (separate `npm run test:e2e:smoke`). Some admin PATCH routes outside the hardened set may still allow short reasons if extended later.
- **Readiness**: **Ship-ready** for the scoped features — lint, unit tests, and production build succeed.

## Chunk 1 — Stripe proration (studio add-ons)

- Centralized `getStudioFeatureProrationBehavior()` (`STRIPE_STUDIO_FEATURE_PRORATION`: `create_prorations` | `none` | `always_invoice`, default `create_prorations`).
- Webhook `checkout.session.completed` for `studio_feature_subscription` sets `stripeSubscriptionItemId` when resolvable.
- `tryAddStudioFeatureViaSubscriptionItem`: add next paid feature to an existing `studio_feature_subscription` Stripe subscription with proration (avoids a second subscription when eligible).
- `removeStudioFeatureFromStripeBilling`: removes a subscription item with proration when item id (or resolvable price match) exists; otherwise cancels whole subscription (legacy single-feature subs).
- `scheduleStudioFeatureSubscriptionCancelAtPeriodEnd`: rejects when Stripe subscription has **more than one** line item (unsafe to cancel whole sub); callers should use immediate turn-off for that case.

## Chunk 2 — Cohort reports

- Extended `/admin/reports` with **feature adoption cohort** table (studio cohort month → still has ≥1 billable activation in M0–M3).
- CSV export: `GET /api/admin/reports/feature-retention?format=csv`.
- Studio **approval-month add-on penetration** cohorts + CSV: `lib/admin-studio-addon-cohort.ts`, `GET /api/admin/reports/feature-retention` (JSON/CSV), linked from `/admin/reports`.

## Chunk 3 — Audit reason enforcement

- Admin APIs require non-empty trimmed `reason` (min length, typically **8**) for high-impact mutations; clients updated to send `reason` and show validation errors.
- Includes: studio PATCH, feature-activations, ranking boosts, featured placements, marketplace controls, **generated insight force-unlock**.
