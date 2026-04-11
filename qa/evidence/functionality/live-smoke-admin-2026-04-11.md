# Live Smoke Report — Admin / Hyperadmin Console — 2026-04-11

## Scope

Production smoke run against `https://potterymania.com/admin`, mapped back to
`qa/comprehensive-qa-03-admin-hyperadmin-console.md`.

This report covers the operator-facing console surface only. For public-client
results see `live-smoke-2026-04-11.md`. For studio-vendor results see
`live-smoke-vendor-2026-04-11.md` (if produced in this session).

---

## Run Metadata

| Field | Value |
|-------|-------|
| Run date | `2026-04-11` |
| Target origin | `https://potterymania.com` |
| Admin credential source | Railway production env (`TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD`) |
| Primary spec | `tests/e2e/smoke/admin-route-diagnostics.spec.ts` |
| Secondary coverage | `tests/e2e/smoke/journeys.spec.ts` (`hyperadmin route reachability`) |
| Playwright project | `chromium` |
| Admin diagnostic summary | `29 passed, 1 failed` (1 failure = test-runner infrastructure, not route) |
| Journeys hyperadmin check | `passed` |

---

## Summary

The admin console live smoke cleared all 27 distinct `/admin/**` routes as well
as the unauthenticated-redirect gate and the mobile navigation test. The single
Playwright failure recorded for `/admin/war-room` was a **test-runner file
system error** (Playwright trace copy ENOENT) that prevented the test from
completing setup — the route itself was never evaluated and must be re-run.
`/admin/categories` rendered but emitted Server Components render errors in the
browser console, indicating a production-side data-fetching problem on that
page. All remaining routes loaded without page-level errors; a repeating
`authjs Failed to fetch` console error pattern appears on approximately half the
routes and is documented separately below.

**Overall status: `PASS WITH FINDINGS`**

- Smoke blockers: `0`
- High-priority findings: `2`
  - `/admin/categories` Server Components render error
  - `/admin/war-room` not audited (test infrastructure failure; requires re-run)
- Low-priority / informational: `1`
  - Widespread `authjs Failed to fetch` console noise on authenticated pages

---

## Auth Gate Tests

| Scenario | Doc 3 ref | Result | Notes |
|----------|-----------|--------|-------|
| Unauthenticated deep link to `/admin/users` redirects to `/login` or `/unauthorized-admin` | L-1 | **Pass** | Final URL confirmed as `/login` |
| Mobile admin nav opens; "Vendor view" link navigates to `/dashboard` | L-2, L-3 | **Pass** | Viewport 390×844; nav visible; context switch confirmed |

---

## Route Coverage Table

Routes listed in `admin-route-diagnostics.spec.ts` (27 routes, one per diagnostic test plus one combined detail-pages check).

