# PotteryMania — Master Acquisition Audit & Transformation Roadmap

> Generated: April 14, 2026
> Scope: Full technical due diligence + execution roadmap
> Source: Deep codebase analysis across 117 Prisma models, 241 API routes, 121 pages, 292 components

---

# LIVE EXECUTION STATUS TRACKER

> Last updated: 2026-04-14
> Rule: `DONE` means implemented in code on this branch; still requires integrated QA.

| Task ID | Status | Notes |
|---------|--------|-------|
| REV-01 | DONE | Platform commission set to 500 bps in `lib/commission-defaults.ts` |
| REV-02 | DONE | Admin commission API + settings UI now supports global rates and per-studio overrides |
| REV-03 | DONE | Studio dashboard now shows live product/booking platform fee rates |
| FIX-01 | DONE | Review API now returns `author.name` |
| FIX-02 | DONE | Membership purchase CTA removed from customer-facing paths |
| FIX-03 | DONE | Stock-failure cancellation now triggers refund attempt side effect |
| FIX-04 | DONE | `/gift-cards` is in middleware public allowlist |
| FIX-05 | DONE | `.env.local` already ignored in `.gitignore` |
| GDPR-01 | DONE | `GET /api/me/data-export` implemented |
| GDPR-02 | DONE | `DELETE /api/me/data-deletion` implemented with anonymization + signout cookies clear |
| GDPR-03 | DONE | Cookie consent banner added and analytics gated by consent |
| GDPR-04 | DONE | Account page now has "Download my data" + "Delete my account" actions |
| CI-01 | DONE | CI workflow now runs Vitest |
| CI-02 | DONE | `vitest.config.ts` coverage block added (v8 + thresholds) |
| CI-03 | DONE | CI now runs `npm run test:coverage` and fails on threshold drops |
| DASH-01 | DONE | Studio sidebar is now grouped into Overview/Operations/Commerce/Marketing/Settings sections |
| DASH-02 | DONE | Dashboard home now includes richer action-oriented cards and live fee visibility |
| DASH-03 | DONE | Settings page now includes a consolidated settings hub with direct shortcuts |
| AUTH-01 | DONE | `requireStudioOwner` adopted in studio profile, activation, submit, stripe sync, and product CRUD routes |
| AUTH-02 | DONE | `apiError`/`apiSuccess` adopted across migrated studio route set for consistent responses |
| SPLIT-01 | DONE | `studio-shop-client` utilities extracted to `components/dashboard/studio-shop-utils.ts` |
| SPLIT-02 | DONE | `guided-app` flow constants/helpers extracted to `components/guided/guided-app-constants.ts` |
| SPLIT-03 | DONE | Stripe webhook subscription-event handling extracted to `lib/webhooks/stripe-subscription-events.ts` |
| SPLIT-04 | DONE | Checkout order creation extracted to `lib/checkout/checkout-order-creation.ts` |
| INST-01 | DONE | Booking form now loads linked instructors and shows selector when multiple exist |
| INST-02 | DONE | `instructorId` now validated and persisted in booking create paths (`bookings/checkout`, `checkout`, `pay-at-studio`) |
| INST-03 | DONE | Instructor now shown on checkout success cards and booking confirmation/pending emails |
| INST-04 | DONE | Dashboard instructor page now includes upcoming schedule grouped by instructor |
| VAR-01 | DONE | Added `ProductVariant` model + migration; `CartItem`/`OrderItem` now persist `variantId` |
| VAR-02 | DONE | Studio product APIs now support variant arrays (create/replace) and dashboard editor supports variant JSON |
| VAR-03 | DONE | Marketplace and studio public product cards now allow selecting variants before add-to-cart |
| VAR-04 | DONE | Cart/checkout now validates variant stock + price overrides and settles variant inventory on payment |
| CHK-01 | DONE | Added `/checkout` summary page using cart data before payment |
| CHK-02 | DONE | Cart flow now routes users to `/checkout` for final payment step |

---

# PART ONE — ACQUISITION-GRADE AUDIT

---

# SECTION 1 — EXECUTIVE VERDICT

## **BUY ONLY AS A TECHNICAL BASE, NOT AS A FINISHED BUSINESS**

### 1.1 Overall score: **71 / 100**

### 1.2 Maturity score: **6.5 / 10**
Real depth in booking and payment logic. Gaps in membership, instructor assignment, product variants, and operational polish prevent a higher score.

### 1.3 Trustworthiness score: **7 / 10**
Auth.js v5 beta is a governance risk for a payments app. Core Stripe flows are well-guarded. In-memory rate limiting is single-instance only.

### 1.4 Pottery-studio fit score: **8 / 10**
The strongest dimension. Guided onboarding uses ceramic categories. Schema includes `CeramicCategory` enum, kiln firing models, and pottery-specific booking patterns (long sessions, add-ons, intake forms).

### 1.5 White-label readiness score: **3 / 10**
"PotteryMania" is hardcoded in 50+ locations: email shell, marketing layout, DNS verification convention, Cloudinary folders, guided copy. Custom domains only work for the landing page — all deep flows redirect to the canonical origin. **Not white-label-ready.**

### 1.6 Scalability score: **5.5 / 10**
In-memory rate limits fail across multiple instances. No Redis. No CDN image optimization. Several 800-1200 line files are maintenance hazards. Schema has 117 models — complex surface. Missing indexes on several hot FK columns.

### 1.7 Commerce strength score: **6 / 10**
Products exist and sell through Stripe Connect. **No product variants** on marketplace products (only wear products have variants). No local pickup email notification. Stock decrement failure after payment does not trigger auto-refund. **Platform commission is hardcoded to 0 bps** — no revenue from transactions today.

### 1.8 Booking strength score: **8 / 10**
The genuine crown jewel. Slot capacity with `FOR UPDATE` row locks, deposit/full payment, cancellation policies with refund math, rescheduling, waitlist with auto-notify, package credits, add-ons, intake forms, Google Calendar sync, QR tickets, booking reminders cron. Some gaps: instructor not assigned during booking creation (schema only), membership not wired to booking checkout.

### 1.9 Operator-friendliness score: **6 / 10**
Dashboard has ~32 sidebar items. Powerful but overwhelming for a first-time studio owner. Guided setup offsets complexity for initial onboarding. Day-to-day operations (bookings, orders, shop) are functional but the navigation density creates cognitive load.

### 1.10 Acquisition attractiveness score: **6.5 / 10**
Real Stripe Connect integration is rare and expensive to build. The booking engine is genuinely deep. 117-model schema represents months of data modeling. But commission is 0%, membership is broken, white-label is fiction, and the product isn't yet generating platform revenue.

**Blunt verdict:** This is a **serious technical foundation** with real booking depth and working Stripe Connect — both expensive to build from scratch. It is **not** a finished business. The platform has no revenue mechanism enabled (0% commission), broken membership monetization, no white-label capability, and several operational gaps that would surface within the first month of real studio usage. A buyer should price this as **code + architecture**, not as a product or business.

---

# SECTION 2 — WHAT THIS PRODUCT ACTUALLY IS

**1. It is mainly:** A **vertical SaaS for pottery studios** — a hybrid booking + e-commerce system built specifically for ceramic/creative businesses, with a separate "wear" (print-on-demand) catalog grafted alongside.

**2. Real center of gravity:** The **booking engine**. This is where the deepest logic lives — slot capacity locking, cancellation policies, deposit math, rescheduling, waitlists, packages, add-ons, intake forms, QR tickets, calendar sync.

**3. Strongest part:** Booking flow + Stripe Connect settlement. `FOR UPDATE` row locks on capacity, atomic coupon redemption, webhook deduplication, gift card balance atomicity — this is real transactional engineering.

**4. Weakest part:** E-commerce. No product variants on studio products. No local pickup customer notification. Stock failure after payment = cancelled order with no auto-refund. The shop feels like an add-on next to the booking core.

**5. Pretending to be what it isn't:** White-label SaaS. The code, copy, and architecture are thoroughly branded "PotteryMania." Custom domains only serve the studio landing page. A studio cannot present a fully independent online presence.

**6. Buyer who would overestimate:** Someone impressed by the 117-model schema and 241 API routes who doesn't test the actual end-to-end flows. The breadth looks massive; the depth is concentrated in bookings.

**7. Buyer who would underuse:** A pure e-commerce buyer. The booking engine is where the value is. If you only want to sell products, this is overbuilt for that purpose.

**8. Ideal actual customer:** A pottery/ceramic studio that primarily teaches classes and wants to sell some products on the side. They need booking, deposits, packages, and a basic shop — not a Shopify competitor.

**9. Wrong customer:** A studio that primarily sells products and occasionally teaches. They need real e-commerce (variants, inventory, shipping rules) more than booking depth.

**10. Classification:** An **infrastructure layer with product ambitions** — strong plumbing, incomplete product polish, no active business model.

---

# SECTION 3 — AUDIT THROUGH 15 ELITE EXPERT LENSES

## 3.1 Pottery Studio Owner

**Verdict:** Functional with meaningful ceramic-specific depth. Operationally dense.

**Strengths:**
- Ceramic-specific categories in guided onboarding (bowls, plates, mugs, etc.)
- `KilnFiring` and `KilnItem` models for firing management — rare in generic booking tools
- Cancellation policies configurable per experience
- Deposit/full payment options per class
- Add-ons (e.g., materials, tools) and intake forms (e.g., experience level, allergies)
- Waitlist with auto-notification when spots open

**Weaknesses:**
- Dashboard navigation has ~32 items — creates decision fatigue for non-technical owners
- Instructor assignment exists in schema but is **not wired** in the booking creation flow
- No visual schedule builder — slots are generated via API from recurring rules, then managed in a list
- Membership purchase is broken (returns "temporarily unavailable")

**Hidden risks:**
- A studio that expects to assign specific instructors to specific slots will find the feature incomplete
- Recurring class generation is on-demand (vendor triggers it), not automatic — studios must remember to generate future slots

**Missing capabilities:**
- Multi-instructor scheduling conflicts (no overlap detection between instructors)
- Children vs. adult class differentiation (no age-based logic)
- Firing pickup sessions (kiln model exists but no customer-facing "pick up your piece" flow)

**Practical consequence:** A pottery teacher can create classes, accept bookings with deposits, handle cancellations with refund policies, and manage a small shop. They will need tech comfort to navigate the dense dashboard, and will hit walls on instructor scheduling and membership sales.

---

## 3.2 End Customer / Student / Buyer

**Verdict:** Functional mobile-responsive booking. Shopping flow is secondary.

**Strengths:**
- Class browsing with filters, upcoming slot display
- Add-to-cart flow integrates bookings and products in a unified cart
- Stripe Checkout (hosted) provides trust and PCI compliance
- Confirmation page shows booking details + QR ticket
- Waitlist join for full classes
- Pay-at-studio option for in-person payment

**Weaknesses:**
- No intermediate checkout page — cart goes directly to Stripe hosted checkout, so the customer can't review a summary on-site before redirect
- Success page can show "processing" state if webhook hasn't completed — potentially confusing
- Gift cards route not in public allowlist in middleware — logged-out users may get redirected

**Confusion points:**
- Membership listing page exists but purchasing is broken — customer sees memberships they can't buy
- "Wear" shop is a separate flow from the main marketplace — two different carts, two different checkout experiences

**Practical consequence:** A 22-year-old can book a pottery class on mobile without friction. A 58-year-old may be confused by the Stripe redirect and "processing" state. Product shopping is functional but feels secondary.

---

## 3.3 Product Strategist

**Verdict:** Strong niche positioning weakened by feature sprawl.

**Strengths:**
- Clear problem-solution fit: pottery studios need booking + selling + payments in one place
- Ceramic-specific features (kiln, ceramic categories, pottery-oriented copy) create defensibility
- Stripe Connect enables platform economics (once commission is turned on)

**Weaknesses:**
- Feature sprawl: loyalty, memberships, packages, gift cards, wear/print-on-demand, analytics, AI chat, insights, experiments — breadth without depth in many areas
- **Commission is 0%** — the platform has no revenue model enabled in code
- Positioning confusion: is it a marketplace (`/marketplace`), a studio tool, or a white-label platform? All three are partially built, none complete

**Practical consequence:** The product could be a focused winner for pottery studio booking + selling. The sprawl into loyalty programs, AI features, and print-on-demand dilutes engineering focus and adds maintenance burden without clear revenue justification.

---

## 3.4 UX / UI Expert

**Verdict:** Functional and responsive. Not premium. Dense.

**Strengths:**
- Consistent Tailwind + design tokens (`ui` namespace, `--st-*` studio tokens)
- Mobile-responsive throughout (flexbox/grid breakpoints verified across page files)
- Studio theming system with curated presets provides visual differentiation
- Error boundaries exist at key route segments (admin, dashboard, classes)

**Weaknesses:**
- ~32-item studio sidebar creates visual overload
- Several client components exceed 500-1200 lines — suggests complex UIs that could benefit from decomposition
- Loading state coverage is uneven — some routes have `loading.tsx`, many rely on client-side spinners
- No accessibility testing beyond one Playwright spec (axe-core serious/critical only)

**Practical consequence:** The interface is competent but not polished. It communicates "developer-built SaaS" not "design-led product." Studio owners with tech comfort will manage; design-sensitive customers may feel the density.

---

## 3.5 Booking System Specialist

**Verdict:** Genuinely robust. Best-in-class for a startup-stage product.

**Strengths:**
- `FOR UPDATE` row locks on `booking_slots` during capacity reservation — prevents overbooking at the database level
- Cancellation policy engine with configurable types: non-refundable, refundable until X hours, partial refund, custom
- Policy snapshot stored on booking at creation time — survives policy changes
- Deposit system with `bookingDepositBps` and optional full-payment override
- Remainder payment flow for balance after deposit
- Rescheduling with atomic reserve-new/release-old in transaction
- Waitlist with auto-notification on capacity release after cancellation
- Package credit system with consumption and auto-restore on cancel
- Add-ons and intake forms linked to experiences
- QR tickets with unique `ticketRef`
- Google Calendar sync on confirmation
- 24-hour booking reminders via cron
- Booking audit log

**Weaknesses:**
- **Capacity race window:** Between Stripe checkout creation and webhook settlement, multiple users can start checkout for the same last seat. The webhook handles this by auto-cancelling the loser, but the customer experience is: pay -> get cancelled -> wait for refund
- **Instructor not assigned during booking** — schema field exists, never populated in creation
- **Membership redemption not wired** — `membershipPurchaseId` on Booking is never set in any creation path
- **No overlap/conflict detection** between slots or instructors
- **Slot generation is manual** — vendor must trigger generation; no auto-extend

**What breaks first under real usage:** The instructor gap. A studio with 3 teachers will immediately need to assign instructors to classes and see who's teaching when. The current system can't do this through the booking flow.

