# Rate Limit Abuse Report (2026-04-09)

## Static Coverage Scan

Scan target: `app/api/**/route.ts` for `assertRateLimit(...)`.

## Findings

- Files with rate-limit guards: **14**
- Total `assertRateLimit` call-sites: **16**

## Dynamic Abuse Unit Checks

Executed suite: `npm run test -- lib/rate-limit.test.ts`

- Test files: 1 passed
- Tests: 5 passed
- Behaviors covered:
  - Fixed-window exhaustion blocks additional requests.
  - Allowance resets after window expiration.
  - Bucket isolation across unique client keys.
  - Stable reset window semantics while a bucket is active.
  - Forwarded client IP parsing uses first hop for keying.

### Guarded Endpoints (current)

- `/api/early-access`
- `/api/auth/reset-password`
- `/api/auth/resend-verification`
- `/api/auth/forgot-password`
- `/api/auth/verify-email`
- `/api/register`
- `/api/products`
- `/api/cart` (3 mutation/read guard call-sites)
- `/api/checkout`
- `/api/bookings/checkout`
- `/api/wear/checkout`
- `/api/wear/events`
- `/api/uploads/sign`
- `/api/admin/users/[id]/impersonate`

## Current Verdict

- **Pass (security checks scope)**: static coverage + abuse-oriented limiter behavior tests are green.
- **Future hardening**: add high-volume API load simulation artifact for production-like abuse throughput validation.
