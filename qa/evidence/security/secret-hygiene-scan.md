# Secret Hygiene Scan (2026-04-09)

## Scan Pattern Set

- `sk_live_`
- `rk_live_`
- `AKIA[0-9A-Z]{16}`
- `BEGIN PRIVATE KEY`
- `SECRET_KEY = "<literal>"`

## Result

- No live-key patterns detected in tracked source/docs.
- One expected test-only value found:
  - `lib/api-contract/health-route.contract.test.ts` uses `sk_test_123` for mocked Stripe behavior.

## Current Verdict

- **Pass (current scan scope)** for accidental hardcoded production secret leakage.
- Continue scanning in CI for each PR to maintain hygiene.
