# Wear pricing source of truth

## Roles

| Layer | Source | Notes |
|--------|--------|--------|
| **Wholesale / base cost** | Spreadconnect (synced into `wearProduct.priceCents` and variant overrides) | Treat as COGS baseline in your spreadsheet. |
| **Retail on site** | Base cents + studio margin (`wear_*_margin_bps` in admin + per-studio `StudioWearConfig.marginBps`) | `calculateWearPrice` in `lib/wear-commission.ts`. |
| **Checkout** | Same retail math as cart; Stripe session uses order `currency` (must be single currency per cart). | `app/api/wear/checkout/route.ts`. |

## Spreadsheet template (you maintain)

Use one row per sellable SKU (or per variant). Suggested columns:

1. **sc_sku** — Spreadconnect / fulfillment SKU (canonical).
2. **internal_ref** — Optional: `PM-{WEAR_ACTIVE_DROP.code}-<slug>-<size>-<color>` for your ops (`lib/wear-drop-config.ts`).
3. **product_name** — Human label.
4. **cogs_eur** — Your landed COGS in EUR (from SC export or contract).
5. **target_retail_eur** — What you want on the PDP after margin policy.
6. **synced_base_cents** — What landed in DB after catalog sync (sanity check vs `cogs_eur`).
7. **margin_bps_used** — Effective bps if you back-solve from base → retail.
8. **notes** — Fees, shipping assumptions, last verified date.

Retail on the live site should match **target_retail_eur** after you align SC / admin prices and margin config. If sync overwrites `priceCents`, adjust at source or in admin product editor.

## Admin

- **Global markup:** `/admin/settings#wear-markup` — default / min / max % on Spreadconnect base, lock studios if needed.
- **Per product:** `/admin/wear-products/[id]` — `priceCents`, variants, currency.
