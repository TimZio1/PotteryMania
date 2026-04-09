# Flake Analysis (2026-04-09)

## Runs Reviewed

- `npm run test:smoke` (multiple runs)
- `npm run test:e2e-role-matrix`
- `npm run test:ux` (multiple runs)
- `npm run test:functionality`

## Observed Flakes

### 1) Early-access mobile smoke assertion instability
- Symptom: intermittent timeout waiting only for `Welcome`/generic error copy.
- Root cause: backend instability under DB connectivity failures plus missing timeout-specific assertion path.
- Fixes applied:
  - Added submit request timeout handling to UI (`Request timed out` path).
  - Updated E2E assertions to accept timeout error copy explicitly.
- Validation:
  - Re-ran `test:ux` to green.
  - Re-ran `test:smoke` to green.
  - Re-ran `test:functionality` to green.

## Environment-driven instability still present

- Reconciliation script still blocked by DB connectivity (`Prisma P5010`), not an assertion flake but an environment reliability issue.

## Current Flake Status

- Known assertion flake: **resolved**.
- Environment reliability issue: **open** (DB connectivity for reconciliation and some write paths).
