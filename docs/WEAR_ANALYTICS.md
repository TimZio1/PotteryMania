# Wear analytics

## Implemented events

### Persisted + mirrored to GA4 (`/api/wear/events` + `trackWearEvent`)

Kinds live in `lib/wear-event-kinds.ts`; client helper: `lib/wear-analytics-client.ts`.

| Kind | When |
|------|------|
| `wear_product_view` | PDP buy section mount (`wear-pdp-buy-section.tsx`). |
| `wear_add_to_cart` | Add to cart (`wear-add-to-cart-button.tsx`). |
| `wear_checkout_started` | Cart checkout submit (`wear-cart-page-client.tsx`). |
| `wear_purchase_success` | Stripe webhook / completion path (server writes event). |
| `wear_referral_capture` | Valid `?ref=` / `?studio=` / `?studioId=` on a `/wear/*` URL; `meta.referring_studio_id` + `meta.path`. |

Payload may include `productId`, `variantId`, `orderId`, and `meta`.

`meta` allowlist includes `referring_studio_id`, `path`, `item_count`, and UTM fields (see `app/api/wear/events/route.ts`). Add-to-cart and checkout-started may include `referring_studio_id` when a partner link was captured.

### GA4-only on `/wear` landing (`wear-analytics.tsx`)

When `gtag` is present: `wear_scroll_depth` (25 / 50 / 100%), `wear_time_on_page` on unload. These are **not** in `WEAR_EVENT_KINDS` / DB pipeline unless you add them.

## Gaps (typical)

- **Funnel:** Impression → PLP click → PDP → add → checkout → purchase — confirm each step is fired once and with consistent IDs.
- **Affiliate / studio attribution:** Partner links and `studioId` on checkout — track separately if you need partner reporting.
- **Errors:** Checkout failures and SC submit failures — consider error events or logging dashboards (Sentry, etc.).

## Files

- Client: `lib/wear-analytics-client.ts`, `components/wear/wear-analytics.tsx`
- Kinds: `lib/wear-event-kinds.ts`
- API: `app/api/wear/events/`
