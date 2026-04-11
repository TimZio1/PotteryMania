# Live Smoke Report — 2026-04-11

## Scope

Production smoke run against `https://potterymania.com`, implemented from the live smoke plan and mapped back to `qa/comprehensive-qa-01-public-client-auth-commerce.md`.

## Run Metadata

- Run timestamp: `2026-04-11T15:58:09.5627826+03:00`
- Target origin: `https://potterymania.com`
- Railway project: `POTTERYMANIA`
- Railway environment: `production`
- Railway service: `PotteryMania`
- `/api/ready` payload: `{"ok":true,"service":"potterymania"}`
- Playwright command: `npx playwright test tests/e2e/smoke --project=chromium`
- Playwright summary: `20 passed, 2 skipped, 0 failed`
- HTTP audit artifact: `qa/evidence/functionality/live-http-audit-2026-04-11.json`

## Summary

The live smoke run succeeded overall. Core public routes, auth entry points, customer journeys, vendor/admin dashboard access, and the public wear catalog all loaded successfully on production. No Playwright smoke failures occurred.

Two checks were skipped because production environment data was intentionally incomplete for those paths:

1. `checkout.spec.ts` was skipped because `TEST_EXPERIENCE_ID` was not configured in `.env.local`, so the booking-to-checkout-session flow could not target a known live experience.
2. `mobile-nav-auth.spec.ts` was skipped because the current production test account/session shape did not satisfy that specific mobile navigation precondition at runtime.

The largest non-blocking finding from the HTTP audit is that the audited production responses did not expose the planned security headers:

- `X-Frame-Options`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Strict-Transport-Security`

These are not smoke blockers for the user flows exercised here, but they are important hardening gaps and should be reviewed.

## HTTP Audit Results

The following production routes returned the expected status:

| Route | Expected | Actual | Result |
|------|----------|--------|--------|
| `/` | `200` | `200` | Pass |
| `/wear/shop` | `200` | `200` | Pass |
| `/wear/abstract-design-relaxed-fit-unisex-organic-t-shirt` | `200` | `200` | Pass |
| `/wear/nonexistent-slug-404` | `404` | `404` | Pass |
| `/register` | `200` | `200` | Pass |
| `/login` | `200` | `200` | Pass |
| `/forgot-password` | `200` | `200` | Pass |
| `/pricing` | `200` | `200` | Pass |
| `/privacy` | `200` | `200` | Pass |
| `/terms` | `200` | `200` | Pass |
| `/robots.txt` | `200` | `200` | Pass |
| `/sitemap.xml` | `200` | `200` | Pass |
| `/api/ready` | `200` | `200` | Pass |

Additional audit notes:

- `/robots.txt` contained the expected `Disallow: /admin` rule.
- `/api/ready` returned `ok: true`.
- The audited responses did not include the target security headers listed above.

## Playwright Smoke Results

### Passed

| Spec | Result | QA doc mapping |
|------|--------|----------------|
| `auth.spec.ts` negative login | Pass | `A-2`, `A-5` style validation/no redirect behavior |
| `auth.spec.ts` login and session | Pass | `A-4`, `A-7` |
| `auth.spec.ts` mobile sign-in form | Pass | `A-4`, mobile auth sanity |
| `booking.spec.ts` booking UI mobile | Pass | `B-3`, `B-4` page reachability |
| `booking.spec.ts` class booking to cart | Pass | `B-3`, `C-1` |
| `early-access.spec.ts` redirect for anonymous | Pass | production redirect sanity |
| `early-access.spec.ts` POST closure | Pass | legacy flow closure validation |
| `early-access.spec.ts` mobile legacy route | Pass | route continuity on mobile |
| `form-actions.spec.ts` legacy catalog redirects | Pass | `G-2`, legacy discovery redirect expectations |
| `journeys.spec.ts` customer protected route | Pass | `A-4`, protected route access |
| `journeys.spec.ts` customer public routes reachable | Pass | `G-1`, `W-1`, public route reachability |
| `journeys.spec.ts` vendor dashboard reachability | Pass | Document 2 overlap; tenant dashboard smoke |
| `journeys.spec.ts` hyperadmin route reachability | Pass | Document 3 overlap; `/admin` smoke |
| `product-create.spec.ts` vendor creates draft product | Pass | vendor content mutation path |
| `product-create.spec.ts` mobile product form | Pass | vendor mobile workflow sanity |
| `routes.spec.ts` public marketing and auth routes | Pass | `G-1`, `G-2` |
| `routes.spec.ts` dashboard and cart require session | Pass | protected route enforcement |
| `routes.spec.ts` admin route | Pass | `/admin` gate and access behavior |
| `routes.spec.ts` legacy discovery redirects away | Pass | `G-2`, catalog redirect behavior |
| `routes.spec.ts` authenticated dashboard loads | Pass | auth/session continuity |

### Skipped

| Spec | Reason | QA doc mapping |
|------|--------|----------------|
| `checkout.spec.ts` booking line to Stripe session URL | `TEST_EXPERIENCE_ID` not configured, so no known live experience target was available | `K-1` partial |
| `mobile-nav-auth.spec.ts` authenticated burger menu flow | runtime skip condition triggered for the authenticated mobile-nav flow | `G-4`, `A-4` mobile |

## Scenario Coverage Against Document 1

### Covered directly

- `G-1` Homepage and primary public route reachability
- `G-2` Deep-link and legacy route resilience
- `A-4` Login success and persistence
- `A-7` Logout / protected route enforcement after sign-out
- `B-3` Public booking reachability and booking-to-cart behavior
- `B-4` Experience page render path on mobile
- `C-1` Cart line creation from booking flow
- `P-4` Bad slug returns `404`
- `SEO-1` `robots.txt` review

### Partially covered

- `K-1` Checkout init was only partially covered because the existing spec stops at generating a Stripe Checkout session URL and was skipped in this run due to missing `TEST_EXPERIENCE_ID`.
- `G-4` Mobile navigation was only partially covered because the authenticated menu interaction test skipped.

### Not covered in this live smoke

The following document areas remain out of scope for this specific run and still need either staging or a separate controlled production pass:

- `E-*` Email verification and resend flows
- `K-2` to `K-5` payment decline, 3DS, webhook delay, and double-submit handling
- `X-*` explicit error boundary and offline-mode testing
- `AC-*` accessibility validation beyond route reachability
- `S-*` security abuse scenarios
- `AN-*` analytics/consent verification
- `CMS-*`, `L-*`, `LP-*`, and other staging-oriented sections

## Findings

### 1. Production responses are missing common hardening headers

Observed as empty across the audited routes:

- `X-Frame-Options`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Strict-Transport-Security`

