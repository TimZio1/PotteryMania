# V4 Stripe proof — execution runbook

Do these on **staging** (or local with Stripe CLI forwarding). Use **test mode** keys.

## Prerequisites

- `STRIPE_SECRET_KEY` (sk_test…)
- `STRIPE_WEBHOOK_SECRET` (from `stripe listen` or Dashboard endpoint signing secret)
- App reachable by Stripe (ngrok, Cloudflare Tunnel, or deployed URL)
- Database you can query (Prisma Studio, `psql`, etc.)

---

## A. Wire webhooks (one-time per session)

Terminal 1:

```bash
stripe listen --forward-to https://<YOUR_HOST>/api/webhooks/stripe
```

Copy the **webhook signing secret** into `STRIPE_WEBHOOK_SECRET` (or `.env.local`), restart app.

---

## B. Payment success (artifact: `v4-checkout-success.png`)

1. Add a sellable item to cart; go to checkout.
2. Pay with **4242 4242 4242 4242**, any future CVC/expiry.
3. Capture screenshot of:
   - Stripe Checkout success **or**
   - Your `/checkout/success?session_id=…` page with **session_id** visible in URL.

Record in `v4-session-id.txt` (one line):

```
cs_test_...
```

---

## C. Webhook received (artifacts: `v4-stripe-event-dashboard.png`, `v4-app-webhook-log.txt`)

1. Stripe Dashboard → **Developers** → **Events**.
2. Find `checkout.session.completed` for that session time.
3. Screenshot: row with **Event ID** `evt_…` visible → save as `v4-stripe-event-dashboard.png`.
4. Copy your app server log lines showing handling (same `evt_` or `cs_` id) → `v4-app-webhook-log.txt`.

---

## D. Webhook retry / idempotency (artifacts: `v4-retry-no-duplicate.png` + DB proof)

1. In Dashboard, open that event → **Resend** (or Stripe CLI resend).
2. Confirm HTTP **200** response body includes `"idempotent": true` when duplicate is skipped (see `app/api/webhooks/stripe/route.ts` after `claimStripeWebhookEvent`).
3. **Before retry**, note order id / count from DB; **after retry**, run the same query — **no second paid order** for the same checkout session.

Example (`orders` table — marketplace cart checkout):

```sql
SELECT id, order_status, payment_status, stripe_checkout_session_id, created_at
FROM orders
WHERE stripe_checkout_session_id = '<PASTE_cs_test_...>'
ORDER BY created_at;
```

Expect: **one** row (or unchanged state), not two.

Screenshot query result → `v4-db-state-after-payment.png` (or second file for post-retry).

---

## E. State consistency

- Order (or booking) row: status reflects **paid** / confirmed per product rules.
- Screenshot or paste → use `v4-db-state-after-payment.png` or `v4-db-state.txt`.

---

## F. Automated partial proof (already runnable in repo)

From repo root `potterymania/`:

```powershell
.\scripts\v4-stripe-proof.ps1
```

Refreshes `automated/v4-dedup-vitest-log.txt` — proves dedup **helpers** only, not full HTTP webhook.

---

## Checklist → mark V4 DONE

| Artifact | Present |
|----------|---------|
| `v4-checkout-success.png` | [ ] |
| `v4-stripe-event-dashboard.png` | [ ] |
| `v4-app-webhook-log.txt` | [ ] |
| `v4-retry-no-duplicate.png` (or log showing idempotent) | [ ] |
| `v4-db-state-after-payment.png` | [ ] |
| `automated/v4-dedup-vitest-log.txt` (regenerated) | [ ] |
