# API Contract Report (2026-04-09)

- Command: `npm run test:api-contract`
- Scope: `lib/api-contract`
- Timestamp: 2026-04-09T12:16:17Z

## Result

- Test files: 8 passed
- Tests: 30 passed
- Duration: ~8.22s
- Exit code: 0

## Contract coverage added

- `GET /api/health`:
  - healthy response contract (`200`, keys `ok/t/db/stripe/spreadconnect`)
  - degraded DB contract (`503`, `dbError`)
  - spreadconnect placeholder signaling
  - Stripe check behavior when configured
- `GET /api/products`:
  - rate-limit rejection contract (`429`, error payload)
  - query normalization and downstream call contract
- `POST /api/early-access`:
  - invalid JSON contract (`400`)
  - invalid email contract (`400`)
  - duplicate email contract (`409`)
  - success contract (`200`, `{ ok: true }`)
- `/api/cart`:
  - missing cart contract (`400`, `GET`)
  - rate-limit rejection contract (`429`, `POST`)
  - malformed JSON contract (`400`, `POST`)
  - missing identifier contract (`400`, `POST`)
- `POST /api/admin/users/[id]/impersonate`:
  - rate-limit rejection (`429`)
  - hyper_admin boundary enforcement (`403`)
  - invalid/self target rejection (`400`)
  - admin-target escalation rejection (`400`)
  - successful impersonation grant contract (`200`, `grantId`)
- `POST /api/admin/orders/[orderId]/refund`:
  - hyper_admin boundary enforcement (`403`)
  - invalid JSON contract (`400`)
  - successful refund payload contract (`200`, `ok/refundId/amountCents/fullyRefunded`)
- Admin finance routes:
  - `POST /api/admin/finance/ledger-adjustment` forbidden guard passthrough (`403`)
  - `POST /api/admin/finance/scenarios` invalid JSON contract (`400`)
  - `POST /api/admin/finance/scenarios` success contract (`200`, `id/outputs`)
- `PATCH /api/admin/users/[id]`:
  - admin auth boundary (`403`)
  - self-mutation block (`400`)
  - non-hyper admin role-assignment escalation block (`403`)
  - last-hyper-admin demotion block (`400`)
  - valid hyper-admin role update contract (`200`, `user`)
