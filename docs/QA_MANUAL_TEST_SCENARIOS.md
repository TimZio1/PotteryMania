# PotteryMania — Manual QA test scenarios (exhaustive)

**Purpose:** Give testers a single checklist to validate the live (or staging) app end-to-end.  
**App type:** Next.js marketplace + class booking; roles: **customer**, **vendor**, **admin**, **hyper_admin**.  
**Protected routes:** `/dashboard/*` and `/admin/*` require sign-in (middleware redirects to `/login?callbackUrl=…`).

---

## 0. Before you start

### 0.1 Environments

- [ ] Record **base URL** (e.g. `https://potterymania.com` or Railway preview URL).
- [ ] Confirm **HTTPS** where production is expected.
- [ ] Note whether **Stripe** is **test mode** (expected for non-prod).

### 0.2 Data you need (prepare with product owner)

| Asset | Why |
|--------|-----|
| **Customer account** (email + password) | Login, bookings, cart as identified user |
| **Second customer** (optional) | Isolation / no cross-talk |
| **Vendor account** | Studio dashboard, listings, Stripe Connect |
| **Admin or hyper_admin account** | `/admin` approvals and booking list |
| **Approved studio** with ≥1 **active product** | Marketplace, product PDP, cart |
| **Approved studio** with ≥1 **public active experience** + **open future slots** | Classes list, booking flow |
| **Studio pending review** (optional) | Admin approve/reject |
| **Experience with deposit** (`bookingDepositBps` > 0) | Cart “due now” vs total |
| **Experience with waitlist enabled** + full or limited slots | Waitlist UI |
| **Invalid / random UUID** in URL | 404 behaviour |

### 0.3 Browsers & devices

- [ ] **Desktop:** Chrome (primary), one of Firefox / Safari / Edge.
- [ ] **Mobile:** iOS Safari and/or Android Chrome — **must** test **hamburger menu**, cart, checkout form, class booking form.
- [ ] **Viewport:** 320px width minimum spot-check (no horizontal scroll on key pages).

### 0.4 What “Pass” means

- No **unhandled** error screens (Next.js error digest) on happy path.
- **Business rules** preserved (prices, statuses, redirects after pay).
- **Accessibility basics:** visible focus on primary actions, form labels present, tap targets usable on mobile.

---

## 1. Public marketing & navigation (unauthenticated)

### 1.1 Home `/`

- [ ] Page loads; hero and “How it works” visible.
- [ ] Primary CTA **Browse the shop** → `/marketplace`.
- [ ] Secondary **Find a class** → `/classes`.
- [ ] Header: **Shop**, **Classes**, **Studios**, **Cart** behave correctly.
- [ ] **Join** / **Sign in** visible when logged out.
- [ ] Footer links work (**Shop**, **Classes**, **Studios**, **Sign in**).

### 1.2 Marketplace `/marketplace`

- [ ] Lists only **active** products from **approved** studios (spot-check vs DB or seed data).
- [ ] Empty state: message + links to classes/studios when no products.
- [ ] Each card navigates to `/marketplace/products/{id}`.
- [ ] Images: broken/missing image shows placeholder where implemented.

### 1.3 Product detail `/marketplace/products/{productId}`

- [ ] Toolbar **Back to marketplace** works.
- [ ] Studio name links to `/studios/{studioId}`.
- [ ] Price matches listing (incl. sale vs list if applicable).
- [ ] **Quantity** + **Add to cart**; success/error message after add.
- [ ] Long description and shipping/return notes render if present.

### 1.4 Classes list `/classes`

- [ ] Only **active**, **public** experiences from **approved** studios.
- [ ] Empty state acceptable.
- [ ] Card → `/classes/{experienceId}`.

### 1.5 Class detail `/classes/{experienceId}`

- [ ] Toolbar **All classes** → `/classes`.
- [ ] Studio link works.
- [ ] Price “per person” shown.
- [ ] If **deposit** configured: copy explains deposit vs remainder.
- [ ] If **booking approval required**: warning visible.
- [ ] **Book a session** section: slot list, party size, seat type (if seat pools exist).
- [ ] **Waitlist** path visible when applicable (full / cannot meet min party); submitting waitlist succeeds or shows API error clearly.

### 1.6 Studios list `/studios`

