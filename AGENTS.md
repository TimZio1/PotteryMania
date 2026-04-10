# PotteryMania — Agent & contributor guidelines

All agents, developers, and contributors must follow this document when writing UI copy, generating content, editing landing pages, updating SEO metadata, writing emails, or creating prompts.

## Product identity (mandatory)

PotteryMania is:

> An all-in-one platform for running a creative business online.

### Short version

> Run your creative business online.

### Expanded version

> Sell your work. Book your classes. Manage everything in one system.

### Internal truth

> Business operating system for creators and studios.

## Core capabilities

- E-commerce (sell products)
- Booking system (classes / sessions)
- Payments
- Business dashboard

## Forbidden terms (never use)

- marketplace
- directory
- discovery platform
- preregistration
- early access (as positioning)
- Europe-only messaging
- curated approval language

## Forbidden phrases

- “Join the marketplace”
- “Get discovered”
- “Apply to be accepted”
- “Pre-register now”
- “We evaluate each studio”
- “Only available in Europe”

## Required language

Always prefer:

- Run your business
- Sell your work
- Book your classes
- Manage everything in one place
- Start in minutes

## UX copy rules

- Clarity over creativity
- One idea per sentence
- No jargon
- No feature overload

## Positioning rule

This product is **always**: a **SaaS tool for creators and studios**.

**Never**: a platform you join for exposure.

## CTA rules

Replace **Join**, **Apply**, **Get listed** with **Start**, **Create**, **Set up**.

### Default CTAs

- Create your studio
- Start selling
- Start booking
- Set up your site

## Legacy code identifiers (do not rename casually)

Routes and symbols still use historical names; behavior and URLs must stay stable until a planned migration.

| Legacy | Preferred meaning / future rename |
|--------|-----------------------------------|
| `/marketplace`, `listMarketplaceProducts`, `getMarketplaceProduct` | Public product catalog / studio shop listings |
| `marketplace_checkout_enabled`, `marketplaceCheckoutEnabled` | Product (shop) checkout kill switch |
| `marketplaceRankWeight`, `/admin/marketplace*` | Internal ranking / browse controls (not “marketplace positioning”) |
| `publicDiscoveryEnabled`, `lib/public-discovery`, `components/discovery/*` | Public class browse / geo search (not “discovery product”) |
| `PREREGISTRATION_ONLY`, `isPreregistrationOnly` | Restricted guest / legacy gate env (not “preregistration campaign”) |
| `bookingPendingStudioConfirmationCopy` (was `bookingPendingApprovalCopy`) | Email copy for paid bookings awaiting studio confirm |

## Final check

Before shipping user-facing text: does this sound like a **tool you pay for** or a **platform you join**? If join → rewrite. If use → correct.

## Default hero reference (marketing)

- **Headline:** Run your studio. Not your chaos.
- **Subheadline:** Sell your work. Book your classes. One system.
- **Primary CTA:** Create your studio
