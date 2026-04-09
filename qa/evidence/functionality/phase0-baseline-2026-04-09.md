# Phase 0 Baseline (2026-04-09)

## Commands Executed

- `npm run test:smoke`
- `npm run test:e2e-role-matrix`
- `npm run test:api-contract`
- `npm run test:reconciliation`

## Results Snapshot

- `test:smoke`: 3 passed, 7 skipped, 0 failed.
- `test:e2e-role-matrix`: 3 passed, 12 skipped, 0 failed.
- `test:api-contract`: 8 passed, 0 failed (vitest suite currently acts as baseline contract placeholder).
- `test:reconciliation`: command runs; reports blocked when `DATABASE_URL` / `STRIPE_SECRET_KEY` are missing.

## Known Environment Constraints

- DB connectivity intermittently unavailable in this environment (Prisma `P5010` observed in runtime logs).
- Smoke specs are intentionally guarded to skip DB-dependent scenarios when write-path preflight fails.
- OpenTelemetry instrumentation version mismatch warnings still appear during test server startup.

## Next Actions

1. Real API contract suite added under `lib/api-contract` and passing (`npm run test:api-contract`).
2. Reconciliation check upgraded to assertive integrity checks and report generation (`qa/evidence/logic/reconciliation-report.md`) — currently blocked because `DATABASE_URL` uses `prisma+postgres://`; script needs direct `postgresql://`.
3. Stabilize DB availability in CI to convert blocked reconciliation and skips into deterministic pass/fail coverage.
