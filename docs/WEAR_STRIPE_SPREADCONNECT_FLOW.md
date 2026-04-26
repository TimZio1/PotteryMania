# Stripe + Spreadconnect flow (wear orders)

## Happy path (buyer)

1. **Browse** `/wear/shop` → PDP `/wear/[slug]` — prices from DB + margin rules for studio-attributed carts (if any).
2. **Cart** — `localStorage` + `/api/wear/products` hydration; client posts to checkout.
3. **Checkout** — `POST /api/wear/checkout` creates `WearOrder` + line items, builds Stripe Checkout Session in the cart’s single `currency`, redirects to Stripe.
4. **Pay** — Customer completes payment; Stripe sends webhooks (payment intent / session completed — see app webhook handlers).
5. **Fulfillment** — Worker / job submits the order to Spreadconnect (`lib/wear-order-spreadconnect.ts`) using synced SKUs; SC returns production / ship state.

## Data dependencies

- **Catalog:** Cron or manual sync from Spreadconnect → `wearProduct` / variants (SKUs, `priceCents`, images).
- **Stripe:** Webhook secret and price consistency with session line items created in checkout route.
- **Spreadconnect:** API credentials; order payload maps wear line rows to SC articles/SKUs.

## Failure modes (operator)

- Mixed currencies in one cart → checkout rejects (`Mixed currencies are not supported`).
- Missing SC SKU / mapping → submission fails; see admin wear order detail and failure events.
- Deferred fulfillment — see `lib/wear-fulfillment-defer.ts` / feature flags if SC is gated.

## Related code

- Checkout: `app/api/wear/checkout/route.ts`
- SC submit: `lib/wear-order-spreadconnect.ts`, `lib/wear-fulfillment-worker.ts`
- Commission: `lib/wear-commission.ts`
