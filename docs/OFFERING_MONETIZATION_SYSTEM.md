# Offering Monetization System

This system adds first-class support for both one-time and recurring monetization on studio offerings.

## Supported entities

- Implemented now:
  - `Product` (marketplace shop items)
  - `Experience` (classes / workshops)
- Data-model ready for expansion:
  - `kiln_usage` target type
  - `membership` target type

## Studio-side configuration

Each offering now supports:

- `pricingType`: `one_time` or `recurring`
- `recurringPriceCents`
- `billingInterval`: `weekly` | `monthly` | `custom`
- `billingIntervalCount` (e.g. every 2 months)
- `minimumCommitmentCycles` (optional)
- `autoRenew`
- `trialPeriodDays` (optional)
- `cancellationPolicyText` (studio-visible customer terms)
- `gracePeriodDays`
- `paymentRetryMax`
- `failedPaymentAction`: `pause` | `cancel`
- `pricingVersion` (increments when pricing config changes)

## Customer-facing behavior

- One-time offerings show standard pay-once pricing and checkout behavior.
- Recurring offerings display clear cycle-based pricing (`€X / month`, `€X / week`, or custom cadence).
- Recurring offerings show:
  - billing cycle
  - auto-renew status
  - minimum commitment (if set)
  - trial period (if set)
  - cancellation rules

## Billing logic

- One-time:
  - charged immediately through existing checkout flow.
- Recurring:
  - Stripe Checkout subscription flow (`/api/offerings/subscribe`)
  - first charge is immediate unless trial is configured
  - renewals handled via Stripe invoices/webhooks

### Failure handling

- `invoice.payment_failed`:
  - increments `failedPaymentCount`
  - sets `status = past_due`
  - sets `graceEndsAt = now + gracePeriodDays`
  - when retries exceed `paymentRetryMax`:
    - `failedPaymentAction = pause` -> `status = paused`
    - `failedPaymentAction = cancel` -> cancel in Stripe + local `status = canceled`
- `invoice.payment_succeeded`:
  - clears failed counters and grace
  - restores active status (or `pending_cancel` if already scheduled to end)

## Subscription lifecycle

`OfferingSubscription.status`:

- `trialing`
- `active`
- `past_due`
- `paused`
- `pending_cancel` (cancel at period end)
- `canceled`
- `expired`

## Edge-case policy implemented

- Cancel before next cycle:
  - `/api/account/offering-subscriptions/[subscriptionId]/cancel`
  - supports cancel-at-period-end and immediate cancel
- Payment failure:
  - retry, grace, pause/cancel paths supported
- Pricing changed mid-subscription:
  - active subscriptions keep snapshot values (`priceSnapshotCents`, `pricingVersion`)
- Upgrade/downgrade:
  - `/api/account/offering-subscriptions/[subscriptionId]/change-plan`
  - safe strategy: schedule current sub to end + create new checkout session
- Switch one-time <-> recurring:
  - available on studio edit APIs/UI for products and experiences

## Smart defaults

- New offerings default to `one_time`
- Recurring defaults:
  - monthly
  - interval count `1`
  - trial `0`
  - grace `3` days
  - retries `3`
  - failed payment action `pause`
  - auto-renew `true`

## Revenue strategy guidance

- Default recommendation by use case:
  - `Product`: one-time for physical pieces, recurring for replenishable kits/memberships.
  - `Experience`: one-time for workshops, recurring for studio clubs/cohorts.
  - `Kiln usage` (future): recurring for heavy users, one-time for ad-hoc firing slots.
- LTV optimization:
  - use recurring for ongoing outcomes (practice, access, replenishment)
  - use one-time for transactional discovery and high-intent purchases