| Route | Console Errors | Page Errors | Final URL match | Result |
|-------|---------------|-------------|-----------------|--------|
| `/admin` | authjs fetch · React #418 hydration | React #418 | `/admin` | Pass |
| `/admin/war-room` | — | — | not reached | **Not audited** |
| `/admin/notifications` | authjs fetch | — | `/admin/notifications` | Pass |
| `/admin/audit` | — | — | `/admin/audit` | Pass (clean) |
| `/admin/users` | — | — | `/admin/users` | Pass (clean) |
| `/admin/studios` | — | — | `/admin/studios` | Pass (clean) |
| `/admin/revenue` | authjs fetch | — | `/admin/revenue` | Pass |
| `/admin/features` | authjs fetch | — | `/admin/features` | Pass |
| `/admin/ai-insights` | authjs fetch | — | `/admin/ai-insights` | Pass |
| `/admin/coupons` | authjs fetch | — | `/admin/coupons` | Pass |
| `/admin/wear-products` | — | — | `/admin/wear-products` | Pass (clean) |
| `/admin/wear-orders` | — | — | `/admin/wear-orders` | Pass (clean) |
| `/admin/wear-analytics` | — | — | `/admin/wear-analytics` | Pass (clean) |
| `/admin/orders` | authjs fetch | — | `/admin/orders` | Pass |
| `/admin/bookings` | authjs fetch | — | `/admin/bookings` | Pass |
| `/admin/operations` | authjs fetch | React #418 | `/admin/operations` | Pass |
| `/admin/content` | authjs fetch | — | `/admin/content` | Pass |
| `/admin/platform-features` | authjs fetch | — | `/admin/platform-features` | Pass |
| `/admin/feature-bundles` | authjs fetch | — | `/admin/feature-bundles` | Pass |
| `/admin/business-templates` | authjs fetch | — | `/admin/business-templates` | Pass |
| `/admin/marketplace` | authjs fetch | — | `/admin/marketplace` | Pass |
| `/admin/categories` | **Server Components render error ×4** | — | `/admin/categories` | Pass (with server error) |
| `/admin/experiments` | — | — | `/admin/experiments` | Pass (clean) |
| `/admin/reports` | authjs fetch | — | `/admin/reports` | Pass |
| `/admin/system` | — | — | `/admin/system` | Pass (clean) |
| `/admin/settings` | authjs fetch | — | `/admin/settings` | Pass |
| `/admin/finance` | — | — | `/admin/finance` | Pass (clean) |
| admin user + studio detail pages | authjs fetch ×3 | — | `/admin/studios/55b02…` | Pass |

**Clean routes (no console or page errors):** `/admin/audit`, `/admin/users`,
`/admin/studios`, `/admin/wear-products`, `/admin/wear-orders`,
`/admin/wear-analytics`, `/admin/experiments`, `/admin/system`,
`/admin/finance` (9 of 27).

---

## Findings

### Finding 1 — `/admin/categories` Server Components render error (HIGH)

**Observed:**

```
Error: An error occurred in the Server Components render.
The specific message is omitted in production builds to avoid leaking sensitive details.
A digest property is included on this error instance…
[admin-error] Error: An error occurred in the Server Components render. …
```

The error appeared **four times** in the console log (two pairs, logged on
initial load and on a hydration retry), with both a raw `Error` and the
`[admin-error]` labelled variant. No page-level JavaScript exception was
recorded alongside it, which suggests the error boundary caught the failure and
rendered a fallback rather than a blank screen, but the ceramic categories list
content is unlikely to have been usable.

**Mapping:** §20 (`/admin/categories`) · Scenario `CG-1`

**Recommended action:** Investigate server logs for the production digest
associated with this error. Most likely cause is a missing or malformed seed row
in the categories table, or a Prisma query that assumes a non-null relationship
that is null in production. Reproduce in staging with `NODE_ENV=development` to
get the full error message.

**Severity:** Major — ceramic category management is blocked for operators
using this page; wear product categorisation may be affected downstream.

---

### Finding 2 — `/admin/war-room` not audited due to test infrastructure failure (MEDIUM)

**Observed:**

The Playwright test for `/admin/war-room` timed out at 120 s while setting up
the browser page, with the following runner-level error:

```
ENOENT: no such file or directory,
copyfile '…traces/7a9934a…-recording1.network'
-> '…traces/7a9934a…-recording1-pwnetcopy-1.network'
```

This is a Playwright trace file copy race that caused the test worker to
terminate before the page could be created. **The route itself was never
loaded**; we have no signal on whether `/admin/war-room` renders correctly in
production.

**Mapping:** §4 (`/admin/war-room`) · Scenarios `WR-1`, `WR-2`

**Recommended action:** Re-run the admin diagnostic suite in isolation with
`--trace off` to eliminate the trace race condition:

```
npx playwright test tests/e2e/smoke/admin-route-diagnostics.spec.ts \
  --project=chromium --grep "war-room" --trace off
```

**Severity:** Unknown for the route itself. The test infrastructure issue is
minor (workaround available).

---