Impact:

- This does not break the smoke paths exercised.
- It is still a platform hardening gap and should be reviewed as part of security and edge config.

### 2. Live checkout coverage is incomplete without a stable production test experience id

`checkout.spec.ts` is written to require `TEST_EXPERIENCE_ID`. Because that value was not available from Railway variables, the run could not validate the checkout-session creation path on a real live experience.

Impact:

- Public production checkout is not fully verified by this run.
- The rest of the smoke suite still validates route reachability, auth, vendor/admin access, and public catalog behavior.

### 3. Current Railway production variables expose only hyperadmin credentials, not a dedicated customer/vendor smoke account

The production-linked variables include seeded hyperadmin credentials but do not include dedicated `TEST_EMAIL`, `TEST_PASSWORD`, vendor, or customer smoke identities. The run reused the available account to maximize coverage, and several route checks still passed, but this is not ideal long-term.

Impact:

- Coverage is weaker than it should be for role-specific public/customer flows.
- A dedicated smoke account matrix would make the suite safer and more deterministic.

## Recommended Follow-ups

1. Add a dedicated production-safe smoke identity set to Railway:
   - `TEST_EMAIL`
   - `TEST_PASSWORD`
   - `TEST_VENDOR_EMAIL`
   - `TEST_VENDOR_PASSWORD`
   - `TEST_ADMIN_EMAIL`
   - `TEST_ADMIN_PASSWORD`

2. Add a stable live `TEST_EXPERIENCE_ID` so `checkout.spec.ts` can exercise the Stripe session creation path on every run.

3. Review middleware / platform / reverse-proxy configuration so production emits:
   - `Strict-Transport-Security`
   - `X-Content-Type-Options`
   - `Referrer-Policy`
   - either `X-Frame-Options` or an equivalent CSP `frame-ancestors` policy

4. If true end-to-end live purchase testing is required, add a separate manual or gated automation path that explicitly completes hosted Stripe Checkout and then verifies refund workflow.

## Final Status

- Overall status: `PASS WITH FOLLOW-UPS`
- Smoke blockers found: `0`
- High-priority follow-ups: `2`
  - missing production security headers
  - missing stable live checkout target (`TEST_EXPERIENCE_ID`)