---

## 3.6 E-commerce Specialist

**Verdict:** Functional but thin. Adjunct to booking, not a standalone commerce engine.

**Strengths:**
- Products with images, categories (including `CeramicCategory` enum), pricing, sale prices
- Multi-zone shipping (domestic, Europe, etc.) per product
- Cart merges bookings + products
- Stripe Connect checkout with webhook settlement
- Order fulfillment states including `ready_for_pickup`
- Shipped notification email with tracking

**Weaknesses:**
- **No product variants** on marketplace products — single SKU per product. A potter selling mugs in 3 colors needs 3 separate products
- **Stock failure after payment doesn't auto-refund** — order is cancelled but Stripe payment stands
- **No local pickup customer email** — `ready_for_pickup` status exists but only `shipped` triggers a customer email
- **No tax calculation integration** — tax line item added manually in code
- **No returns/exchange flow**

**Would a studio abandon Shopify for this?** No. A studio with more than 10 products or needing variants would stay on Shopify. This works for a studio selling 5-15 simple ceramic pieces as a complement to their classes.

---

## 3.7 Multi-Tenant / White-Label SaaS Architect

**Verdict:** Multi-tenant at the data layer. White-label is fiction.

**Strengths:**
- `studioId` scoping on all tenant data
- `StripeAccount` per studio (Connect Express)
- `VendorDomain` model with DNS verification
- Studio-scoped theme tokens
- Per-studio notification templates

**Weaknesses:**
- **Custom domains only serve the landing page** — all deep routes (checkout, classes, account) redirect to canonical origin
- **Platform branding is non-removable** without code changes: header/footer chrome, email shell, metadata defaults, Cloudinary paths
- **No tenant-configurable platform name** — "PotteryMania" hardcoded in 50+ locations
- **DNS verification convention uses `_potterymania.*`** — platform-branded
- **Tenant isolation is route-level, not middleware-level** — each route must implement its own `ownerUserId === user.id` check. A shared `requireStudioOwner` helper exists in `lib/studio-api-auth.ts` but is **imported nowhere**

**CRITICAL:** White-label is not an option without significant architectural investment.

---

## 3.8 Technical Architect

**Verdict:** Healthy architecture with hotspots. Salvageable and extendable.

**Strengths:**
- Next.js 15.5 / React 19 — current stack
- TypeScript strict mode, **zero `any` usage** across entire codebase
- 117 Prisma models with proper relations and 145+ indexes
- 72 incremental migrations — evidence of iterative production evolution
- Clean separation: `lib/` for domain logic, `app/api/` for routes, `components/` for UI
- Lean dependency count: 18 production, 15 dev
- Dockerfile + Railway config + pre-deploy migrations

**Weaknesses:**
- **God files:** `studio-shop-client.tsx` (1,213 lines), `guided-app.tsx` (977 lines), `webhooks/stripe/route.ts` (838 lines), `checkout/route.ts` (561 lines)
- **Main CI (`ci.yml`) does not run Vitest tests** — only lint and build
- **No code coverage tooling** configured
- **In-memory rate limiting** won't work across multiple instances
- **Unused shared helpers** (`requireStudioOwner` in `lib/studio-api-auth.ts`, `apiError`/`apiSuccess` in `lib/api-response.ts`) — both exist but have zero imports
- **`schema.prisma` is 3,177 lines** — hard to navigate

**Is the codebase salvageable?** Yes. The architecture is clean enough to extend. The main risks are the large files and the lack of centralized auth helpers.

---

## 3.9 Security Expert

**Verdict:** Above average for a startup. Not hardened for enterprise.

**Strengths:**
- Auth.js with bcrypt password hashing, email verification, suspension checks
- CSRF via Origin/Referer validation on state-changing methods with session cookies
- Stripe webhook signature verification + deduplication store
- Admin/hyper_admin role separation with impersonation audit trail
- Parameterized raw SQL (not string concatenation)
- Upload signing requires authentication + folder allowlist

**Weaknesses:**
- **Auth.js v5 beta (5.0.0-beta.30)** — pre-release for a payments application
- **CSRF not enforced for guest flows** (no session cookie = no check)
- **In-memory rate limits** reset on deploy, don't work multi-instance
- **Public studio reviews API exposes author email** (`studios/[studioId]/reviews` selects `author.email` instead of `author.name`)
- **`trustHost: true`** in NextAuth config — review host-header trust implications

**Could one studio see another's data?** Unlikely via the tested routes — owner checks are present. But the lack of a centralized middleware-level tenant filter means a new route could accidentally skip the check. **Process risk, not a confirmed vulnerability.**

---

## 3.10 Payments and Billing Specialist

**Verdict:** Stripe Connect integration is solid. Reconciliation gaps exist.

**Strengths:**
- Stripe Connect (Express accounts) with direct charges on connected accounts
- Application fee mechanism wired (via `payment_intent_data.application_fee_amount`)
- Webhook settlement with `FOR UPDATE` row lock on orders
- Gift card balance atomicity (`updateMany` with `remainingValueCents >= amount`)
- Coupon redemption with `FOR UPDATE` lock + capacity check at commit
- Webhook deduplication store prevents double-processing
- Financial ledger entries + daily snapshot aggregation
- Finance reconciliation cron syncs Stripe balance transactions

**Weaknesses:**
- **Platform commission is 0%** — `DEFAULT_PLATFORM_COMMISSION_BPS = 0` in `lib/commission-defaults.ts`. The platform earns nothing from transactions
- **Post-payment stock failure doesn't auto-refund** — money captured, order cancelled, manual intervention needed
- **Booking refund caps to DB payment amount**, not Stripe's actual refundable balance — can diverge after partial refunds
- **Expired checkout sessions:** gift card reservations are released, but no proactive customer communication

---

## 3.11 Legal / Compliance Reviewer

**Verdict:** Basic legal pages exist. GDPR posture is surface-level.

**Strengths:**
- `/privacy`, `/terms`, `/vendor-terms` pages exist
- Cancellation policies are configurable and stored as snapshots
- Email verification on registration

**Weaknesses:**
- **No GDPR data export or deletion mechanism** in the API or admin tools
- **No cookie consent banner** detected in the codebase
- **Review author email exposed** in public API — potential GDPR issue
- **No explicit data processing agreements** for studio-customer relationships

**CRITICAL:** GDPR compliance for EU pottery studios is mandatory. No data export/deletion capability is a **regulatory risk**.

---

## 3.12 Studio Operations Specialist

**Verdict:** Covers the basics. Daily friction from UI density and gaps.

**Strengths:**
- Dashboard home shows today's bookings, upcoming slots, revenue snapshot
- Order management with fulfillment states and tracking
- Check-in and batch attendance marking for classes
- Calendar notes for internal scheduling
- Studio date blocks for closures
- Student/CRM contacts with import capability

**Weaknesses:**
- Instructor-to-class assignment is not operational
- No no-show automatic handling
- Slot generation is manual — studios must remember to generate slots for future weeks
- Dashboard sidebar density (~32 items) means common tasks require extra clicks

---

## 3.13 Growth / Conversion Specialist

**Verdict:** Revenue capture mechanisms exist. Conversion optimization is absent.

**Strengths:**
- Gift cards (purchase + email delivery + redemption at checkout)
- Coupons (studio-scoped and global, percentage/fixed, capacity limits)
- Class packages (multi-credit purchases)
- "Book soon" post-visit follow-up emails via cron
- Review collection via cron-based review request emails
- Waitlist -> auto-notify conversion when spots open
- Abandoned cart recovery emails (cron sends emails, confirmed in code)

**Weaknesses:**
- **No upsell/cross-sell** during checkout
- **No referral tracking** that converts to revenue
- **Commission at 0%** means the platform captures no transaction revenue
- **Loyalty program is cron-driven and delayed** — points earned after completion, not real-time

---

## 3.14 Customer Support / Service Designer

**Verdict:** Moderate support burden. Several confusion generators.

**Confusion generators:**
- Membership page visible but purchase broken
- Two separate cart/checkout experiences (marketplace vs. wear)
- "Processing" state on success page when webhook is delayed
- Gift cards page potentially blocked by middleware for logged-out users

**Self-service strength:**
- `/my-bookings`, `/my-orders`, `/my-packages`, `/my-memberships`, `/my-loyalty` — customer account pages exist
- Rescheduling options available to customers

**Support documentation:** None beyond README. No help center, FAQ, or in-app guidance for studio owners or customers.

---

## 3.15 Acquisition / Investment Analyst

**Verdict:** Buy the code and booking engine, not the business.

**Main asset:** Stripe Connect booking engine with 117-model schema. Rebuild cost: $100K-$200K+ in engineering hours.

**What's genuinely valuable:**
- Booking engine depth (capacity locking, policies, deposits, rescheduling, waitlist)
- Stripe Connect integration (rare, expensive to build, working)
- Ceramic-vertical specificity (categories, kiln, guided onboarding)
- 72 production migrations (battle-tested schema evolution)