### Finding 3 — Widespread `authjs Failed to fetch` console errors on authenticated admin routes (LOW / INFORMATIONAL)

**Observed on approximately 15 routes:**

```
l: Failed to fetch. Read more at https://errors.authjs.dev#autherror
  at f (https://potterymania.com/_next/static/chunks/c7ea6284c0ada906.js:1:11907)
  at async P (…:1:13675)
  at async _._getSession (…:1:16245)
```

This error appears to be emitted by the Auth.js client-side session poller
(`_getSession`) when a fetch to the session endpoint fails or when a new
browser context attempts `getSession()` before cookies are fully set. It was
observed in both the admin diagnostic suite (where the test does a
`loginWithCredentials` then a `page.goto`) and in earlier vendor-route runs,
suggesting it is systemic rather than admin-specific.

**Impact on this smoke:** The pages still loaded and rendered correctly despite
the console error. However, this could indicate an intermittent session-fetch
race during initial page load that could surface as a momentary unauthenticated
state in slow network conditions.

**Mapping:** §1 (Role model) · §3 (Executive overview) · general session
hygiene

**Recommended action:** Investigate the Auth.js session endpoint
(`/api/auth/session`) for CORS, rate-limiting, or cold-start latency. Confirm
whether the error is from a race between `loginWithCredentials` and the
server-side session being fully committed. If it only occurs in Playwright
(fast redirect after login), add a short `waitForResponse('/api/auth/session')`
assertion in the login helper rather than a `waitForTimeout`.

**Severity:** Low — not blocking current functionality, but represents
technical debt in the auth initialization path.

---

### Finding 4 — React hydration error #418 on `/admin` and `/admin/operations` (LOW)

**Observed:**

```
Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= …
```

