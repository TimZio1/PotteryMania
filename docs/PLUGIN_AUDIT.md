# Plugin audit — Oktana vendors + hyperadmin

## Scope

- **Source**: `oktana-vendors-pro` (marketplace/vendors), `oktana-hyperadmin` (license server).
- **Use**: extract **domain behavior** and **data concepts** only. No WordPress/WooCommerce at runtime.

## Vendors plugin — portable vs rewrite

| Area | Portable ideas | Rewrite (PotteryMania) |
|------|----------------|-------------------------|
| Commissions | Per-vendor vs default rate, fee stack, hold → available, shipping-in-commission modes, refund reversal | `commission_rules` + ledger service; Stripe Connect application fees; idempotency per order |
| Payouts | Balance from ledger, min threshold, single in-flight payout, lock rows on request | `PayoutService` + Stripe Connect payouts; no WP cron — use queue |
| Shipping | Vendor vs marketplace mode, zones JSON, tracking carrier registry | First-class `ShippingQuoteService`; no WC packages |
| Vendors | Status workflow, storefront JSON, registration fields | `studios` + approval lifecycle |
| Feature gate | Plan → feature map | `feature_flags` + Stripe Billing / entitlements |
| Audit | Action log pattern | `booking_audit_log` + platform audit table (future) |

## Hyperadmin plugin — portable vs rewrite

| Area | Portable ideas | Rewrite |
|------|----------------|---------|
| License lifecycle | active/expired/revoked, max activations, grace | Studio **plans** + `feature_flags`; no license key API for WP sites |
| Domain / fingerprint | Normalize host, staging heuristics | `vendor_domains` + Cloudflare; consistent canonical domain |
| Webhooks / billing | Pending order → paid → entitlement | Stripe webhooks only; strict signature verification |
| Security | Rate limits, audit log | Reuse thresholds as **starting** numbers; add JWT/HMAC for any future install API |

## Risks carried into SaaS

- Dual balance fields (aggregates vs ledger): **derive from ledger** or single writer.
- Commission idempotency: explicit keys per order/settlement.
- Do not port unauthenticated commission-preview endpoints without auth.

## Status

**Phase 0**: this document is the high-level audit; detailed file maps live in `MODULE_MAP.md` and `DEPENDENCY_MAP.md`.
