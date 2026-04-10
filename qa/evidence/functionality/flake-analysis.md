# Flake Analysis (2026-04-09)

## Runs Reviewed

- `npm run test:smoke` (multiple runs)
- `npm run test:e2e-role-matrix`
- `npm run test:ux` (multiple runs)
- `npm run test:functionality`
- `npx playwright test tests/e2e/smoke --grep "Flow 1|Flow 2|Route smoke" --repeat-each=30`

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

- 30x repeated smoke run summary:
  - Total: 300 executed
  - Passed: 299
  - Flaky-retry recoveries: 1
  - Hard failures: 0
  - Flake incidence: **0.33%** (1/300)
- Known assertion flake: **mitigated** (route smoke timeout increased to reduce sporadic cold-start timeouts).
- Environment reliability issue: **open** (DB connectivity for reconciliation and some write paths).