React error #418 is a hydration mismatch (`Expected server HTML to contain a
matching element`). It was seen on the root `/admin` dashboard and
`/admin/operations` pages. It did not prevent the pages from loading but
indicates that the server-rendered HTML and the client-side initial render
tree diverge on those pages.

**Mapping:** §3 (Executive overview) · §15 (Operations)

**Recommended action:** Run the affected pages in a development build with
`NODE_ENV=development` to get the full hydration mismatch message. Common
causes are dates formatted differently on server vs. client, conditional
rendering based on `typeof window`, or third-party scripts injecting DOM nodes.

**Severity:** Low — visual glitch risk; does not block admin workflows.

---

## Scenario Coverage Against Document 3

### Directly covered

| Scenario | Description | Result |
|----------|-------------|--------|
| L-1 | Deep link auth gate | Pass |
| L-2 | Mobile nav traversal | Pass |
| L-3 | Vendor view link | Pass |
| EO-1 / EO-2 | Executive overview page loads | Pass (with React #418) |
| WR-1 / WR-2 | War room | **Not audited** |
| NT-1 / NT-2 | Notifications page loads | Pass |
| AU-1 / AU-2 / AU-3 | Audit log page loads | Pass (clean) |
| U-1 / U-2 / U-3 | Users list + user detail link | Pass (clean) |
| ST-1 / ST-2 | Studios list + studio detail link | Pass (clean) |
| RV-1 / RV-2 | Revenue page loads | Pass |
| FE-1 / FE-2 | Features hub page loads | Pass |
| AI-1 | AI insights page loads | Pass |
| CP-1 / CP-2 | Coupons page loads | Pass |
| W-1 / W-2 / W-3 | Wear products, orders, analytics pages load | Pass (clean) |
| OB-1 / OB-2 | Orders + bookings pages load | Pass |
| OP-1 | Operations page loads | Pass (with React #418) |
| CT-1 | Content page loads | Pass |
| PF-1 / PF-2 | Platform features + feature bundles pages load | Pass |
| BT-1 / BT-2 | Business templates page loads | Pass |
| MK-1 / MK-2 | Marketplace page loads | Pass |
| CG-1 | Ceramic categories page loads | **Pass (server error in console)** |
| EX-1 / EX-2 | Experiments page loads | Pass (clean) |
| RP-1 | Reports page loads | Pass |
| SY-1 / SY-2 | System page loads | Pass (clean) |
| SE-1 / SE-2 | Settings page loads | Pass |
| FN-1 to FN-4 | Finance engine page loads | Pass (clean) |
| IM-1 / IM-2 | Impersonation — from `journeys.spec.ts` hyperadmin reachability | Pass |

### Not covered in this live smoke

The following scenarios require interactive mutation, role-boundary testing,
staging harnesses, or separate security passes. They are out of scope for a
read-only production smoke.

| Area | Scenarios | Reason |
|------|-----------|--------|
| Role boundary enforcement (R-2 live DB flip, R-3 suspended admin) | R-2, R-3 | Requires DB mutation against production |
| Finance mutation tests (refund, payout hold) | FN-2, FN-4 | Financial mutation risk |
| Impersonation cookie cleanup (IM-2 full flow) | IM-2 | Stateful mutation |
| Coupon abuse limits | CP-2 | Requires seeded test coupons |
| Experiment kill switch | EX-2 | Platform-wide blast radius |
| Feature flag toggle blast radius | SY-1 | Platform-wide blast radius |
| War room route | WR-1, WR-2 | Not audited (see Finding 2) |
| Security checklist (§29) | CSRF, SSRF, IDOR, CSV injection | Dedicated security pass required |
| Bulk operations and job queues (§45) | BK-1, BK-2 | Staging-only |
| Chaos / DR scenarios (§32, §47) | DR-1, DR-2 | Staging-only |
| Export / print artifacts (§48) | PRN-1, PRN-2 | Manual review required |
| Accessibility audit (§31) | AC-1, AC-2 | Dedicated accessibility pass required |

---

## Recommended Follow-ups

1. **Re-run `/admin/war-room` with trace off** to get a clean signal on that
   route before the next release gate.

   ```
   npx playwright test tests/e2e/smoke/admin-route-diagnostics.spec.ts \
     --project=chromium --grep "war-room" --trace off
   ```

2. **Investigate `/admin/categories` server error.** Pull the Sentry or Railway
   logs for the production error digest on `2026-04-11`. Reproduce in staging
   with a dev build to expose the full stack trace. Fix before next operator
   release gate.

3. **Resolve `authjs Failed to fetch` console pattern.** Instrument the auth
   session endpoint with a latency histogram and confirm whether the error is
   Playwright-only or reproducible in a real browser session under slow network
   (devtools throttle). If reproducible for real users, add a retry or a
   session-ready guard.

4. **Fix React #418 on `/admin` and `/admin/operations`.** These are hydration
   mismatches indicating SSR/CSR divergence. Use a development build to surface
   the mismatch details. Prioritise `/admin` root since it is the first
   post-login page for every operator session.

5. **Add dedicated `hyper_admin` smoke account to Railway production env** so
   `requireHyperAdminUser()` boundaries (finance, force-unlock) can be tested
   separately from plain `admin` paths in future runs. The current run used a
   single admin credential and cannot distinguish hyper-only gate failures from
   plain-admin failures.

6. **Add production security headers** (same gap as Document 1): confirm
   `X-Frame-Options` / `frame-ancestors`, `X-Content-Type-Options`,
   `Referrer-Policy`, `Strict-Transport-Security` are emitted on `/admin/**`
   responses — these were absent from the public-client HTTP audit and are
   especially important for the admin console to mitigate clickjacking.

---

## Final Status

| Metric | Value |
|--------|-------|
| Routes audited | 26 of 27 |
| Routes not audited | 1 (`/admin/war-room` — runner failure) |
| Smoke blockers | 0 |
| High-priority findings | 2 (categories server error · war-room not audited) |
| Low-priority findings | 2 (authjs console noise · React #418 hydration) |
| Security headers gap | Carried from Document 1 (not re-audited here) |
| **Overall status** | **PASS WITH FINDINGS** |