- [ ] Only **approved** studios.
- [ ] Card → `/studios/{studioId}`.

### 1.7 Studio profile `/studios/{studioId}`

- [ ] Toolbar **All studios** works.
- [ ] Cover, name, location, descriptions.
- [ ] **Classes** and **Products** sections; links to class/product pages.

### 1.8 Mobile navigation

- [ ] Open **menu** (hamburger): all primary links reachable.
- [ ] **Close** via button, backdrop tap, and **Escape** (if implemented).
- [ ] **Cart** shortcut on small screens works.
- [ ] No duplicate scroll traps (body scroll behind open menu — note if still scrolls).

### 1.9 Deep links & 404

- [ ] `/marketplace/products/00000000-0000-0000-0000-000000000000` (or invalid id) → **404** / not found behaviour.
- [ ] Invalid class id → not found.
- [ ] Invalid studio id → not found.

---

## 2. Authentication

### 2.1 Register `/register`

- [ ] **Customer** path: submit valid email + password (≥8 chars) → success message.
- [ ] **Vendor** path: same → success.
- [ ] Duplicate email → clear error (not 500).
- [ ] Password &lt; 8 chars → HTML5 / server validation blocks or errors.
- [ ] Link to **Sign in** works.

### 2.2 Login `/login`

- [ ] Valid credentials → redirect to **callbackUrl** when present (e.g. open `/login?callbackUrl=/dashboard` → lands on dashboard).
- [ ] Default redirect when no callback: typically `/dashboard` (verify product expectation).
- [ ] Wrong password → “Invalid email or password” (no stack trace to user).
- [ ] **Create account** link works.

### 2.3 Session & header (after login)

- [ ] **Dashboard**, **Bookings**, **Waitlist** appear for signed-in user.
- [ ] **Admin** appears only for **admin** / **hyper_admin**.
- [ ] **Sign out** returns to public experience; protected routes redirect to login.

### 2.4 Access control

- [ ] Visit `/dashboard` logged out → redirect to `/login?callbackUrl=/dashboard`.
- [ ] Visit `/admin` logged out → same.
- [ ] Customer on `/dashboard` → **customer** dashboard (shop/class CTAs), not vendor tools.
- [ ] Vendor on `/dashboard` → studio list / empty state.
- [ ] Non-admin user opens `/admin` → redirect away (e.g. `/`) per app rules.

---

## 3. Cart & checkout

### 3.1 Cart `/cart` (can be guest or logged-in — verify both if product allows)

- [ ] Empty cart: message + links to marketplace/classes.
- [ ] Add **product** from PDP → line appears with quantity control.
- [ ] Change quantity → totals update after refresh/load.
- [ ] Add **class booking** from class page → line shows date/time; participants control.
- [ ] **Deposit** line: “Total” vs “Due now” when `bookingDepositBps` > 0.
- [ ] **Seat type** dropdown when slot has seat pools; changing value persists.

### 3.2 Checkout form

- [ ] **Booking-only** cart: shipping fields hidden; helper text accurate.
- [ ] **Mixed or product-only** cart: name, email, address fields shown.
- [ ] **Continue to payment** → redirect to **Stripe Checkout** URL (or clear error if misconfigured).

### 3.3 Stripe Checkout (test mode)

- [ ] Complete payment with test card **4242…** (or project’s documented test card).
- [ ] Cancel payment → user returns without corrupting cart (note behaviour).
- [ ] After success → `/checkout/success` (or configured return URL).

### 3.4 Checkout success `/checkout/success`

- [ ] Thank-you / confirmation message.
- [ ] **Keep shopping** → marketplace.
- [ ] **View my bookings** → `/my-bookings`.

### 3.5 Negative / edge

- [ ] Checkout with empty cart → API error handled in UI.
- [ ] Network offline mid-submit → user sees failure, no silent hang.

---

## 4. Customer post-purchase

### 4.1 My bookings `/my-bookings`

- [ ] Logged-in customer sees bookings from API.
- [ ] Empty state suggests browsing classes.
- [ ] Each row: title, studio, slot, participants, seat, amounts, status.
- [ ] **Cancel booking** where status allows → confirm dialog → message shows refund outcome → list refreshes.
- [ ] **View waitlist** link works.

### 4.2 My waitlist `/my-waitlist`