**What's inflated:**
- "White-label" capability (doesn't exist)
- Feature count (many features are partial or stub)
- 241 API routes that suggest more depth than exists

**Negotiate aggressively on:** Broken memberships, 0% commission, missing product variants, white-label fiction, no GDPR compliance.

---

# SECTION 4 — THE 3-ENVIRONMENT MODEL

## 4.1 Environment A — Hyperadmin / Platform Owner

**37 admin pages** covering: studios, users, bookings, orders, revenue, finance, coupons, categories, feature flags, marketplace ranking, platform features, audit log, war room, webhook events, notifications, experiments, AI insights, wear products/orders/analytics.

**What the platform owner can control:** Studio approval/rejection, user role management (with hyper_admin guard), commission rules, coupons, categories, feature flags, impersonation with audit trail, financial reconciliation, webhook replay.

**What's missing:** No customer support inbox or ticket system. No bulk communication tool. No real-time platform health dashboard. No churn/retention analytics at platform level.

**What becomes dangerous at scale:** In-memory rate limits; manual webhook dedup that can leak under high concurrency; 117-model schema without a DBA; no horizontal scaling story.

## 4.2 Environment B — Studio Admin / Studio Owner

**47 dashboard pages** covering the full operational surface: home, classes, bookings, calendar, shop, orders, add-ons, intake forms, packages, memberships, gift cards, promotions, loyalty, reviews, instructors, locations, students, gallery, news, notifications, analytics, tax reports, settings, guided setup, template, AI, kiln, features, payments.

**Can a studio run this without constant help?** A tech-comfortable studio owner can, using the guided setup for initial onboarding. A non-technical owner will need support for recurring slot generation, shipping zone configuration, Stripe Connect setup, and dashboard navigation.

**Where confusion starts:** The ~32-item sidebar. The distinction between "classes" (experience management), "bookings" (booking management), and "calendar" (calendar view). Settings split across multiple locations.

## 4.3 Environment C — End Customer / Student / Buyer

**Booking path:** Browse classes -> select class -> see upcoming slots -> select date/participants/add-ons -> fill intake form -> add to cart -> Stripe checkout -> confirmation with QR ticket. **Functional and mobile-responsive.**

**Shopping path:** Browse marketplace or studio page -> add product to cart -> same cart as bookings -> Stripe checkout -> order confirmation -> track via my-orders. **Functional but thin.**

**Does the product generate trust?** The Stripe hosted checkout is the strongest trust signal. Studio pages with themed branding help. The overall product design communicates "startup tool" not "established platform."

---

# SECTION 5 — BOOKING SYSTEM DEEP INSPECTION

| Subsection | Rating | Notes |
|---|---|---|
| 5.1 Class types | **Strong** | One-time, recurring weekly, custom-day, manual dates, flexible window. No explicit multi-day event. |
| 5.2 Capacity logic | **Strong** | `FOR UPDATE` row locks. `capacityTotal`/`capacityReserved` on slots. Seat-type validation. |
| 5.3 Booking flow | **Acceptable** | Full path works. Race window between checkout and settlement handled by auto-cancel. |
| 5.4 Booking rules | **Strong** | Cancellation policies (4 types), policy snapshots, rescheduling, package credit restore on cancel. |
| 5.5 Calendar logic | **Acceptable** | Studio calendar page exists. Date blocks. Google sync. No conflict detection. |
| 5.6 Instructor logic | **Weak** | Schema exists. Not wired in booking creation. No schedule/availability view. |
| 5.7 Communication | **Strong** | Confirmations, reminders, iCal, reschedule emails, waitlist notify. |
| 5.8 Real-world pottery fit | **Acceptable** | Long sessions supported. Kiln model exists. No firing-pickup flow. No age-based logic. |

---

# SECTION 6 — E-COMMERCE SYSTEM DEEP INSPECTION

| Subsection | Rating | Notes |
|---|---|---|
| 6.1 Product structure | **Acceptable** | Products with images, categories, pricing, sale prices, stock. No variants. |
| 6.2 Storefront quality | **Acceptable** | Themed studio pages. Image gallery. Category browsing. Not premium. |
| 6.3 Studio independence | **Weak** | Platform chrome inescapable. Custom domain landing-page only. |
| 6.4 Checkout flow | **Acceptable** | Stripe hosted. Gift cards + coupons. No on-site summary. |
| 6.5 Fulfillment logic | **Weak** | Order states exist. Shipped email works. No pickup email. No returns. |
| 6.6 Commercial realism | **Weak** | Works for 5-15 simple products. No variant/inventory depth. |

---

# SECTION 7 — MOBILE-FIRST REALITY TEST

**Mobile readiness score: 65 / 100**

- All pages use Tailwind responsive breakpoints
- Mobile nav exists with E2E test coverage
- Stripe hosted checkout handles its own mobile UX
- Dashboard ~32 items in mobile hamburger is uncomfortable
- No evidence of keyboard overlap handling or scroll trap prevention
- Classification: **Mobile-tolerant, not mobile-first**

---

# SECTION 8 — ONBOARDING AND SETUP ANALYSIS

**Setup difficulty:** 6 / 10
**Time-to-first-value:** ~45-90 minutes
**Required support burden:** Medium

**The guided setup journey:**
1. Register -> role `customer` -> create studio (quick or full form) -> guided setup launches
2. Guided setup: studio basics (3 steps) -> add product (5 steps, ceramics-oriented) -> add class (6 steps) -> connect Stripe Express -> go live

**Where non-technical owners get stuck:**
- Recurring slot generation ("when do I create next month's classes?")
- Shipping zones per product
- Stripe Connect Express onboarding
- Finding features in the 32-item sidebar after guided setup

---

# SECTION 9 — TEMPLATE, BRANDING, AND WHITE-LABEL JUDGMENT

**Studio visual control:** 6 presets x accent colors (clay, sand, olive, stone, wine) x font pairs x layout/density options. Studios look distinct within boundaries — no arbitrary hex, no uploaded fonts.

**Platform chrome:** Inescapable. `MarketingLayout` wraps all customer pages with PotteryMania header/footer. Emails use PotteryMania wordmark. Metadata defaults to PotteryMania.

**Verdict:** White-labeling requires touching 50+ files, configurable platform name, removable chrome, white-label email shell, generic DNS convention, generic onboarding taxonomy. **Not realistic without major investment.**

---

# SECTION 10 — DATA, REPORTING, AND CONTROL

**What exists:**
- Studio analytics dashboard (orders, bookings, revenue, attendance, top products)
- Hyperadmin revenue + finance command center
- Tax report per studio
- Financial ledger entries + daily snapshots
- Admin audit log
- Admin CSV exports (audit, cohort, finance)

**What's missing:**
- Customer lifetime value reporting
- Cancellation trend analysis
- Instructor performance metrics
- Studio-level CSV/PDF export
- Cohort analysis
- Platform-level churn/retention analytics

---

# SECTION 11 — RISK REGISTER

| # | Category | Risk | Severity | Description | Blocks Acquisition? |
|---|----------|------|----------|-------------|---------------------|
| 1 | Financial | Platform commission is 0% | **P0** | `DEFAULT_PLATFORM_COMMISSION_BPS = 0` — no revenue | Yes |
| 2 | Product | Membership purchase broken | **P1** | Returns 503 "temporarily unavailable" | No |
| 3 | Security | Auth.js v5 beta | **P1** | Pre-release auth library for payments app | No |
| 4 | Technical | In-memory rate limiting | **P1** | Single-instance only, resets on deploy | No |
| 5 | Legal | No GDPR data export/deletion | **P0** | EU studios require GDPR compliance | **BLOCKER for EU** |
| 6 | Financial | Stock failure no auto-refund | **P1** | Payment captured, order cancelled, no refund | No |
| 7 | Product | No product variants | **P2** | Single SKU per product | No |
| 8 | Security | Reviews expose author email | **P1** | `studios/[studioId]/reviews` returns `author.email` | No |
| 9 | Operational | Instructor not assigned in booking | **P2** | Schema exists, flow doesn't wire it | No |
| 10 | Technical | God files (1200+ lines) | **P2** | Maintenance and review difficulty | No |
| 11 | Product | White-label is fiction | **P1** | 50+ hardcoded brand references | No |
| 12 | Reputational | Membership visible but broken | **P2** | Customer sees feature they can't use | No |
| 13 | Support | Dense dashboard (~32 items) | **P3** | Cognitive overload for new owners | No |
| 14 | Technical | CI doesn't run Vitest | **P2** | Main CI only runs lint + build | No |

---

# SECTION 12 — THE CHECKPOINT MATRIX (25 categories)

| # | Category | Score /10 | Top Strengths | Top Failures |
|---|----------|-----------|---------------|--------------|
| 1 | Booking setup | 8 | Rich experience model, recurring rules, add-ons | Manual slot generation |
| 2 | Booking management | 8 | Cancel/reschedule/refund, audit log, waitlist | No-show handling manual |
| 3 | Recurring logic | 7 | Multiple recurrence types, materialized slots | On-demand, no auto-creation |
| 4 | Capacity logic | 9 | FOR UPDATE row locks, seat types | Race window during checkout |
| 5 | Customer booking UX | 7 | Unified cart, pay-at-studio, waitlist | No checkout summary |
| 6 | Booking communications | 8 | Confirmations, reminders, iCal, reschedule | No SMS |
| 7 | Payments and refunds | 7 | Stripe Connect, webhook dedup, deposit/remainder | 0% commission, stock-fail gap |
| 8 | Product setup | 6 | Sale prices, ceramic categories, images | No variants, no bulk ops |
| 9 | Storefront UX | 6 | Themed studio pages, categories, gallery | Platform chrome, not premium |
| 10 | Checkout | 7 | Stripe hosted, gift cards, coupons | No on-site summary, two carts |
| 11 | Fulfillment | 5 | Order states, tracking, shipped email | No pickup email, no returns |
| 12 | Studio branding | 6 | Theme presets, accent colors, logo | No custom hex, platform chrome |
| 13 | Studio admin dashboard | 6 | Comprehensive coverage, guided setup | ~32 sidebar items |
| 14 | Hyperadmin controls | 7 | Studio mgmt, roles, finance, audit | No support inbox, no bulk comms |
| 15 | Reporting | 5 | Revenue dashboard, analytics snapshots | No export, no CLV |
| 16 | Mobile UX | 6.5 | Responsive throughout, mobile nav | Dense dashboard |
| 17 | Multi-tenant integrity | 7 | studioId scoping, Connect per studio | Route-level checks not centralized |
| 18 | Security | 6.5 | CSRF, webhook sig, bcrypt, role separation | Beta auth, in-memory rate limits |
| 19 | Legal/compliance | 4 | Privacy/terms pages, policy snapshots | No GDPR, no cookie consent |
| 20 | Growth and conversion | 5 | Gift cards, coupons, packages, book-soon | No upsell, 0% commission |
| 21 | Support burden | 5 | Account pages, rescheduling self-service | No help center, confusing membership |
| 22 | White-label readiness | 3 | Theme tokens, Connect per studio | Hardcoded brand everywhere |
| 23 | Architecture quality | 7 | Strict TS, zero `any`, modular lib/ | God files, no coverage, CI gaps |
| 24 | Integration readiness | 5 | Google Calendar, Cloudinary, Resend, Stripe | No Zapier/API docs, no webhook out |
| 25 | Acquisition attractiveness | 6.5 | Rare Stripe Connect booking engine | 0% commission, no business model |

---

# SECTION 13 — COMPETITIVE COMPARISON

**vs. Shopify:** Loses badly on commerce. Wins on embedded booking engine.

**vs. Momence / Mindbody:** Competitive on class booking depth. Loses on maturity, mobile apps, instructor scheduling. Wins on ceramic-vertical specificity.

**vs. Acuity / Calendly:** Wins decisively. Multi-seat classes with capacity, deposits, packages, waitlists vs. 1:1 scheduling.

**vs. WooCommerce + booking plugin:** Similar capability if stitched together. PotteryMania has tighter booking-commerce integration.

**vs. Custom/no-code stack:** PotteryMania provides more than most studios would build. Booking engine alone justifies not building custom.

---

# SECTION 14 — WHAT WE'D BE BUYING

**Primarily buying:**
- Booking engine codebase (deepest, most tested, most valuable)
- Stripe Connect integration (rare, working)
- 117-model Prisma schema (months of data modeling)
- Niche positioning ("pottery studio software")
- Speed-to-market (1,240-1,760 hours of rebuild avoided)

**Rebuild cost estimate:** $99,200-$211,200 at $80-120/hr

**Valuation ranges:**
- No paying customers (code only): **$8,000-$15,000**
- 5-20 paying studios: **$25,000-$50,000**
- 50+ paying studios with MRR: **$80,000-$150,000+**

---

# SECTION 15 — POST-ACQUISITION REALITY

## 15.1 Fix in 7 days
- Turn on platform commission (change `DEFAULT_PLATFORM_COMMISSION_BPS`)
- Fix or hide membership purchase
- Fix reviews API email leak
- Add `npm test` to CI
- Verify `.env.local` is not versioned

## 15.2 Fix in 30 days
- Reorganize studio dashboard sidebar
- Wire instructor assignment into booking creation
- Add product variants
- Add auto-refund on stock decrement failure
- Add local pickup customer email
- Add on-site checkout summary before Stripe redirect
- Fix gift cards middleware for logged-out users

## 15.3 Fix in 90 days
- Migrate rate limiting to Redis
- Split god files
- Build GDPR data export/deletion
- Add cookie consent
- Centralize studio auth helper
- Add code coverage to CI
- Upgrade Auth.js when stable
- Polish email templates to be studio-branded

---

# SECTION 16 — NEGOTIATION INTELLIGENCE

**Weaknesses that justify lower price:**
1. Commission is 0% — never generated platform revenue
2. Membership purchase is broken
3. No GDPR compliance
4. Auth.js beta
5. No product variants
6. White-label is fiction
7. In-memory rate limiting
8. No evidence of paying customers

**Top 10 questions for the seller:**
1. How many real paying studios are using this today?
2. What is the monthly transaction volume through Stripe Connect?
3. Has any studio processed a real refund?
4. Why is commission set to 0%?
5. Why is membership purchase disabled?
6. Has the system handled concurrent last-seat bookings?
7. How many support requests do studios generate per month?
8. What is the Stripe Connect account status?
9. Is there any recurring revenue today?
10. What would break if you deployed to a second server instance?

---

# SECTION 17 — FINAL BRUTAL VERDICT

## What is genuinely strong
The booking engine. Capacity locking, cancellation policies, deposit/remainder flows, rescheduling, waitlist, package credits, calendar sync. Stripe Connect integration. 117-model schema.

## What is average
E-commerce, admin dashboard, studio management surface. Functional but not deep or polished.

## What is weak
Product variants (none), fulfillment (basic), reporting (directional), white-label (fiction), mobile admin (tolerable), GDPR (absent).

## What is risky
Auth.js v5 beta. In-memory rate limiting. Capacity race window. Stock failure gap. `.env.local` credentials.

## What is fake-good
White-label capability. "Marketplace" concept. Feature breadth (many partial). 241 API routes implying more depth than exists.

## What is underbuilt
Instructor scheduling, product variants, membership purchase, GDPR tools, reporting, abandoned cart recovery depth.

## What is overcomplicated
~32-item sidebar. Separate wear store. Experiment/Insight/PricingScenario models. 117-model schema with unused models.

## Final recommendation:

**I would buy this only at a sharply reduced valuation.** Price as code + architecture ($8K-$18K), not business. Budget $15K-$30K additional engineering. Total to acquire and stabilize: $25K-$50K.

---
---

# PART TWO — MASTER TRANSFORMATION ROADMAP

---

# SECTION 1 — TRANSFORMATION VERDICT

## 1.1 Current product state

PotteryMania is a **strong concept with uneven execution**. The booking engine is genuinely deep — capacity locking, cancellation policies, deposits, rescheduling, waitlists, and package credits represent serious transactional engineering. The Stripe Connect integration works. The ceramic-vertical specificity is real.

But the product is fragmented. Commerce is thin (no variants). Memberships are broken. The dashboard is dense to the point of hostility (~32 sidebar items). The platform earns nothing (0% commission). White-label claims are fiction. GDPR compliance is absent. Multiple features exist at schema level but aren't wired into user flows. The result: impressive infrastructure, incomplete product, no active business model.

## 1.2 What must happen now

**Stabilize, simplify, monetize.**

1. Fix the money bugs and security gaps (commission, refunds, auth email leak, rate limits)
2. Kill or hide everything that's broken or half-built (membership purchase, wear store complexity, experiment models)
3. Simplify the studio dashboard from 32 items to a focused operational surface
4. Harden the booking engine's remaining gaps (instructor assignment, membership redemption)
5. Add the commerce basics that studios expect (product variants, local pickup email)
6. Build GDPR compliance
7. Make the product feel premium, not "developer-built"

## 1.3 Final target state

A **focused, premium pottery-studio platform** where:
- A studio owner can set up their business in under 30 minutes
- A customer can book a class or buy a product in under 2 minutes on mobile
- The platform operator earns commission on every transaction
- Every feature that's visible actually works
- The dashboard is clear, not dense
- The booking engine is the best in the ceramics vertical
- The commerce layer handles simple product selling with variants
- Emails are studio-branded, not platform-branded
- GDPR compliance is built in
- The codebase is maintainable, tested, and scalable

---

# SECTION 2 — MASTER TRANSFORMATION STRATEGY

## Pillar 1: Product Focus and Simplification

**Why:** Feature sprawl dilutes quality. 32 sidebar items, wear store, experiments, AI advisor, pricing scenarios — complexity without proportional value.

**Audit revealed:** ~32 nav items; separate wear cart/checkout; unused models (Experiment, PricingScenario); membership broken but visible; loyalty delayed and cron-driven.

**Success:** Dashboard has < 15 primary nav items. Every visible feature works. No dual-cart confusion.

**If ignored:** Studios drown in complexity. Support burden stays high. Product feels like a prototype.

## Pillar 2: Booking System Hardening

**Why:** The booking engine is the crown jewel. Its gaps (instructor assignment, membership redemption, auto-slot generation) must be closed to justify the niche positioning.

**Audit revealed:** Instructor not wired in booking creation. Membership never set on bookings. Slot generation is manual. No overlap detection.

**Success:** Instructor assigned per booking. Memberships redeemable at checkout. Recurring slots auto-extend. Overlap warnings.

**If ignored:** Studios with multiple instructors can't use the system properly. The strongest feature has embarrassing gaps.

## Pillar 3: Commerce System Strengthening

**Why:** Studios selling pottery need at minimum: product variants, proper fulfillment notifications, and auto-refund on stock failure.

**Audit revealed:** No variants on marketplace products. Stock failure after payment has no auto-refund. No local pickup email. No returns flow.

**Success:** Products support variants (color, size). Stock failure triggers automatic Stripe refund. Pickup and shipped emails both work.

**If ignored:** Studios with varied products can't use the shop. Money gets captured for unavailable products.

## Pillar 4: Mobile-First UX Reconstruction

**Why:** Most end customers will book on mobile. The current product is mobile-tolerant, not mobile-first.

**Audit revealed:** Mobile readiness 65/100. Dense dashboard in hamburger. No checkout summary before Stripe redirect. Loading states uneven.

**Success:** Booking completes in < 5 taps on mobile. Dashboard has mobile-optimized quick actions. All routes have loading states.

**If ignored:** Conversion drops. Customer trust suffers. Studios look unprofessional to their customers.

## Pillar 5: Studio Admin Usability Overhaul

**Why:** The dashboard is the product for studio owners. If it's confusing, they churn.

**Audit revealed:** ~32 sidebar items. Settings fragmented across multiple pages. Guided setup strong but post-setup navigation overwhelming.

**Success:** Dashboard grouped into < 8 categories with collapsible sections. Settings consolidated. Quick-action dashboard home.

**If ignored:** Studios need constant support. Onboarding succeeds, retention fails.

## Pillar 6: End-Customer Conversion Optimization

**Why:** Every lost booking or abandoned cart is lost revenue for both the studio and the platform.

**Audit revealed:** No on-site checkout summary. No upsell mechanics. Abandoned cart emails exist but the path has no cross-sell. Two separate cart experiences.

**Success:** Single cart with on-site summary. Relevant upsells at checkout. Cart recovery emails with product/class images.

**If ignored:** Revenue leaks at checkout. Studios don't grow through the platform.

## Pillar 7: Trust, Legal, and Policy Correction

**Why:** EU pottery studios are the target market. GDPR is law. Cookie consent is required. Policies must match behavior.

**Audit revealed:** No GDPR data export/deletion. No cookie consent. Reviews expose email. Custom cancellation policy text may not match code behavior.

**Success:** GDPR data export + right-to-deletion APIs. Cookie consent banner. Policies verified against code behavior.

**If ignored:** Regulatory fines. Studios can't legally use the platform. Acquisition liability.

## Pillar 8: Revenue Model Activation

**Why:** The platform currently earns $0 from all transactions. Commission at 0%. No subscription billing active.

**Audit revealed:** `DEFAULT_PLATFORM_COMMISSION_BPS = 0`. BillingPlan model exists but flow unclear. No revenue validation.

**Success:** Commission activated at target rate. Studio subscription billing operational. Revenue dashboard shows real earnings.

**If ignored:** No business exists. The product is a charity.

## Pillar 9: Platform Architecture and Technical Debt Cleanup

**Why:** God files, missing CI tests, unused helpers, in-memory rate limits, and beta auth library create compounding risk.

**Audit revealed:** 4 files over 500 lines. CI skips Vitest. `requireStudioOwner` and `apiError/apiSuccess` unused. In-memory rate limiting. Auth.js beta.

**Success:** No file over 400 lines. CI runs all tests. Shared helpers adopted. Redis rate limiting. Auth.js stable.

**If ignored:** Regressions ship. Rate limits fail at scale. Auth library breaks without warning.

## Pillar 10: QA, Release Gates, and Launch Certification

**Why:** The product needs proof of readiness, not just belief in readiness.

**Audit revealed:** 148 Vitest cases, ~112 E2E cases. No code coverage. CI doesn't run tests. No component tests.

**Success:** Coverage > 60%. CI runs Vitest + critical E2E. Every release passes defined gates.

**If ignored:** Bugs reach production. Customer trust erodes. Studio data at risk.

---

# SECTION 3 — PRIORITY LADDER

## P0 — Critical Blockers

These prevent the product from being safe, trustworthy, or commercially viable:

1. **Activate platform commission** — no revenue model (file: `lib/commission-defaults.ts`)
2. **Fix reviews email leak** — GDPR privacy violation (file: `app/api/studios/[studioId]/reviews/route.ts`)
3. **Build GDPR data export/deletion** — regulatory blocker for EU
4. **Add cookie consent banner** — legal requirement
5. **Add auto-refund on stock failure** — money captured for unavailable products (file: `lib/orders/checkout-completion.ts`)
6. **Fix or completely hide membership purchase** — broken feature visible to customers (file: `app/api/memberships/purchase/route.ts`)
7. **Add `npm test` to CI** — regressions can ship (file: `.github/workflows/ci.yml`)

## P1 — Major Structural Issues

Material weaknesses that don't block launch but damage the product:

1. **Reorganize studio dashboard** — 32 items is hostile (file: `lib/studio-panel-nav.ts`)
2. **Wire instructor assignment into booking** — core operational gap
3. **Add product variants** — commerce is crippled without them
4. **Migrate rate limiting to Redis** — single-instance limitation (file: `lib/rate-limit.ts`)
5. **Adopt `requireStudioOwner` helper** across all studio routes (file: `lib/studio-api-auth.ts`)
6. **Split god files** — 4 files over 500 lines
7. **Fix gift cards middleware for logged-out users** — broken public flow
8. **Add on-site checkout summary** — trust gap before Stripe redirect

## P2 — Important Functional and UX Upgrades

1. Wire membership redemption into booking checkout
2. Add auto-slot generation for recurring classes
3. Add local pickup customer email
4. Add upsell mechanics at checkout
5. Upgrade email templates to studio-branded
6. Add code coverage to CI
7. Build studio-level CSV/PDF export
8. Add customer lifetime value reporting
9. Consolidate settings pages

## P3 — Polish, Refinement, Premium Finishing

1. Premium loading states on all routes
2. Accessibility audit (beyond axe-core basics)
3. Animation and micro-interaction polish
4. Help center / knowledge base
5. Instructor schedule/availability view
6. Studio date block visual calendar
7. Custom domain full-site routing (not just landing page)
8. Onboarding progress tracking post-guided-setup

---

# SECTION 4 — PHASED ROADMAP

## Phase 1 — Stabilize the Core (Days 1-14)

### A. Objective
Eliminate danger, broken features, and revenue blockers.

### B. Why now
Nothing else matters if the product is legally exposed, financially inert, and shipping broken features.

### C. Key outcomes
- Platform earns commission on transactions
- No broken features visible to customers
- Privacy violations fixed
- CI catches regressions

### D. Dependencies
None — this is the starting point.

### E. Risks if skipped
Regulatory fines. Zero revenue. Customer trust damage. Silent regressions.

### F. Exit criteria
- Commission > 0% on all transactions
- Membership UI hidden or purchase working
- Reviews API returns `author.name` not `author.email`
- CI runs Vitest on every push
- GDPR data export API exists
- Cookie consent banner deployed
- Stock failure triggers auto-refund

---

## Phase 2 — Repair and Simplify (Days 15-35)

### A. Objective
Remove friction, reduce complexity, align user flows.

### B. Why now
Once the core is safe, the product must become usable for its actual audience.

### C. Key outcomes
- Dashboard reorganized from 32 items to < 15 primary
- Studio auth centralized via `requireStudioOwner`
- God files split
- Gift cards accessible to logged-out users
- On-site checkout summary added
- Settings consolidated

### D. Dependencies
Phase 1 complete.

### E. Risks if skipped
Studios churn from confusion. Support costs spike. Developer velocity drops from god-file complexity.

### F. Exit criteria
- Dashboard sidebar has < 15 primary items (grouped with collapsible sections)
- All studio API routes use centralized auth helper
- No source file exceeds 400 lines
- Checkout shows order summary before Stripe redirect
- Settings accessible from a single page

---

## Phase 3 — Upgrade Functional Depth (Days 36-60)

### A. Objective
Close the booking and commerce gaps that matter for real studio usage.

### B. Why now
The product is stable and simple. Now it needs to be functionally complete for its core use cases.

### C. Key outcomes
- Instructors assigned to bookings
- Product variants on marketplace products
- Membership purchase working and redeemable at booking
- Auto-slot generation for recurring classes
- Local pickup customer email
- Rate limiting on Redis

### D. Dependencies
Phase 2 complete. Schema changes for product variants.

### E. Risks if skipped
Studios with multiple instructors can't use the system. Commerce remains weak. Memberships stay broken.

### F. Exit criteria
- Instructor selectable during booking creation
- Products support at least color/size variants
- Membership purchase works end-to-end
- Recurring classes auto-generate slots 30 days ahead
- Redis rate limiting in production
- Pickup email sent to customers

---

## Phase 4 — Premium Product Elevation (Days 61-80)

### A. Objective
Visual, experiential, and trust-level upgrade to world-class.

### B. Why now
Functional completeness is achieved. Now the product must feel premium.

### C. Key outcomes
- Emails studio-branded (studio logo, not platform wordmark)
- Loading states on all routes
- Upsell mechanics at checkout
- Accessibility improvements
- Help center / FAQ for studio owners
- Premium visual polish

### D. Dependencies
Phase 3 complete.

### E. Risks if skipped
Product works but feels like a startup tool. Studios don't trust it enough to pay premium prices.

### F. Exit criteria
- All customer-facing emails show studio logo and name
- All routes have loading.tsx or Suspense
- Checkout includes relevant class/product upsells
- axe-core accessibility passes on all public pages
- Studio help center with top-20 FAQs

---

## Phase 5 — QA Certification and Launch Proof (Days 81-90)

### A. Objective
Prove the product is ready under real conditions.

### B. Why now
Everything is built. Now it must be proven.

### C. Key outcomes
- Full booking lifecycle tested end-to-end
- Full order lifecycle tested end-to-end
- Mobile end-to-end proof
- Payment reconciliation verified
- Role separation proven
- Code coverage > 60%

### D. Dependencies
Phase 4 complete.

### E. Risks if skipped
Bugs in production. Customer data at risk. Payment discrepancies.

### F. Exit criteria
- All QA streams pass (see Section 12)
- Code coverage > 60%
- Zero P0/P1 open issues
- Successful real-money test transaction
- Studio self-setup completed by non-developer tester

---

# SECTION 5 — INITIATIVE MAP

## 5.1 Initiative: Activate Revenue Model

**Objective:** Make the platform earn money from every transaction.

**Problems solved:** 0% commission (P0), no business model, no revenue validation.

**Business impact:** Direct revenue generation. Proves unit economics.

**User impact:** Minimal — commission is deducted from studio payout, transparent to end customer.

**Technical impact:** Single constant change + optional admin UI for commission rules.

**Priority:** P0 | **Effort:** Low | **Dependencies:** None

**Definition of done:** Commission > 0% on all new Stripe checkout sessions. Admin can configure rate. Revenue visible in finance dashboard.

---

## 5.2 Initiative: Fix Broken and Dangerous Features

**Objective:** No visible feature should be broken. No API should leak private data.

**Problems solved:** Membership 503, reviews email leak, stock-fail no refund, gift cards middleware.

**Business impact:** Customer trust. Legal compliance. Operational integrity.

**User impact:** Memberships either work or are invisible. Reviews don't expose emails. Failed orders get refunded.

**Technical impact:** 4-6 targeted fixes across specific files.

**Priority:** P0 | **Effort:** Medium | **Dependencies:** None

**Definition of done:** Membership purchase works OR membership UI completely hidden. Reviews return `author.name`. Stock failure triggers auto-refund. Gift cards accessible to logged-out users.

---

## 5.3 Initiative: GDPR and Legal Compliance

**Objective:** Meet EU regulatory requirements for data protection.

**Problems solved:** No data export, no deletion mechanism, no cookie consent, email exposure.

**Business impact:** Removes legal blocker for EU market. Reduces acquisition liability.

**User impact:** Customers can request their data. Cookie consent visible.

**Technical impact:** New API endpoints for data export/deletion. Cookie consent UI component.

**Priority:** P0 | **Effort:** High | **Dependencies:** None

**Definition of done:** `GET /api/me/data-export` returns all user data as JSON. `DELETE /api/me/data-deletion` anonymizes user. Cookie consent banner on first visit. Privacy page updated.

---

## 5.4 Initiative: CI and Testing Hardening

**Objective:** Prevent regressions from reaching production.

**Problems solved:** CI skips tests, no coverage, silent regressions.

**Business impact:** Product stability. Developer confidence.

**User impact:** Fewer bugs in production.

**Technical impact:** CI pipeline change + coverage configuration.

**Priority:** P0 | **Effort:** Low | **Dependencies:** None

**Definition of done:** `ci.yml` runs `npm test`. Vitest coverage configured. Coverage reported on PRs.

---

## 5.5 Initiative: Studio Dashboard Usability Overhaul

**Objective:** Transform the 32-item sidebar into a focused, intuitive workspace.

**Problems solved:** Navigation density, cognitive overload, settings fragmentation.

**Business impact:** Reduced support burden. Higher studio retention. Faster onboarding-to-productivity.

**User impact:** Studio owners find features in < 3 clicks. Dashboard feels manageable.

**Technical impact:** Refactor `lib/studio-panel-nav.ts`. Consolidate settings pages.

**Priority:** P1 | **Effort:** High | **Dependencies:** None

**Definition of done:** Sidebar has < 8 top-level groups. Each group collapses to show sub-items. Settings consolidated to single page. Quick-action cards on dashboard home.

---

## 5.6 Initiative: Centralize Studio Authorization

**Objective:** Adopt the existing `requireStudioOwner` helper across all studio API routes.

**Problems solved:** Scattered auth checks, risk of missed authorization on new routes, code duplication.

**Business impact:** Security posture. Maintenance efficiency.

**User impact:** None visible — same behavior, centralized enforcement.

**Technical impact:** Refactor ~95 studio API routes to use `lib/studio-api-auth.ts`.

**Priority:** P1 | **Effort:** High | **Dependencies:** None

**Definition of done:** Every `app/api/studios/[studioId]/*` route uses `requireStudioOwner()`. Zero inline `ownerUserId === user.id` checks remain.

---

## 5.7 Initiative: Split God Files

**Objective:** Break large files into maintainable modules.

**Problems solved:** `studio-shop-client.tsx` (1,213 lines), `guided-app.tsx` (977 lines), `webhooks/stripe/route.ts` (838 lines), `checkout/route.ts` (561 lines).

**Business impact:** Faster development. Fewer merge conflicts. Easier code review.

**User impact:** None visible.

**Technical impact:** Extract sub-components and handler functions into separate files.

**Priority:** P1 | **Effort:** Medium | **Dependencies:** None

**Definition of done:** No source file exceeds 400 lines. Extracted modules have clear single responsibilities.

---

## 5.8 Initiative: Booking Engine — Instructor Assignment

**Objective:** Wire instructor selection into the booking creation flow.

**Problems solved:** Instructor field exists in schema but never populated. Studios can't track who teaches what.

**Business impact:** Studios with multiple teachers can use the platform properly.

**User impact:** Customers see who's teaching their class. Studios see instructor schedules.

**Technical impact:** Add `instructorId` to booking creation in checkout and pay-at-studio routes. Add instructor selector to booking form.

**Priority:** P1 | **Effort:** Medium | **Dependencies:** None

**Definition of done:** Bookings created with `instructorId` when experience has linked instructors. Instructor visible on booking confirmation. Studio dashboard shows per-instructor schedule view.

---

## 5.9 Initiative: Product Variants for Marketplace

**Objective:** Allow studio products to have variants (color, size, glaze, etc.).

**Problems solved:** Single SKU per product. Studios need separate listings for each variant.

**Business impact:** Studios can sell varied products properly. Higher average order value.

**User impact:** Customers select variant before adding to cart.

**Technical impact:** New `ProductVariant` model. Cart and checkout updated to reference variant. Stock per variant.

**Priority:** P1 | **Effort:** High | **Dependencies:** Schema migration

**Definition of done:** Products have optional variants with independent stock and optional price override. Cart stores variant selection. Checkout creates order items with variant reference.

---

## 5.10 Initiative: Membership System Completion

**Objective:** Make membership purchase and redemption work end-to-end.

**Problems solved:** Membership purchase returns 503. `membershipPurchaseId` never set on bookings.

**Business impact:** New revenue stream for studios. Customer retention through membership lock-in.

**User impact:** Customers can buy memberships and use them to book included classes.

**Technical impact:** Complete purchase flow (Stripe checkout for membership). Wire `membershipPurchaseId` into booking creation. Validate membership eligibility.

**Priority:** P2 | **Effort:** High | **Dependencies:** Phase 1 (visible feature must work before being shown)

**Definition of done:** Customer purchases membership via Stripe. Membership credits apply at booking checkout. Studio dashboard shows active memberships. Customer sees membership status in account.

---

## 5.11 Initiative: On-Site Checkout Summary

**Objective:** Show order summary before redirecting to Stripe.

**Problems solved:** No review step between cart and Stripe redirect. Trust gap.

**User impact:** Customers see exactly what they're paying for, including booking details, product quantities, shipping, and discounts applied.

**Priority:** P1 | **Effort:** Medium | **Dependencies:** None

**Definition of done:** Checkout page shows line items, totals, applied coupons/gift cards, shipping, and cancellation policy before "Pay with Stripe" button.

---

## 5.12 Initiative: Redis Rate Limiting

**Objective:** Replace in-memory rate limiting with Redis-backed distributed rate limiting.

**Problems solved:** Rate limits reset on deploy, don't work multi-instance.

**Priority:** P1 | **Effort:** Medium | **Dependencies:** Redis infrastructure

**Definition of done:** `lib/rate-limit.ts` uses Redis (Upstash or similar). Rate limits survive deploys and work across instances.

---

# SECTION 6 — MASTER TASK LIST

## Initiative 5.1: Activate Revenue Model

| Task ID | Title | Action | Priority | Dependency | Acceptance Criteria |
|---------|-------|--------|----------|------------|---------------------|
| REV-01 | Set platform commission to target rate | Change `DEFAULT_PLATFORM_COMMISSION_BPS` in `lib/commission-defaults.ts` from 0 to target (e.g., 500 = 5%) | P0 | None | All new checkout sessions include `application_fee_amount` > 0 |
| REV-02 | Add admin UI for commission configuration | Create admin route/page to set global and per-studio commission rates | P2 | REV-01 | Admin can view and change commission rate. Per-studio overrides work. |
| REV-03 | Add commission visibility to studio dashboard | Show platform fee in studio's payment/revenue views | P2 | REV-01 | Studios see commission deducted on each transaction |

## Initiative 5.2: Fix Broken and Dangerous Features

| Task ID | Title | Action | Priority | Dependency | Acceptance Criteria |
|---------|-------|--------|----------|------------|---------------------|
| FIX-01 | Fix reviews email leak | In `app/api/studios/[studioId]/reviews/route.ts`, change `author: { select: { email: true } }` to `author: { select: { name: true } }` | P0 | None | Reviews API returns author name, not email |
| FIX-02 | Hide membership UI until purchase works | Remove membership nav items and pages from customer-facing routes until purchase flow is complete | P0 | None | No customer sees "memberships" as a purchasable option |
| FIX-03 | Add auto-refund on stock decrement failure | In `lib/orders/checkout-completion.ts`, when stock `updateMany` returns 0 affected rows, call `stripeRefundForBooking` or equivalent before marking order cancelled | P0 | None | Stock failure after payment triggers automatic Stripe refund |
| FIX-04 | Fix gift cards middleware for logged-out users | Add `/gift-cards` to `LOGIN_REQUIRED` exemption or public allowlist in `middleware.ts` | P0 | None | Logged-out users can access gift cards pages |
| FIX-05 | Verify `.env.local` is in `.gitignore` | Ensure `.env.local` with credentials is never committed | P0 | None | `.gitignore` includes `.env.local` |

## Initiative 5.3: GDPR and Legal Compliance

| Task ID | Title | Action | Priority | Dependency | Acceptance Criteria |
|---------|-------|--------|----------|------------|---------------------|
| GDPR-01 | Build data export API | Create `GET /api/me/data-export` that returns all user data (bookings, orders, reviews, profile) as JSON | P0 | None | Authenticated user gets complete data export |
| GDPR-02 | Build data deletion API | Create `DELETE /api/me/data-deletion` that anonymizes user data (name, email, phone -> anonymized, closes active sessions) | P0 | None | User data anonymized. Account becomes inaccessible. |
| GDPR-03 | Add cookie consent banner | Create client component that shows on first visit, stores consent in cookie, gates analytics/tracking scripts | P0 | None | Banner appears. Consent stored. Analytics only fire after consent. |
| GDPR-04 | Add data export link to account page | Add "Download my data" and "Delete my account" buttons to `/account` page | P1 | GDPR-01, GDPR-02 | Buttons visible. Actions trigger APIs with confirmation. |

## Initiative 5.4: CI and Testing Hardening

| Task ID | Title | Action | Priority | Dependency | Acceptance Criteria |
|---------|-------|--------|----------|------------|---------------------|
| CI-01 | Add Vitest to CI pipeline | Add `npm test` step to `.github/workflows/ci.yml` after build step | P0 | None | CI fails if any Vitest test fails |
| CI-02 | Configure Vitest coverage | Add `coverage` block to `vitest.config.ts` with `v8` provider and threshold | P2 | CI-01 | Coverage report generated on every test run |
| CI-03 | Add coverage gate to CI | Fail CI if coverage drops below threshold (e.g., 50%) | P2 | CI-02 | PRs that reduce coverage are blocked |

## Initiative 5.5: Studio Dashboard Usability Overhaul

| Task ID | Title | Action | Priority | Dependency | Acceptance Criteria |
|---------|-------|--------|----------|------------|---------------------|
| DASH-01 | Redesign sidebar navigation structure | Refactor `lib/studio-panel-nav.ts` to group 32 items into < 8 collapsible categories: Operations, Classes, Commerce, Marketing, Content, Settings, Tools, Reports | P1 | None | Sidebar has 8 top-level groups. Sub-items collapse/expand. |
| DASH-02 | Add quick-action cards to dashboard home | Add "Today's bookings", "Pending orders", "New reviews" cards with action buttons to `dashboard/[studioId]/page.tsx` | P2 | DASH-01 | Dashboard home shows actionable summary cards |
| DASH-03 | Consolidate settings into single page | Merge settings from settings page, appearance page, studio profile page, and payments page into tabbed single settings experience | P2 | DASH-01 | One "Settings" entry point with tabs for Profile, Appearance, Payments, Policies, Integrations |

## Initiative 5.6: Centralize Studio Authorization

| Task ID | Title | Action | Priority | Dependency | Acceptance Criteria |
|---------|-------|--------|----------|------------|---------------------|
| AUTH-01 | Adopt `requireStudioOwner` in all studio CRUD routes | Replace inline `ownerUserId === user.id` checks with `requireStudioOwner()` from `lib/studio-api-auth.ts` across all `app/api/studios/[studioId]/**` routes | P1 | None | Zero inline owner checks remain. All routes use shared helper. |
| AUTH-02 | Adopt `apiError`/`apiSuccess` in new routes | Use `lib/api-response.ts` helpers for consistent error/success formatting in all newly created or modified routes | P2 | None | New routes use standardized response helpers |

## Initiative 5.7: Split God Files

| Task ID | Title | Action | Priority | Dependency | Acceptance Criteria |
|---------|-------|--------|----------|------------|---------------------|
| SPLIT-01 | Split `studio-shop-client.tsx` (1,213 lines) | Extract product management, order management, and fulfillment into separate components | P1 | None | Original file < 400 lines. Extracted components in `components/dashboard/shop/` |
| SPLIT-02 | Split `guided-app.tsx` (977 lines) | Extract each flow (studio, sell, class, paid) into separate step components | P1 | None | Original file < 400 lines. Flow components in `components/guided/flows/` |
| SPLIT-03 | Split `webhooks/stripe/route.ts` (838 lines) | Extract handler functions per event type into `lib/webhooks/` modules | P1 | None | Route file < 200 lines. Each event handler in its own module. |
| SPLIT-04 | Split `checkout/route.ts` (561 lines) | Extract line-building, validation, and Stripe session creation into helper functions | P2 | None | Route file < 300 lines. Helpers in `lib/checkout/` |

## Initiative 5.8: Booking Engine — Instructor Assignment

| Task ID | Title | Action | Priority | Dependency | Acceptance Criteria |
|---------|-------|--------|----------|------------|---------------------|
| INST-01 | Add instructor selection to booking form | In `classes/[experienceId]/booking-form.tsx`, fetch linked instructors for the experience and show selector when multiple exist | P1 | None | Customer sees instructor options when available |
| INST-02 | Pass `instructorId` in booking creation | Add `instructorId` to `booking.create` calls in `bookings/checkout/route.ts`, `checkout/route.ts`, and `pay-at-studio/route.ts` | P1 | INST-01 | Bookings store assigned instructor |
| INST-03 | Show instructor on booking confirmation | Display instructor name on checkout success page and in confirmation email | P2 | INST-02 | Customer sees who's teaching their class |
| INST-04 | Add per-instructor schedule view to dashboard | Create studio dashboard view showing bookings grouped by instructor | P2 | INST-02 | Studio owner sees each instructor's schedule |

## Initiative 5.9: Product Variants

| Task ID | Title | Action | Priority | Dependency | Acceptance Criteria |
|---------|-------|--------|----------|------------|---------------------|
| VAR-01 | Create ProductVariant model | Add `ProductVariant` to Prisma schema with: `productId`, `name`, `sku`, `priceCents` (optional override), `stockQuantity`, `sortOrder` | P1 | None | Migration applied. Model exists. |
| VAR-02 | Add variant management to studio product API | Extend `studios/[studioId]/products/[productId]` to support CRUD on variants | P1 | VAR-01 | Studio can create/edit/delete variants |
| VAR-03 | Add variant selection to product pages | Show variant selector on marketplace PDP and studio shop page. Cart stores `variantId`. | P1 | VAR-01 | Customer selects variant before adding to cart |
| VAR-04 | Update checkout to handle variants | `buildCheckoutLineRowsFromCart` respects variant price override and stock | P1 | VAR-01, VAR-03 | Checkout uses variant-specific price and stock |

## Initiative 5.11: On-Site Checkout Summary

| Task ID | Title | Action | Priority | Dependency | Acceptance Criteria |
|---------|-------|--------|----------|------------|---------------------|
| CHK-01 | Create checkout summary page | Add `app/checkout/page.tsx` that loads cart, displays line items, totals, shipping, discounts, cancellation policies, and "Pay with Stripe" CTA | P1 | None | Customer reviews order before Stripe redirect |
| CHK-02 | Route cart CTA to checkout summary | Change cart "Checkout" button to navigate to `/checkout` instead of directly calling `/api/checkout` | P1 | CHK-01 | Flow: cart -> summary -> Stripe |

---

# SECTION 7 — KILL LIST

## 7.1 Must Be Removed

1. **Wear store as a separate cart/checkout** — confuses the product. If wear products are kept, merge them into the main cart or remove entirely.
2. **`/marketplace` route** — the product is studio-focused, not a marketplace. Studios have their own pages. Kill marketplace positioning.
3. **`Experiment` model and UI** — adds schema complexity with no user value. Remove.
4. **`PricingScenario` model** — unused complexity. Remove.
5. **`EarlyAccessSignup` model and route** — already returns 410. Remove.
6. **Dead code: `lib/european-preregistration.ts`** — confirmed zero imports. Delete.

## 7.2 Must Be Simplified

1. **Studio sidebar: 32 items -> 8 groups** — collapse into Operations, Classes, Commerce, Marketing, Content, Settings, Tools, Reports
2. **Two cart systems -> one** — wear and marketplace carts should be unified or wear removed
3. **Settings fragmentation -> single tabbed page** — consolidate settings, appearance, payments, policies
4. **Notification template system** — powerful but overly complex for most studios. Default templates with optional customization.

## 7.3 Must Be Merged

1. **"Classes" + "Schedule" + "Calendar"** in sidebar -> single "Classes & Schedule" section
2. **"Catalog" + "Promotions"** -> single "Shop & Promotions" section
3. **"Payments & payouts" + "Tax report"** -> single "Finance" section
4. **Settings page + Appearance page + Studio profile** -> single "Studio Settings" with tabs

## 7.4 Must Be Renamed

1. **"Catalog"** -> **"Shop"** (studios don't think in "catalogs")
2. **"Participants"** -> **"Students"** or **"Customers"** (pottery studios call them students)
3. **"Experiences"** (internal) -> **"Classes"** (user-facing, what studios actually say)
4. **"Book soon reminders"** -> **"Follow-up emails"**
5. **"Booking questions"** -> **"Intake forms"** (clearer purpose)
6. **"Packs & add-ons"** -> **"Class add-ons"**
7. **"Production"** -> **"Kiln management"**

## 7.5 Must Be Postponed

1. **AI Advisor** — nice-to-have, not core. Gate behind feature flag, deprioritize.
2. **Insight purchasing system** — over-engineered for current stage. Postpone.
3. **Custom domain full-site routing** — meaningful but complex. Ship core first.
4. **White-label architecture** — requires major investment. Defer unless white-label is the strategy.
5. **Offering subscriptions (recurring product/experience billing)** — complex, separate from core booking.
6. **Spreadconnect/Printful integration** — secondary to core value prop.
7. **Multi-language/i18n** — only English + Greek scaffolded. Ship English-first.
8. **Referral system** — model exists but flow incomplete. Postpone.

---

# SECTION 8 — WORLD-CLASS STANDARD BY ENVIRONMENT

## 8.1 Hyperadmin

**Excellence:** Every studio, transaction, and customer action visible in real-time. Commission clearly tracked. Studio health scoring. Proactive alerts for failing payments, churning studios, compliance issues.

**Unacceptable:** Can't see why a studio is struggling. Can't intervene on a stuck payment. No bulk operations.

**Minimum acceptable:** Studio list with status, revenue per studio, user management, commission configuration, audit trail.

**Premium:** Predictive churn alerts, automated compliance checks, one-click studio support intervention, financial reconciliation dashboard.

## 8.2 Studio Admin

**Excellence:** Studio owner opens dashboard, sees today's classes with check-in buttons, pending orders to fulfill, recent reviews, and revenue. Can complete any task in < 3 clicks. Classes auto-generate future slots. Products support variants. Memberships sell. Emails use studio branding.

**Unacceptable:** 32-item sidebar. Broken membership. Manual slot generation with no reminder. Settings scattered across 4 pages.

**Minimum acceptable:** < 15 nav items grouped logically. All visible features work. Guided setup covers first-day tasks. Instructor assignment works.

**Premium:** Smart scheduling suggestions, automated follow-ups, revenue optimization insights, customer CRM with booking history.

## 8.3 End Customer

**Excellence:** Find a pottery class in < 30 seconds. Book with deposit in < 5 taps on mobile. See instructor, cancellation policy, and what to bring before paying. Get QR ticket + calendar invite instantly. Buy pottery from the studio shop with variant selection. Trust every step.

**Unacceptable:** See memberships that can't be purchased. Get "processing" with no explanation. Two different carts for different products. No order summary before payment.

**Minimum acceptable:** Single booking flow that works on mobile. Clear pricing and policies. Confirmation with all details. Functional product shopping.

**Premium:** Personalized class recommendations, seamless rebook flow, integrated review prompts, gift card gifting experience.

---

# SECTION 9 — UX / UI / COPY CORRECTION PROGRAM

## 9.1 Navigation and Information Architecture
- **Problem:** 32 sidebar items with flat hierarchy
- **Correction:** Group into 8 collapsible categories. Most-used items (Today, Classes, Shop, Bookings) at top.
- **Task:** DASH-01

## 9.2 Naming and Terminology
- **Problem:** Internal jargon ("Experiences", "Catalog", "Participants", "Packs & add-ons") doesn't match how studios talk
- **Correction:** Rename to studio vocabulary (Classes, Shop, Students, Class add-ons)
- **Task:** Rename labels in `lib/studio-panel-nav.ts` and all referencing UI

## 9.3 Form Design and Usability
- **Problem:** Class creation is a single large form, not a guided flow
- **Correction:** Break into steps: basics -> schedule -> pricing -> add-ons -> publish
- **Task:** Rebuild class creation as multi-step wizard

## 9.4 Mobile Interaction Design
- **Problem:** Dense dashboard in hamburger. No mobile quick-actions.
- **Correction:** Mobile dashboard shows quick-action cards (check-in, orders, schedule). Sidebar becomes bottom-tab navigation on mobile.
- **Task:** Create mobile-specific dashboard layout

## 9.5 Visual Hierarchy and Layout Discipline
- **Problem:** Pages are functional but flat. No clear visual hierarchy between primary and secondary actions.
- **Correction:** Define primary/secondary/tertiary action styling system. Apply consistently.
- **Task:** Create and apply action-hierarchy design tokens

## 9.6 Trust-Building Content and Transparency
- **Problem:** No cancellation policy shown before payment. No studio trust signals (verified badge, review count, years active).
- **Correction:** Show policy block on booking page. Add trust badges to studio pages.
- **Task:** Add cancellation policy display to booking form. Add studio trust indicators.

## 9.7 Empty States, Errors, Confirmations, and Recovery Paths
- **Problem:** Uneven loading states. "Processing" on success page is confusing.
- **Correction:** Every route has loading.tsx. Success page handles webhook delay gracefully with polling or clear messaging.
- **Task:** Add loading.tsx to all route segments. Improve success page webhook-delay handling.

## 9.8 Conversion Copy and CTA Clarity
- **Problem:** CTAs are generic ("Submit", "Checkout"). No urgency or clarity signals.
- **Correction:** CTAs should be specific: "Book Your Spot", "Pay Deposit", "Complete Purchase", "Join Waitlist"
- **Task:** Audit and replace all generic CTAs with specific, action-oriented copy

## 9.9 Premium Aesthetic Uplift
- **Problem:** Product looks "developer-built", not "design-led"
- **Correction:** Refine typography scale, increase whitespace, add subtle animations, improve image presentation
- **Task:** Design system polish pass across all customer-facing pages

## 9.10 Consistency Rules
- **Problem:** Error formats inconsistent across routes. Loading patterns vary.
- **Correction:** Adopt `apiError`/`apiSuccess` from `lib/api-response.ts`. Standardize loading patterns.
- **Task:** AUTH-02 + global loading pattern enforcement

---

# SECTION 10 — FUNCTIONAL HARDENING PROGRAM

## 10.1 Booking Logic Hardening
- **Weakness:** Instructor not assigned. Membership not redeemable. Slots manual.
- **Corrections:** INST-01/02, membership wiring, auto-slot cron
- **Validation:** E2E test: book class with instructor, use membership credit, verify auto-generated slot

## 10.2 Commerce Logic Hardening
- **Weakness:** No variants. Stock failure gap.
- **Corrections:** VAR-01-04, FIX-03
- **Validation:** E2E test: add variant product to cart, checkout, verify stock decrement. Test stock failure triggers refund.

## 10.3 Payment and Billing Hardening
- **Weakness:** 0% commission. Booking refund caps to DB amount.
- **Corrections:** REV-01, fix refund to use Stripe's refundable balance
- **Validation:** Stripe dashboard shows application fees. Refund test after partial refund.

## 10.4 Role and Permission Hardening
- **Weakness:** Scattered auth checks. Unused centralized helper.
- **Corrections:** AUTH-01
- **Validation:** Automated test: attempt studio B operations as studio A owner -> 403/404.

## 10.5 Multi-Tenant Hardening
- **Weakness:** Route-level isolation, not middleware-level.
- **Corrections:** AUTH-01 (centralized helper is the practical approach)
- **Validation:** Contract test per studio route: wrong owner gets rejected.

## 10.6 Notification and Communication Hardening
- **Weakness:** No pickup email. Emails platform-branded.
- **Corrections:** Add pickup email. Refactor email shell to use studio logo when available.
- **Validation:** Order status -> ready_for_pickup triggers customer email with studio branding.

## 10.7 Reporting and Operational Visibility Hardening
- **Weakness:** No export. No CLV. No churn analytics.
- **Corrections:** Add CSV export to studio reports. Add basic CLV to admin.
- **Validation:** Studio can download booking/revenue CSV. Admin sees CLV metrics.

## 10.8 Onboarding and Configuration Hardening
- **Weakness:** Post-guided-setup navigation cliff.
- **Corrections:** Add onboarding checklist that persists after guided setup.
- **Validation:** New studio sees "complete your setup" checklist until all sections configured.

## 10.9 Edge-Case Handling
- **Weakness:** Capacity race window, expired session handling, concurrent coupon redemption.
- **Corrections:** Improve success page polling for pending webhooks. Document race-window behavior.
- **Validation:** Simulate concurrent last-seat booking. Verify loser gets refund + clear messaging.

## 10.10 Failure-State Resilience
- **Weakness:** Stripe webhook delays leave "processing" state. Stock failure with no refund.
- **Corrections:** FIX-03. Success page polls order status with 5-second intervals. Clear "payment received, confirming your booking" messaging.
- **Validation:** Simulate delayed webhook. Verify customer sees progressively updated status.

---

# SECTION 11 — TECHNICAL EXECUTION PLAN

## 11.1 Architecture Cleanup Priorities
1. Adopt `requireStudioOwner` across all studio routes
2. Adopt `apiError`/`apiSuccess` in new/modified routes
3. Extract webhook handlers into `lib/webhooks/` modules
4. Extract checkout logic into `lib/checkout/` helpers

## 11.2 Refactor Targets
1. `studio-shop-client.tsx` -> 3-4 focused components
2. `guided-app.tsx` -> flow-specific step components
3. `webhooks/stripe/route.ts` -> event handler modules
4. `checkout/route.ts` -> validation + session creation helpers

## 11.3 Data-Model Issues to Fix
1. Add `ProductVariant` model
2. Add missing indexes on `Booking.experienceId`, `Booking.slotId`, `CartItem.classPackagePurchaseId`
3. Consider removing unused models: `Experiment`, `PricingScenario`, `EarlyAccessSignup`

## 11.4 API / Service Boundary Issues
1. Standardize error response format via `apiError`
2. Centralize studio auth via `requireStudioOwner`
3. Extract shared booking creation logic (used in 3 routes) into a single function

## 11.5 Frontend Structural Issues
1. No global client state library — acceptable for now (useState + server state)
2. Large client components need decomposition
3. Loading states inconsistent — add `loading.tsx` to all route segments

## 11.6 Backend Logic Risks
1. Booking refund uses DB payment amount, not Stripe refundable balance — fix to query Stripe
2. Stock decrement failure has no auto-refund — add Stripe refund call
3. Webhook dedup has edge case where second worker may claim same event — add retry-safe check

## 11.7 Testing Gaps
1. **Zero component tests** — add at minimum for booking form and cart
2. **CI doesn't run Vitest** — fix immediately
3. **No coverage tooling** — add v8 provider
4. **E2E tests are mostly smoke** — add happy-path lifecycle tests for booking and order

## 11.8 Release Risk Areas
1. Schema migrations with new models (ProductVariant) — test rollback
2. Commission activation — verify correct Stripe session parameters in staging
3. Auth changes — any middleware change risks breaking all authentication

## 11.9 Observability / Monitoring Needs
1. Sentry is in dependencies (`@sentry/nextjs`) — verify it's configured
2. Add structured logging for payment events
3. Add webhook processing latency monitoring
4. Add commission tracking dashboard

## 11.10 Performance / Scale Risks
1. In-memory rate limits — migrate to Redis
2. No CDN for uploaded images — Cloudinary serves this role but verify caching
3. `schema.prisma` at 3,177 lines — consider splitting into multiple schema files (Prisma 6 supports this)
4. 117 models may cause slow Prisma generation — monitor build times

---

# SECTION 12 — QA AND CERTIFICATION PLAN

## 12.1 Pre-QA Conditions
- All P0 fixes deployed
- CI runs Vitest
- Coverage configured
- Test database seeded with realistic data

## 12.2 QA Test Streams

**Booking QA:** Full lifecycle — create class, generate slots, book as customer (deposit + full payment), confirm, check-in, complete, review request. Cancel with refund. Reschedule. Waitlist join + notification.

**Commerce QA:** Create product with variants, add to cart, checkout, fulfill, ship, deliver. Stock failure refund. Coupon application. Gift card purchase and redemption.

**Mobile QA:** Complete booking on mobile (iPhone + Android Chrome). Complete purchase on mobile. Navigate studio dashboard on mobile. Verify no broken layouts, overlapping elements, or unreachable buttons.

**Studio Admin QA:** Full onboarding. Class creation. Product creation with variants. Order fulfillment. Analytics review. Settings configuration. Instructor management.

**Hyperadmin QA:** Studio approval. User management. Commission configuration. Finance dashboard. Impersonation. Audit log.

**Trust / Copy / Legal QA:** Cancellation policy visible before payment. Privacy page matches actual data handling. Cookie consent functional. GDPR export/deletion works.

**Payment QA:** Stripe Connect onboarding. Commission deducted correctly. Refund (full and partial). Gift card balance deducted. Coupon capacity limit respected. Webhook deduplication.

**Permissions / Security QA:** Studio A can't access Studio B data. Customer can't access admin. Vendor can't access hyper_admin features. CSRF protection works.

**Edge-case QA:** Concurrent last-seat booking. Expired checkout session. Double webhook delivery. Stock failure after payment. Coupon race condition.

## 12.3 Release Blockers
- Any P0 issue open
- Vitest failures
- Payment lifecycle incomplete
- Booking lifecycle incomplete
- GDPR mechanisms not functional
- Commission not active

## 12.4 Proof of Readiness
- [ ] Complete booking lifecycle (create -> book -> pay -> confirm -> attend -> review) passes
- [ ] Complete order lifecycle (create product -> add to cart -> checkout -> fulfill -> ship) passes
- [ ] Mobile booking end-to-end on real device passes
- [ ] No dead-end routes (every page loads without error)
- [ ] Correct role separation (studio A / studio B isolation) proven
- [ ] Cancellation policy matches refund behavior
- [ ] Payment reconciliation: Stripe dashboard matches DB
- [ ] Studio self-setup by non-developer completes in < 60 minutes

## 12.5 Final Certification Standard
"100% ready" means: every visible feature works, every payment is correct, every role is enforced, every policy is honored, every email is sent, every mobile flow completes, and a non-technical studio owner can set up and operate without support intervention.

---

# SECTION 13 — EXECUTION SEQUENCING TABLE

| Seq | Initiative | Task Cluster | Why Now | Dependency | Risk if Delayed | Impact |
|-----|-----------|-------------|---------|------------|----------------|--------|
| 1 | Revenue Model | REV-01 | No business without revenue | None | Platform stays at $0 | Commission on all transactions |
| 2 | Fix Dangerous Features | FIX-01 to FIX-05 | Legal + trust exposure | None | GDPR violation, customer distrust | Safe, trustworthy product |
| 3 | GDPR Compliance | GDPR-01 to GDPR-04 | EU legal requirement | None | Regulatory fines | Legal market access |
| 4 | CI Hardening | CI-01 to CI-03 | Regressions compound | None | Bugs ship silently | Stable releases |
| 5 | Dashboard Usability | DASH-01 to DASH-03 | Studios can't navigate | None | Studio churn | Reduced support, higher retention |
| 6 | Centralize Auth | AUTH-01 | Security process risk | None | Missed auth check on new route | Consistent security posture |
| 7 | Split God Files | SPLIT-01 to SPLIT-04 | Dev velocity blocked | None | Slow development, merge conflicts | Faster iteration |
| 8 | Checkout Summary | CHK-01, CHK-02 | Conversion trust gap | None | Abandoned checkouts | Higher conversion |
| 9 | Instructor Assignment | INST-01 to INST-04 | Core operational gap | None | Studios with teachers can't use properly | Full booking functionality |
| 10 | Product Variants | VAR-01 to VAR-04 | Commerce is crippled | Schema migration | Studios can't sell varied products | Functional commerce |
| 11 | Redis Rate Limiting | Rate limit migration | Scale blocker | Redis infra | Limits fail multi-instance | Production-grade security |
| 12 | Membership Completion | Full membership flow | Revenue stream blocked | Phase 1 complete | Missed recurring revenue | New monetization |
| 13 | Email Branding | Studio-branded emails | Trust gap | None | Emails feel generic | Premium studio experience |
| 14 | Premium Polish | Loading states, CTAs, design | Product feels startup-grade | Phase 3 complete | Product doesn't feel premium | World-class perception |
| 15 | QA Certification | Full test pass | Must prove readiness | Phase 4 complete | Ship with unknown bugs | Launch confidence |

---

# SECTION 14 — 30 / 60 / 90 DAY EXECUTION

## First 30 Days

**Key wins:**
- Platform earning commission
- All broken features fixed or hidden
- GDPR basics in place
- CI running tests
- Dashboard reorganized
- God files split
- Studio auth centralized

**Non-negotiables:**
- REV-01 (commission)
- FIX-01 to FIX-05 (dangerous fixes)
- GDPR-01 to GDPR-03 (legal compliance)
- CI-01 (tests in CI)
- DASH-01 (sidebar reorganization)

**Risks:**
- Dashboard reorganization touches many files — risk of introducing navigation regressions
- GDPR implementation may reveal additional data handling issues

## Days 31-60

**Key wins:**
- Instructors assigned in bookings
- Product variants working
- Checkout summary page live
- Redis rate limiting deployed
- Email branding improved
- Membership purchase working

**Non-negotiables:**
- INST-01 to INST-02 (instructor in bookings)
- VAR-01 to VAR-04 (product variants)
- CHK-01 to CHK-02 (checkout summary)
- Rate limit migration

**Risks:**
- Product variant schema migration is a significant change — requires careful testing
- Membership completion is complex — may need to extend timeline

## Days 61-90

**Key wins:**
- Premium visual polish
- Accessibility improvements
- Help center live
- Full QA certification
- Launch-ready product

**Non-negotiables:**
- Loading states on all routes
- Accessibility pass
- Full QA certification (Section 12)
- Real-money test transaction

**Risks:**
- QA may reveal issues requiring Phase 2/3 rework
- Timeline pressure may compromise polish quality

---

# SECTION 15 — FOUNDER / OPERATOR DECISION PANEL

**1. What should be fixed first no matter what?**
Commission activation (REV-01) and reviews email leak (FIX-01). One gives you a business model, the other fixes a privacy violation.

**2. What should be cut without regret?**
The wear store as a separate cart system. The Experiment model. The PricingScenario model. The marketplace positioning. EarlyAccessSignup.

**3. What is the biggest product illusion exposed by the audit?**
White-label readiness. The product claims or implies multi-tenant independence, but "PotteryMania" is hardcoded in 50+ locations, custom domains only work for landing pages, and emails use platform branding exclusively.

**4. What is the biggest hidden opportunity exposed by the audit?**
The booking engine is genuinely best-in-class for the ceramics vertical. No competitor combines capacity locking, deposits, cancellation policies, packages, waitlists, and add-ons in a pottery-specific context. This is the moat — double down on it.

**5. What would make the product feel premium fastest?**
Studio-branded emails (replace PotteryMania wordmark with studio logo) + on-site checkout summary + polished loading states. These three changes shift perception from "startup tool" to "professional platform."

**6. What would make the product safer fastest?**
Reviews email fix (5 minutes), CI running tests (15 minutes), stock-failure auto-refund (1 hour), GDPR data export (1 day).

**7. What would increase conversion fastest?**
On-site checkout summary before Stripe redirect. Customers currently go from cart to Stripe with no review step — adding one reduces abandonment.

**8. What would reduce support burden fastest?**
Dashboard reorganization (32 items -> 8 groups). Most support questions stem from "I can't find X" — reducing navigation complexity directly reduces tickets.

**9. What would make studios trust the platform more?**
Working membership purchase, studio-branded emails, visible cancellation policies before payment, and instructor assignment in bookings. These signal operational maturity.

**10. What would make end customers trust the platform more?**
Checkout summary showing exactly what they're paying for, clear cancellation policy display, and professional-looking confirmation with QR ticket and calendar invite.

---

# SECTION 16 — FINAL COMMAND MODE OUTPUT

## A. Immediate Action List (Do Today)

1. Change `DEFAULT_PLATFORM_COMMISSION_BPS` from 0 to target rate
2. Fix `author: { select: { email: true } }` to `author: { select: { name: true } }` in studio reviews API
3. Hide membership from customer-facing navigation until purchase works
4. Add `npm test` step to `.github/workflows/ci.yml`
5. Verify `.env.local` is in `.gitignore`
6. Add `/gift-cards` to public paths in `middleware.ts`

## B. Non-Negotiable Rebuild List (Must Happen)

1. GDPR data export and deletion APIs
2. Cookie consent banner
3. Auto-refund on stock decrement failure
4. Dashboard sidebar reorganization (32 -> 8 groups)
5. Centralize studio authorization via `requireStudioOwner`
6. Split the 4 god files
7. On-site checkout summary page
8. Product variants on marketplace products
9. Instructor assignment in booking creation
10. Redis-backed rate limiting
11. Code coverage in CI
12. Studio-branded email templates

## C. Premium-Elevation List (Pushes to Elite)

1. Multi-step class creation wizard
2. Smart scheduling (auto-generate recurring slots with 30-day lookahead)
3. Checkout upsell mechanics ("Add a pottery kit to your booking")
4. Customer lifetime value analytics
5. Studio onboarding completion checklist (persists post-guided-setup)
6. Mobile-optimized dashboard with bottom-tab navigation
7. Premium loading animations and micro-interactions
8. Help center with top-20 FAQs for studio owners
9. Studio trust badges on public pages (verified, years active, review score)
10. Personalized class recommendations for returning customers

## D. Final Transformation Verdict

**Yes — this product can become world-class through disciplined execution.**

The booking engine is the foundation. Stripe Connect is the revenue mechanism. The ceramic-vertical focus is the moat. These three elements are real and expensive to replicate.

The conditions for success:
1. **Commission must be activated immediately** — without revenue, there is no business
2. **Simplification must precede expansion** — kill the wear store complexity, hide broken features, reduce the sidebar from 32 to 8
3. **Every visible feature must work** — no broken memberships, no leaked emails, no stock-failure gaps
4. **The booking engine must be completed** — instructor assignment and membership redemption are table-stakes gaps
5. **Legal compliance is non-negotiable** — GDPR blocks the EU market entirely
6. **Premium perception requires deliberate investment** — studio-branded emails, checkout summary, and polished loading states are the fastest path to "this feels professional"

Execute this roadmap in sequence, and the product moves from 71/100 to 90+/100 in 90 days. Skip steps or expand scope prematurely, and the product stays in the "promising but incomplete" zone indefinitely.

The discipline to simplify is more important than the ambition to add.

---

# SECTION 17 — 12-WEEK EXECUTION CADENCE (OPERATING RHYTHM)

## Weekly Rhythm (Non-Negotiable)

- **Monday:** Prioritize one revenue item + one trust/safety item + one UX item
- **Tuesday-Wednesday:** Build and ship behind feature flags where needed
- **Thursday:** End-to-end QA with real booking and real checkout scenarios
- **Friday:** Metrics review + rollback decision + next-week scope lock

## Sprint 1-2 (Stabilize Fundamentals)

**Primary outcomes:**
- Confirm all `DONE` items remain stable under regression tests
- Remove dead links to hidden/incomplete experiences
- Ensure every checkout path has a clear recovery state

**Acceptance bar:**
- No broken customer-visible links in top navs, dashboards, or emails
- CI green on every merge to `main`
- No unresolved P1 bug older than 48 hours

## Sprint 3-4 (Booking and Commerce Confidence)

**Primary outcomes:**
- Instructor assignment flows verified in creation, payment, and notification
- Variant handling verified in cart, checkout, stock decrement, and refunds
- Checkout summary tested against mixed carts (booking + product)

**Acceptance bar:**
- 0 overbookings in concurrency test runs
- 0 negative stock events after successful payment
- 0 missing instructor references in booking confirmations

## Sprint 5-6 (Scale Safety and Premium Trust)

**Primary outcomes:**
- Redis-backed rate limiting live with fallback monitoring
- Branded email shell per studio deployed
- Accessibility pass on high-traffic customer pages

**Acceptance bar:**
- Rate-limited endpoints consistent across multiple app instances
- Email branding renders correctly across major clients
- No critical accessibility violations on checkout, bookings, account

---

# SECTION 18 — KPI SCORECARD (OWNER DASHBOARD)

## Revenue KPIs

1. **Commission Capture Rate**
   - Formula: `platform_fee_collected / gross_platform_volume`
   - Target: >= configured commission bps minus payment noise
2. **Gross Platform Volume (GPV)**
   - Formula: total successful order + booking value
   - Target: week-over-week growth for first 12 weeks
3. **Membership Attach Rate**
   - Formula: `membership_orders / unique_active_customers`
   - Target: upward trend after membership recovery release

## Trust & Reliability KPIs

1. **Checkout Failure Rate**
   - Formula: `failed_checkout_attempts / checkout_initiations`
   - Target: < 2.5%
2. **Webhook Processing SLA**
   - Formula: % of webhooks fully processed in < 60s
   - Target: >= 99%
3. **Refund Recovery Success**
   - Formula: `auto_refunds_successful / auto_refunds_attempted`
   - Target: >= 99%

## Product Quality KPIs

1. **P1 Defect Escape Rate**
   - Formula: P1 bugs discovered in production per release
   - Target: 0
2. **Navigation Completion Time (Studio)**
   - Formula: median time to complete top 5 operator tasks
   - Target: downtrend after dashboard regrouping
3. **Booking Completion Rate**
   - Formula: `successful_bookings / booking_starts`
   - Target: steady growth as checkout trust improves

---

# SECTION 19 — RISK REGISTER (POST-AUDIT)

| Risk ID | Risk | Trigger Signal | Mitigation | Owner |
|---------|------|----------------|------------|-------|
| R-01 | Commission logic drift | Commission KPIs mismatch expected bps | Automated fee assertion tests per checkout type | Platform engineer |
| R-02 | Membership regression | Increase in "temporarily unavailable" or failed purchases | Contract tests on membership API + purchase flow smoke tests | Product engineer |
| R-03 | Multi-instance abuse gaps | Uneven throttling between nodes | Redis limiter with synthetic abuse tests | Infra engineer |
| R-04 | Booking overcapacity edge case | Slot count goes below zero or exceeds capacity | Concurrency simulation in CI + DB lock assertions | Booking engineer |
| R-05 | Email trust degradation | Low open rates or high support complaints | Studio-branded templates + rendering QA matrix | Growth/ops |
| R-06 | Scope creep returns | New features launched before closing P1/P2 debt | Weekly scope lock with strict quality gate | Product owner |

---

# SECTION 20 — OWNER'S 14-DAY CHECKLIST (START HERE)

## Day 1-3

- Verify commission values in production configuration
- Run one real-money end-to-end transaction and one refund test
- Confirm GDPR export/deletion endpoints from a real user account
- Check that hidden/broken features are not discoverable via navigation

## Day 4-7

- Validate instructor assignment across booking creation and notifications
- Run variant purchase tests (single variant, multi-variant, low-stock edge)
- Audit top 10 transactional emails for branding and clarity
- Review CI duration and failure causes; trim flaky tests immediately

## Day 8-14

- Measure baseline KPI scorecard (Section 18)
- Record top 10 support tickets and map each to a roadmap task
- Hold one weekly release review: shipped, rolled back, deferred
- Lock the next two-week scope to reliability + conversion work only

## Definition of "Healthy Platform" at Day 14

You should be able to say "yes" to all:
1. Commission is collected on every intended transaction type
2. Every customer checkout path is understandable and recoverable
3. Every core booking path is instructor-aware where required
4. CI catches regressions before merge
5. No known legal/privacy blocker remains in active operation

If any answer is "no," pause expansion and continue hardening.

---

# SECTION 21 — ROLE-BY-ROLE IMPLEMENTATION MATRIX (DELEGATION-READY)

## Founder / GM

**Mission:** Protect focus, sequence, and commercial outcomes.

**Weekly responsibilities:**
- Approve only roadmap-aligned work (Sections 13-20)
- Enforce "reliability before expansion" gate
- Run weekly KPI review (Section 18) and publish decisions
- Kill or defer any feature that does not improve revenue, trust, or retention

**Must-own decisions:**
- Final commission bps policy and override strategy
- What gets hidden vs fixed vs deleted
- Go/no-go sign-off for each production release

## Product Owner

**Mission:** Convert roadmap into tightly scoped, testable tickets.

**Weekly responsibilities:**
- Break each initiative into acceptance-criteria-first tickets
- Keep active sprint scope under control (no mid-sprint inflation)
- Attach KPI intent to each ticket (what metric should move)
- Maintain risk register updates with engineering leads

**Deliverables every sprint:**
- Prioritized backlog with explicit dependencies
- Release notes draft for operator-facing changes
- Post-release analysis: expected vs observed impact

## Platform / Backend Engineer

**Mission:** Guarantee transactional correctness and data integrity.

**Weekly responsibilities:**
- Maintain payment, webhook, and commission correctness tests
- Validate refund paths for all failure classes
- Ensure rate-limiting and auth controls are consistently applied
- Add indexes and query guards for high-traffic endpoints

**Definition of done for backend tasks:**
- Concurrency-safe
- Idempotent where money is involved
- Observable (logs/metrics) for success + failure
- Covered by integration tests

## Frontend / UX Engineer

**Mission:** Reduce operator/customer confusion and increase conversion trust.

**Weekly responsibilities:**
- Improve checkout and booking clarity states
- Keep dashboard IA simple and discoverable
- Add loading, empty, and error states for high-traffic pages
- Remove dead ends and inconsistent CTAs

**Definition of done for frontend tasks:**
- Mobile first behavior verified
- Accessibility basics pass (keyboard/focus/labels)
- All error states user-understandable
- Feature discoverable in <= 3 clicks from primary nav

## QA / Release Owner

**Mission:** Prevent regressions from reaching production.

**Weekly responsibilities:**
- Execute smoke tests for booking, checkout, refunds, and account actions
- Run pre-release regression checklist (Section 12 alignment)
- Track flake rate and quarantine unstable tests quickly
- Block release on P1/P0 issues regardless of schedule pressure

**Release gate (hard stop):**
- No unresolved P1 defects
- CI + coverage thresholds pass
- One real-money transaction replayed in staging
- Rollback plan documented and tested

## Ops / Support

**Mission:** Convert field signals into product priorities fast.

**Weekly responsibilities:**
- Tag and classify top support contacts by root cause
- Escalate repeat confusion patterns in < 24 hours
- Validate email and notification quality with real examples
- Monitor trust signals: failed bookings, failed checkouts, cancellation disputes

**Output to product each week:**
- Top 10 ticket themes
- Time-to-resolution trend
- Recommended UX copy or flow fixes

---

# SECTION 22 — HANDOFF PROTOCOLS (NO-DROP EXECUTION)

## Engineering -> QA Handoff

Required package:
1. Scope summary (what changed and why)
2. Test evidence (unit/integration/manual)
3. Known edge cases and expected behavior
4. Rollback trigger conditions

No package, no QA execution.

## QA -> Release Handoff

Required package:
1. Pass/fail checklist with blockers listed
2. Production risk classification (low/medium/high)
3. Monitoring watchlist for first 24 hours

No explicit risk grade, no release.

## Support -> Product Handoff

Required package:
1. Customer verbatims grouped by issue class
2. Frequency + impact estimate
3. Suggested fix class (copy, UX, logic, policy)

No quantified frequency, no roadmap reprioritization.

---

# SECTION 23 — 6 RELEASES TO 90+ SCORE (TACTICAL TRACK)

## Release 1: Revenue and Trust Baseline
- Commission live and validated
- Review privacy leak fixed
- Membership dead-end hidden
- CI hard gate active

## Release 2: Booking Integrity
- Instructor assignment fully wired
- Confirmation and reminder consistency checks
- Booking failure recovery UX improved

## Release 3: Commerce Integrity
- Product variants production-ready
- Stock + refund safety net verified
- Checkout summary deployed

## Release 4: Scale and Security
- Redis rate limiting cutover
- Auth standardization complete across studio routes
- Abuse and retry monitoring dashboards live

## Release 5: Operator Experience
- Dashboard discoverability improvements complete
- Settings shortcuts and workflow guidance refined
- Support-ticket-driven UX fixes shipped

## Release 6: Premium Certification
- Accessibility critical paths signed off
- Branded emails polished and validated
- Full QA certification pass and launch confidence review

---

# SECTION 24 — FINAL OPERATING RULES

1. **If a feature is visible, it must work.**
2. **If money moves, the path must be test-covered and idempotent.**
3. **If trust drops, pause expansion and repair.**
4. **If scope grows, quality gates tighten.**
5. **If a KPI does not move, the initiative is re-scoped or removed.**

These rules preserve execution discipline and protect the path from 71/100 to 90+/100.

---

# SECTION 25 — NEXT 10 TICKETS (LEAN START)

Use this as the immediate implementation queue. Keep each ticket small enough to ship in 1-2 days.

1. **REV-01A:** Add automated assertion that platform fee is present on all paid checkout types.
2. **FIX-01A:** Add regression test ensuring review API never returns reviewer email in studio responses.
3. **CHK-01A:** Add cancellation-policy summary block to checkout page before Stripe redirect.
4. **INST-02A:** Add test coverage for instructor persistence through booking create/update flows.
5. **VAR-04A:** Add negative-stock guard test for simultaneous variant purchases.
6. **AUTH-01A:** Audit all studio write routes for `requireStudioOwner` enforcement and patch misses.
7. **GDPR-01A:** Add export payload schema test (profile, bookings, orders, payments, consents).
8. **CI-03A:** Fail CI when coverage drops below thresholds on changed files.
9. **DASH-01A:** Add quick-action shortcuts for top 5 studio tasks from dashboard home.
10. **OPS-01A:** Create weekly support-to-product report template tied to Section 18 KPIs.

## Done Criteria for This Batch

- All 10 tickets merged with passing CI
- No new P1/P2 regressions introduced
- At least 3 KPIs in Section 18 show measurable positive movement

---

# SECTION 26 — WORLD-CLASS TRANSFORMATION EXECUTION PROTOCOL

Source of truth: this document only.  
Operating mode: execution, not discussion.

---

## 1) KILL LIST

Apply immediately. For each item: **Fix now**, **Hide**, or **Remove**.

| Area | Current issue | Action | Exit condition |
|------|---------------|--------|----------------|
| Membership purchase | Customer-visible but historically broken | **Fix now** or **Hide until green** | End-to-end membership purchase succeeds and is test-covered |
| White-label claim | Custom domains partial, hardcoded brand surface | **Hide claim** + **Remove marketing promise** until complete | Full deep-link domain support + branded transactional stack |
| Dual cart behavior | Fragmented marketplace/wear checkout paths | **Remove duplicate path** and converge to one cart | Single cart + single checkout summary + single payment entry |
| Wear-store complexity | Separate flow dilutes core pottery value | **Hide** if not driving revenue; remove if maintenance-heavy | No user-facing fragmentation in commerce navigation |
| Dead/low-value models (`Experiment`, `PricingScenario`, non-operational fluff) | Surface area without business value | **Remove from runtime paths** | No references in active APIs/pages/jobs |
| Fake-good nav entries | Links to unfinished or low-confidence flows | **Hide immediately** | Zero dead-end clicks in operator and customer nav |
| AI/insights placeholders without operational depth | Perceived capability mismatch | **Hide** | Only measurable, working insights remain exposed |
| Duplicate settings entry points | Operator confusion and support load | **Merge** | One clear settings hub taxonomy |

**Kill-list rule:** If not reliable and monetizable, it does not stay visible.

---

## 2) CRITICAL FIXES (P0)

Execute in this order. If a fix already exists, re-validate and lock with regression tests.

1. **P0-GDPR-01:** Data export endpoint complete and accurate.
2. **P0-GDPR-02:** Data deletion/anonymization endpoint complete with session invalidation.
3. **P0-GDPR-03:** Cookie consent gating for analytics and non-essential tracking.
4. **P0-PRIV-01:** Review API must never expose reviewer email in studio-facing payloads.
5. **P0-COMM-01:** Platform commission > 0 and applied on all intended transaction types.
6. **P0-COMM-02:** Stock-failure cancellation must trigger automatic refund attempt + alerting.
7. **P0-CI-01:** CI must run tests and enforce coverage threshold on merge.

**P0 done bar:** all seven fixes pass automated tests + one manual real-flow validation each.

---

## 3) MASTER ROADMAP

### Phase A — Stabilize
- Activate commission and verify platform fee capture
- Close GDPR/privacy gaps
- Enforce CI testing/coverage
- Remove dead ends and unsafe visible flows

### Phase B — Simplify
- Reduce studio nav to <15 primary destinations
- Consolidate settings and duplicate management paths
- Unify cart/checkout into one predictable flow
- Remove or hide non-core fragmented experiences

### Phase C — Strengthen
- Booking: instructor assignment, schedule clarity, auto-slot generation, membership usage
- Commerce: variants, pickup communication, fulfillment reliability, refund safety
- Mobile: minimal taps, clear states, no ambiguity pre-Stripe
- Platform: shared auth, file decomposition, scalable throttling

### Phase D — Premium
- Studio-branded email shell and transactional polish
- Better spacing, loading states, trust and clarity copy
- Mobile-first dashboard usability refinement

### Phase E — Certify
- Full end-to-end QA certification
- Role/permission abuse tests
- Zero dead-end audit pass
- Launch readiness sign-off with rollback confidence

---

## 4) MASTER TASK LIST

| ID | Problem | Exact fix | Priority | Acceptance criteria |
|----|---------|-----------|----------|---------------------|
| EXEC-001 | No business model with 0% fee | Set default commission bps > 0 and support overrides | P0 | Platform fee appears on every targeted paid transaction |
| EXEC-002 | Revenue invisibility | Add admin revenue dashboard for fee collected vs GMV | P1 | Daily fee totals reconcile with payment events |
| EXEC-003 | GDPR exposure | Implement/verify export payload coverage | P0 | Export includes profile, bookings, orders, payments, consents |
| EXEC-004 | GDPR exposure | Implement/verify deletion + anonymization + signout | P0 | Deleted user cannot authenticate; PII anonymized |
| EXEC-005 | Consent non-compliance | Gate analytics by explicit consent | P0 | No analytics fires before consent |
| EXEC-006 | Privacy leak risk | Remove reviewer email fields from all studio review responses | P0 | Contract tests fail if email field appears |
| EXEC-007 | Refund integrity gap | Auto-refund on stock failure with retry + alert | P0 | Failed stock path always creates refund attempt record |
| EXEC-008 | Regression risk | CI test + coverage enforcement on merge | P0 | Merge blocked when tests/coverage fail |
| EXEC-009 | Dashboard overload | Collapse IA to <15 destinations in grouped nav | P1 | Studio can complete top 5 tasks without search/help |
| EXEC-010 | Settings confusion | Consolidate settings into one hub taxonomy | P1 | No duplicate settings routes in primary nav |
| EXEC-011 | Cart fragmentation | Unify dual cart systems into one cart/checkout path | P1 | Single cart object powers all product/booking checkout |
| EXEC-012 | Booking instructor gap | Persist instructor selection in booking creation/update | P1 | Instructor appears in booking, ops views, and notifications |
| EXEC-013 | Instructor ops blind spot | Add schedule view by instructor with upcoming load | P1 | Staff can view daily/weekly instructor allocations |
| EXEC-014 | Manual slot generation burden | Add auto-generation job with lookahead window | P2 | Future slots generated automatically on schedule |
| EXEC-015 | Membership disconnected from booking | Apply membership credits/eligibility in checkout | P1 | Eligible users can redeem credits during booking payment |
| EXEC-016 | Commerce too weak | Implement product variants in catalog/cart/checkout | P1 | Variant stock/price validated at payment and decrement |
| EXEC-017 | Pickup communication gap | Send pickup-ready and pickup-confirmation emails | P2 | Pickup orders always trigger customer notification |
| EXEC-018 | Pre-payment trust gap | Add on-site checkout summary before Stripe redirect | P1 | Customer reviews totals, policy, items before redirect |
| EXEC-019 | Mobile friction | Reduce tap count and simplify mobile dashboard/booking flow | P1 | Booking completion on mobile in <2 minutes median |
| EXEC-020 | Auth inconsistency | Enforce shared studio auth guard on all write routes | P1 | No studio write route bypasses `requireStudioOwner` |
| EXEC-021 | Scale blocker | Migrate in-memory throttles to Redis-backed limiter | P1 | Rate limits consistent across multi-instance deployment |
| EXEC-022 | Maintenance drag | Split prioritized god files into focused modules | P2 | No targeted file remains oversized without clear boundary |
| EXEC-023 | Inconsistent product voice | Unify customer/operator copy and naming conventions | P2 | Terms are consistent across nav, checkout, and emails |
| EXEC-024 | Weak launch confidence | Build QA certification suite across booking/order/refund/mobile | P0 | Certification checklist passes with evidence artifacts |

---

## 4A) WEAR / POD HARDENING ADDENDUM

Use this addendum only if wear remains part of the product after the kill-list decision.  
Rule: no new visible wear feature ships before the control layer below is green.

| ID | Problem | Exact fix | Priority | File / system map | Acceptance criteria |
|----|---------|-----------|----------|-------------------|---------------------|
| EXEC-025 | Supplier still too close to storefront truth | Make PotteryMania DB the source of truth for wear catalog, pricing visibility, studio availability, and publish status. Treat supplier sync as upstream input only. | P1 | `lib/wear-spreadconnect-catalog-sync.ts`, `app/wear/shop/page.tsx`, `app/api/admin/wear-products/route.ts`, `app/api/studios/[studioId]/wear/route.ts` | Wear PDP/shop pages render fully from local DB with no live supplier dependency in customer flows |
| EXEC-026 | Staging/live fulfillment leak risk | Enforce strict live vs staging separation for Spreadconnect credentials, submission guards, and operator visibility. Add explicit non-production blocks for live supplier submission. | P0 | `lib/spreadconnect-config.ts`, `lib/wear-order-spreadconnect.ts`, `lib/runtime-feature-flags.ts`, `app/admin/system/page.tsx` | Non-production cannot submit live orders; admin can clearly see current supplier environment and guard state |
| EXEC-027 | Heavy sync/publish flows are fragile | Move wear publication/sync into background jobs with batch control, retry states, and failure capture. Avoid long blocking admin requests. | P1 | `lib/wear-spreadconnect-catalog-sync.ts`, `app/api/admin/wear-products/route.ts`, `app/api/admin/wear-product-variants/route.ts`, background job layer | Large sync/publish runs are resumable, batched, and observable without request timeouts |
| EXEC-028 | Wear order ops are too opaque | Add a real internal wear submission state machine, failure log, retry tooling, and needs-action queue. PotteryMania ops should not depend on supplier dashboards for normal support. | P1 | `lib/wear-order-lifecycle.ts`, `lib/wear-order-spreadconnect.ts`, `app/admin/wear-orders/page.tsx`, `app/api/admin/wear-orders/[orderId]/route.ts`, `app/api/webhooks/stripe/route.ts` | Failed/stuck wear orders can be diagnosed and re-submitted from PotteryMania admin with reason history preserved |
| EXEC-029 | Asset/image failures can silently poison publish reliability | Add asset preflight checks, predictable controlled asset hosting, and admin fallbacks for broken or blocked print assets. | P2 | `lib/wear-product-json.ts`, `lib/wear-spreadconnect-catalog-sync.ts`, `app/api/admin/wear-products/route.ts`, media storage config | Publish flow flags invalid assets before release and exposes clear remediation steps in admin |
| EXEC-030 | Reseller economics are not yet premium-grade | Strengthen studio wear control plane: per-studio enable/disable, allowed products, margin overrides, earnings visibility, refund-linked reversals, and suspicious activity review. | P1 | `app/api/studios/[studioId]/wear/route.ts`, `app/api/studios/[studioId]/wear/earnings/route.ts`, `app/api/checkout/route.ts`, finance/revenue dashboards | Studio wear earnings reconcile cleanly, refund reversals are visible, and product access is controllable per studio |

### Wear Rule Of Priority

If wear stays in scope, execute `EXEC-025` through `EXEC-030` **before** adding:

- studio-side design customization
- supplier-driven product pages
- more catalog breadth for its own sake
- more mixed-checkout complexity without ops visibility
- admin surfaces that depend on manual supplier dashboard checks

### Wear Done State

- Wear catalog is locally controlled and supplier-agnostic at render time
- Supplier submission is environment-safe, replayable, and observable
- Failed orders do not require mystery debugging
- Studio earnings and reversals reconcile cleanly
- Support can resolve common wear failures without leaving PotteryMania admin

---

## 5) EXECUTION ORDER (NO DEVIATION)

1. Run KILL LIST decisions (hide/remove unsafe or fake-good surfaces)
2. Execute all P0 fixes (`EXEC-001`, `003`, `004`, `005`, `006`, `007`, `008`, `024`)
3. Validate business model live (`EXEC-002`) with fee reconciliation
4. Simplify operator product shape (`EXEC-009`, `010`, `011`)
5. Strengthen booking core (`EXEC-012`, `013`, `014`, `015`)
6. Raise commerce to serious baseline (`EXEC-016`, `017`, `018`)
6A. If wear remains in scope, harden wear control layer (`EXEC-025`, `026`, `027`, `028`, `029`, `030`)
7. Improve mobile-first completion path (`EXEC-019`)
8. Harden platform architecture (`EXEC-020`, `021`, `022`)
9. Apply premium layer (`EXEC-023` + branded trust/UI polish)
10. Re-run full QA certification (`EXEC-024`) and ship only on pass

---

## 6) WORLD-CLASS DEFINITION (DONE STATE)

### Hyperadmin
- Revenue is visible daily (GMV, fee capture, refunds, failure rates)
- Platform controls are safe, auditable, and role-correct
- No compliance blockers (GDPR + consent fully operational)
- Releases are deterministic (CI gates + certification evidence)

### Studio Admin
- Can run bookings, products, schedules, and settings without confusion
- Navigation is clear, fast, and mobile-usable
- Instructor and membership logic behaves predictably
- Operational messages and emails reflect studio branding and trust

### End Customer
- Can discover, book, and pay in minutes on mobile
- Sees clear totals, policy, and what happens next before payment
- Receives reliable confirmations, reminders, and pickup updates
- Experiences no dead-end flows, broken promises, or unclear states

---

## 7) FINAL PRODUCT STATE

PotteryMania operates as a focused, premium pottery platform: booking-first, commerce-serious, and revenue-active.  
Studios can run daily operations without cognitive overload. Customers can complete booking and checkout quickly on mobile with confidence.  
The platform captures commission by default, handles failures safely, and passes compliance and QA gates before release.  
What remains visible is real, reliable, and monetizable. What creates confusion or fake confidence is removed.  
This is no longer a promising codebase. It is a trusted operating product.