- [ ] Lists waitlist entries or empty state.
- [ ] **My bookings** link works.

---

## 5. Vendor (studio owner)

### 5.1 Dashboard `/dashboard` (as vendor)

- [ ] **Studio dashboard** title and description.
- [ ] **No studios:** “Create your studio” → `/dashboard/studio/new`.
- [ ] **With studios:** each card shows name, **status**, **Stripe** connected vs action needed.
- [ ] **Manage studio** → `/dashboard/studio/{id}`.
- [ ] Secondary links: **Products**, **Experiences**, **Bookings**, **Waitlist** per studio.

### 5.2 New studio `/dashboard/studio/new`

- [ ] Required fields enforced; submit creates studio and redirects to edit page (or studio id page).
- [ ] Error from API displayed.

### 5.3 Studio settings `/dashboard/studio/{studioId}`

- [ ] Load existing data; save updates (if UI supports).
- [ ] **Submit for review** (if present) transitions status appropriately.

### 5.4 Products `/dashboard/products/{studioId}`

- [ ] List/create/edit/archive flows per product owner spec.
- [ ] Images and prices behave as expected.

### 5.5 Experiences `/dashboard/experiences/{studioId}`

- [ ] CRUD for experiences; slots generation if applicable.
- [ ] Public visibility toggles affect `/classes` listing.

### 5.6 Bookings (vendor) `/dashboard/bookings/{studioId}`

- [ ] Incoming bookings listed; vendor actions (confirm, etc.) match spec.

### 5.7 Waitlist (vendor) `/dashboard/waitlist/{studioId}`

- [ ] Waitlist entries visible; actions per spec.

### 5.8 Stripe Connect

- [ ] **Onboard / Connect** flow completes in Stripe test mode.
- [ ] Dashboard shows **Connected** when charges + payouts enabled.
- [ ] Payout edge cases documented by PO (optional deep test).

### 5.9 Vendor chrome

- [ ] Dashboard layout: **Overview**, **Shop**, **Classes**, **Cart** links work.
- [ ] **Sign out:** if only available from marketing header, document that vendors must open home/marketplace to sign out — **file as bug if unacceptable**.

---

## 6. Admin / hyper_admin

### 6.1 Admin home `/admin`

- [ ] **Operations** title; global commission line readable.
- [ ] **Pending studios:** **Approve** removes from list; studio becomes **approved** (verify on studios list or vendor side).
- [ ] **Reject** removes with reason; vendor sees rejected state (per workflow).
- [ ] **Bookings** section loads list or empty state; no leak of other tenants’ data (spot-check).

### 6.2 Security

- [ ] Customer session **cannot** load `/admin` (redirect).
- [ ] Vendor session **cannot** load `/admin`.

---

## 7. Cross-cutting quality

### 7.1 Performance & stability

- [ ] No infinite loading spinners on main pages.
- [ ] Hard refresh on deep link (e.g. product page) works.
- [ ] `/api/auth/session` returns **200** when `AUTH_SECRET` set (no 500 “configuration” errors).

### 7.2 SEO / sharing (light)

- [ ] Document title not blank on key routes.
- [ ] Open Graph / social cards: PO decision (may be out of scope).

### 7.3 Legal / copy

- [ ] Currency shown as **€** consistently.
- [ ] No placeholder “lorem” in production content.

### 7.4 Regression matrix (quick)

| Area | Customer | Vendor | Admin |
|------|----------|--------|-------|
| Home / marketing | ✓ | ✓ | ✓ |
| Cart / checkout | ✓ | ✓ | ✓ |
| My bookings / waitlist | ✓ | N/A | N/A |
| Dashboard | ✓ (customer view) | ✓ | N/A |
| Admin | ✗ | ✗ | ✓ |

---

## 8. Bug report template (for testers)

```
Title: [Page/route] — short description
Environment: production / staging — URL:
Browser + version:
Account role: customer | vendor | admin
Steps: 1. … 2. …
Expected:
Actual:
Screenshot / HAR (if checkout):
Severity: blocker / major / minor / cosmetic
```

---

## 9. Sign-off

| Tester | Date | Build / commit | Pass / Fail | Notes |
|--------|------|----------------|-------------|-------|
|        |      |                |             |       |

---

*Document generated from repository routes and middleware. Update when new flows ship.*
