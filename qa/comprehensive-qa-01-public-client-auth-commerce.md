# Comprehensive QA Plan — Document 1 of 3  
## Public Client: Discovery, Auth, Email, Wear Commerce, and Cross-Cutting Quality

**Product:** PotteryMania (Next.js application)  
**Scope:** End-user and guest experiences that are *not* studio-vendor dashboards and *not* `/admin`. Includes marketing surfaces, authentication lifecycle, public wear shop, cart and checkout touchpoints where applicable, error handling, and platform-wide UX consistency.  
**Audience:** QA engineers, release managers, and engineering leads validating launch readiness.  
**Related documents:** `comprehensive-qa-02-studio-vendor-dashboard.md` (per-studio vendor), `comprehensive-qa-03-admin-hyperadmin-console.md` (internal console).

---

### Live production site (how to use this plan on the real deployment)

**Production URL:** Run checks against the **exact HTTPS origin** configured in production (`AUTH_URL` / `NEXTAUTH_URL` — see `.env.example`: origin only, no path; a mismatched auth URL breaks sign-in and callbacks). If you use a custom domain or `www`, use that consistently in bookmarks and tests so cookies and CSRF same-origin checks match `lib/csrf-protection` expectations.

**What “live” changes in this document**

| Category | On live production | Prefer staging / preview instead |
|----------|--------------------|-----------------------------------|
| **Sections 23 (load/chaos), L-*, K-4 webhook blocking** | **Do not run** | Full load, chaos, and webhook tampering |
| **Stripe test cards (`4242…`), K-1–K-3 as written** | Only if prod is still in **Stripe test mode** (rare for real “live”) | Always for normal live + live keys |
| **A-5 brute-force, S-2 IDOR guessing, XSS payloads (W-4)** | **Do not run** without security sign-off; can harm users, trigger WAF, or create fraud signals | Controlled security test environment |
| **DB role flips, `suspendedAt` (matrix §2), email enumeration probes** | **Do not** mutate production data ad hoc | Staging clones or seed DB |
| **Sections G, PDP, cart browse, SEO-1/2 read-only, AN-1 read-only, §14 smoke without completing pay** | **Allowed** read-only / light interaction | — |
| **Real purchase (K-1)** | Allowed only with **real money** policy: use smallest SKU, refund process documented, finance aware | — |

**Live-safe smoke (≈5–10 minutes, no money)** — maps to routes shipped in the app build:

1. `GET /` — **G-1** (hero, footer, console clean).  
2. `GET /wear/shop` — **W-1** listing (filters if present).  
3. Open one **wear PDP** from shop — **P-1–P-4** (gallery, variants, 404 on bad slug).  
4. `GET /cart` — add line then remove — **C-1** (no checkout).  
5. `GET /register`, `GET /login`, `GET /forgot-password` — **A-*** form load, validation hints, no 500.  
6. `GET /robots.txt`, `GET /sitemap.xml` — **SEO-1** (robots); sitemap loads.  
7. `GET /api/ready` — expect JSON `ok` for ops ping (not a substitute for full health).  
8. Optional: `/studios`, `/classes`, `/marketplace`, `/pricing`, `/privacy`, `/terms` — discovery and legal links from chrome.

**Live checkout (real money)** — If you must validate **K-*** end-to-end on production: use one designated **QA card / real micro-purchase** per policy, then **refund** through Stripe Dashboard or admin flow; confirm webhook-driven order state and email **N-1**. Never use load scripts or parallel “double submit” abuse tests against production payment endpoints.

**Observability on live (§27)** — For production defects, prefer **RUM**, **Sentry**, Stripe Dashboard, and server logs with **correlation IDs**; avoid downloading full HARs with PII onto unsecured machines.

**After updates to this doc** — Commit and deploy docs with the app, or keep in repo only; QA runners should always note **which hostname** and **build SHA** they executed against.

---

### 1. Purpose and test philosophy

This document treats the public-facing product as a **contract between brand promise and behavior**. Every scenario assumes you can observe network calls (browser devtools), server logs where available, and database or Stripe dashboard state when validating money movement. Prefer **deterministic seeds** in non-production environments: known SKUs, known coupon codes, and test cards from Stripe’s documentation.

Testing should combine **exploratory sessions** (time-boxed, charter-driven) with **scripted regression** (repeatable checklists before each release). Record **severity** for deviations: blocker (cannot complete purchase or auth), major (workaround exists but harms trust or revenue), minor (cosmetic or rare), and suggestion (improvement only).

---

### 2. Environments, accounts, and data prerequisites

**Environments:** Staging should mirror production feature flags, webhook endpoints, and email provider configuration (or a safe sandbox). Never run destructive financial tests on production without explicit approval.

**Account matrix (minimum):**

| Persona | Email verified? | Role | Notes |
|--------|------------------|------|-------|
| New visitor | N/A | none | Incognito, no cookies |
| Registered shopper | yes | `user` (or equivalent) | Can access wear flows |
| Registered shopper | no | same | Email verification edge cases |
| Suspended user | yes | same with `suspendedAt` set in DB | Session invalidation |

**Browsers / devices:** Latest Chrome, Safari (iOS), Firefox; one **low-end Android** profile for performance; one **320px width** viewport for layout stress.

**Stripe:** Use test mode keys; document which **PaymentIntent** or **Checkout Session** patterns the app uses so QA aligns expectations with webhook latency.

---

### 3. Global navigation, chrome, and first impressions

**Scenario G-1 — Homepage and brand trust**  
**Steps:** Load `/` cold (hard refresh). Observe LCP and cumulative layout shift. Scroll through hero, featured content, and footer links.  
**Expected:** No broken images; legal and support links resolve; no console errors attributable to first-party code.  
**Negative:** Disable JavaScript partially (if applicable) and confirm graceful degradation or clear messaging.

**Scenario G-2 — Deep link resilience**  
**Steps:** Bookmark a nested public route (e.g. a wear category or product slug). Clear site data. Re-open bookmark.  
**Expected:** Page loads or redirects to a sensible recovery path (login only if required).  
**Edge:** Trailing slashes, mixed case in slugs, and legacy URLs from older campaigns.

**Scenario G-3 — Header and navigation on scroll**  
**Steps:** On long PDP (product detail) pages, scroll past fold; verify sticky or collapsing header behavior.  
**Expected:** CTAs remain reachable; focus order remains logical for keyboard users.

**Scenario G-4 — Mobile navigation**  
**Steps:** Open hamburger or equivalent; navigate three levels deep; close without navigation.  
**Expected:** Focus trap released; `aria-expanded` states correct if applicable.

**Suggested improvements:** Add a **visual regression** suite (Playwright + screenshots) for header/footer on three breakpoints. Instrument **Core Web Vitals** in staging with RUM to catch regressions before production.

---

### 4. Authentication: register, login, logout, password reset

The application’s session model should be validated against **role changes from database** (not JWT-only), so QA must include a server-side role flip while the browser session remains open.

**Scenario A-1 — Happy path registration**  
**Steps:** Navigate to register. Submit valid email, password meeting policy, and any required fields.  
**Expected:** User created; appropriate redirect; verification email sent if enabled.  
**Verify:** Database row exists; no duplicate welcome emails on double-submit.

**Scenario A-2 — Duplicate email**  
**Steps:** Register with an email that already exists.  
**Expected:** Safe, non-enumerating error message; HTTP status consistent with API design.

**Scenario A-3 — Weak password / validation**  
**Steps:** Submit under-minimum password, mismatched confirmation, empty fields.  
**Expected:** Inline validation before submit where possible; server validation on bypass attempts.

**Scenario A-4 — Login success and persistence**  
**Steps:** Log in with “remember me” if present; close tab; reopen within session TTL.  
**Expected:** Session behavior matches product spec.

**Scenario A-5 — Wrong password lockout or throttling**  
**Steps:** Enter wrong password repeatedly (document count).  
**Expected:** Rate limiting or account protection without permanent lock without recovery path.

**Scenario A-6 — Forgot password**  
**Steps:** Request reset for valid and invalid emails.  
**Expected:** No email enumeration; reset link expires; token single-use.

**Scenario A-7 — Logout everywhere**  
**Steps:** Log in on two browsers; log out from one; attempt actions from the other.  
**Expected:** Behavior matches security model (session revocation vs local-only logout).

**Scenario A-8 — OAuth / social login (if enabled)**  
**Steps:** Complete provider flow; disconnect at provider; retry login.  
**Expected:** Clear error or re-link path.

**Suggested improvements:** Publish an **internal runbook** for “session stuck” (clear cookies, revoke sessions). Add **E2E tests** for register + login smoke on CI. Log **structured auth failures** with correlation IDs for support.

---

### 5. Email verification and resend flows

**Scenario E-1 — Unverified user gated experience**  
**Steps:** Register, skip clicking email, attempt wear checkout or gated feature.  
**Expected:** Banner or modal explains next step; resend is rate-limited.

**Scenario E-2 — Resend verification**  
**Steps:** Trigger resend multiple times rapidly.  
**Expected:** Friendly backoff; no duplicate spam.

**Scenario E-3 — Click expired or malformed token**  
**Steps:** Tamper with token in URL.  
**Expected:** Clear recovery: request new email.

**Suggested improvements:** Add **admin-visible** verification status only where privacy policy allows. Track **verification funnel** metrics (registered → verified → first purchase).

---

### 6. Wear shop: listing, filters, search, and pagination

**Scenario W-1 — Category listing**  
**Steps:** Open `/wear/shop` (or equivalent). Apply category filters; sort by price or newness if available.  
**Expected:** URL reflects filter state (shareable); back button restores state.

**Scenario W-2 — Empty catalog branch**  
**Steps:** Use seed data with zero products in a category.  
**Expected:** Helpful empty state; no broken grid.

**Scenario W-3 — Large catalog performance**  
**Steps:** Load category with 200+ items; scroll quickly.  
**Expected:** Virtualization or pagination prevents main-thread jank.

**Scenario W-4 — XSS and injection in search**  
**Steps:** Search for `<script>`, SQL-like fragments, extremely long strings.  
**Expected:** Escaped output; server rejects abusive payloads.

**Suggested improvements:** **Server-driven** filter state for SEO. Add **JSON-LD** validation for product rich results in Search Console tests.

---

### 7. Product detail page (PDP)

**Scenario P-1 — Media gallery**  
**Steps:** Swipe images on mobile; keyboard arrows on desktop.  
**Expected:** Correct active image; lazy loading does not flash wrong image.

**Scenario P-2 — Variant selection**  
**Steps:** Choose size, glaze, or other variant dimensions.  
**Expected:** Price updates; add-to-cart uses correct SKU.

**Scenario P-3 — Out of stock**  
**Steps:** Select variant that is out of stock.  
**Expected:** CTA disabled or waitlist path; no checkout.

**Scenario P-4 — Slug typos**  
**Steps:** Request non-existent slug.  
**Expected:** 404 page with navigation back to shop.

**Suggested improvements:** **Structured product schema** parity with cart line items. **Breadcrumb** consistency from PDP back to category.

---

### 8. Cart, promotions, and session cookies

**Scenario C-1 — Add / remove / quantity**  
**Steps:** Add multiple SKUs; change quantities; remove last item.  
**Expected:** Cart empty state; subtotal math correct including tax display policy.

**Scenario C-2 — Cart persistence**  
**Steps:** Add items; close browser; reopen within cookie lifetime.  
**Expected:** Cart restored or explicit message if not.

**Scenario C-3 — Concurrent tabs**  
**Steps:** Modify cart in two tabs.  
**Expected:** Last-write-wins or merge policy documented; no silent data loss.

**Scenario C-4 — Coupons**  
**Steps:** Apply valid, expired, stackable vs non-stackable coupons.  
**Expected:** Clear error messages; order totals match server calculation.

**Suggested improvements:** **Idempotency keys** on checkout API calls. Client-side **optimistic UI** with rollback on failure.

---

### 9. Checkout and payments (public lens)

Even if Stripe Checkout is hosted, QA validates **return URLs**, **cancel URLs**, and **webhook-driven order creation**.

**Scenario K-1 — Happy path card**  
**Steps:** Checkout with Stripe test card `4242…`.  
**Expected:** Success page; confirmation email; order visible in user history if applicable.

**Scenario K-2 — Declined card**  
**Steps:** Use Stripe’s decline test numbers.  
**Expected:** User can retry without duplicate charges; cart state sane.

**Scenario K-3 — 3D Secure**  
**Steps:** Use authentication-required test card.  
**Expected:** Challenge completes; no stuck spinner.

**Scenario K-4 — Webhook delay simulation**  
**Steps:** Complete payment; temporarily block webhooks in staging (if safe harness exists).  
**Expected:** UI explains “processing” vs “failed”; reconciliation job runs.

**Scenario K-5 — Double submit**  
**Steps:** Mash “Pay” button.  
**Expected:** Single charge; UI disables duplicate submission.

**Suggested improvements:** **Stripe Customer Portal** link in account area. **Charge lookup** by client reference for support tooling.

---

### 10. Error boundaries, 404, and global error page

**Scenario X-1 — Simulated render error**  
**Steps:** In staging only, trigger known error route if exists.  
**Expected:** `error.tsx` boundary; link home; no sensitive stack traces to users.

**Scenario X-2 — Network offline**  
**Steps:** Use devtools offline mode mid-checkout.  
**Expected:** Actionable retry messaging.

**Suggested improvements:** **Correlation ID** surfaced on error UI for support tickets.

---

### 11. Accessibility (WCAG-oriented smoke)

**Scenario AC-1 — Keyboard-only purchase path**  
**Steps:** Tab from header to PDP to cart to checkout without mouse.  
**Expected:** Visible focus; no keyboard traps.

**Scenario AC-2 — Screen reader labels**  
**Steps:** VoiceOver/NVDA on cart and forms.  
**Expected:** Buttons not labeled “button” only; errors announced.

**Scenario AC-3 — Color contrast**  
**Steps:** Audit primary text on warm stone / brown chrome (recent theme direction).  
**Expected:** WCAG AA for body text on backgrounds.

**Suggested improvements:** Automated **axe** checks in CI on critical routes.

---

### 12. Security and abuse scenarios (public)

**Scenario S-1 — CSRF on state-changing routes**  
**Steps:** Validate POSTs use appropriate tokens or SameSite cookies per framework defaults.

**Scenario S-2 — IDOR on user-specific APIs**  
**Steps:** As User A, attempt to fetch User B order IDs by guessing UUIDs.  
**Expected:** 404 or 403.

**Scenario S-3 — Content Security Policy**  
**Steps:** Review CSP headers for inline script violations in production build.

**Suggested improvements:** **Bug bounty** readiness checklist. Periodic **dependency audit**.

---

### 13. Analytics and consent

**Scenario AN-1 — Page views**  
**Steps:** Navigate main funnels; verify events in debug mode.

**Scenario AN-2 — Consent banner**  
**Steps:** Reject non-essential; verify tags do not load against policy.

**Suggested improvements:** Single **event naming convention** document shared with marketing.

---

### 14. Regression pack (quick daily smoke)

1. Load `/` and `/wear/shop`.  
2. Register new user; log out; log in.  
3. Add item; open cart; begin checkout; cancel.  
4. Complete tiny test purchase in Stripe test mode.  
5. Verify email path if enabled.

---

### 15. Cross-document dependencies

Studio-specific **public studio pages** (if any) may overlap with vendor-managed content; validate **cache invalidation** when vendor updates inventory. Hyperadmin **feature flags** can disable public modules—coordinate with Document 3 before assuming availability.

---

### 16. Consolidated improvement backlog (public)

1. **Playwright E2E** for auth + one wear purchase weekly in CI.  
2. **Synthetic monitoring** on `/` and `/wear/shop` from two regions.  
3. **Feature flag matrix** printed per release (what QA must toggle).  
4. **Support macros** tied to error correlation IDs.  
5. **Performance budgets** enforced in CI (bundle size + LCP).  
6. **Localization readiness** audit even if English-only today (string extraction, date formats).  
7. **PDF receipt** or downloadable invoice if B2B buyers exist.  
8. **Gift cards** full lifecycle if product roadmap includes them.  
9. **Return policy** deep links from PDP and checkout footer.  
10. **Session expiry** proactive modal before losing long checkout forms.

---

### 17. Appendix — scenario index (quick lookup)

| ID | Area |
|----|------|
| G-* | Global / chrome |
| A-* | Auth |
| E-* | Email verification |
| W-* | Wear listing |
| P-* | PDP |
| C-* | Cart |
| K-* | Checkout |
| X-* | Errors |
| AC-* | Accessibility |
| S-* | Security |
| AN-* | Analytics |

---

### 18. Extended scenarios — studio discovery and public booking (if exposed)

Many marketplaces surface **studio profiles** or **experience booking** to guests before any vendor-dashboard login. Even when booking is initiated from a studio subdomain or path, QA still classifies it as **public** if the actor is unauthenticated or a generic shopper.

**Scenario B-1 — Browse studios without account**  
**Steps:** From marketing entry points, open studio list or map view. Filter by city, price band, or rating if present.  
**Expected:** Pagination or infinite scroll remains stable; map markers match list results.

**Scenario B-2 — Studio detail from cold traffic**  
**Steps:** Open a studio page from an external referrer (simulated `Referer` header if testing API).  
**Expected:** Social preview image and title match studio branding; no leaked draft content.

**Scenario B-3 — Guest checkout for an experience**  
**Steps:** Select slot, proceed as guest with email only (if supported).  
**Expected:** Confirmation references studio name, timezone, and cancellation policy.

**Scenario B-4 — Timezone correctness**  
**Steps:** Book from a browser timezone different from studio timezone.  
**Expected:** Displayed local times unambiguous (include offset or city label).

**Scenario B-5 — Capacity and oversell**  
**Steps:** Two users concurrently select last seat (use two browsers or scripted concurrency in staging).  
**Expected:** One succeeds; other receives clear “no longer available” without partial charges.

**Suggested improvements:** **Waitlist** capture when full. **ICS calendar** attachment on confirmation emails.

---

### 19. SEO, metadata, and crawl behavior

**Scenario SEO-1 — Robots and admin separation**  
**Steps:** Fetch `/robots.txt`; verify `/admin` disallowed or noindexed per `metaAdminPage` patterns.  
**Expected:** Admin layout metadata indicates non-indexing for internal console routes.

**Scenario SEO-2 — Canonical URLs**  
**Steps:** Open duplicate paths (`/wear/shop/` vs `/wear/shop`).  
**Expected:** Canonical tag points to preferred URL.

**Scenario SEO-3 — Soft 404 detection**  
**Steps:** Request invalid slug returning 200 with “not found” body (anti-pattern).  
**Expected:** True HTTP 404 for missing resources.

**Suggested improvements:** Automated **hreflang** checks if multi-region launches.

---

### 20. Notifications, transactional email, and SMS (if any)

**Scenario N-1 — Order confirmation content**  
**Steps:** Complete purchase; inspect email HTML in multiple clients (Gmail web, Outlook, mobile Mail).  
**Expected:** Responsive layout; correct currency symbol; links use HTTPS.

**Scenario N-2 — Link expiration**  
**Steps:** Use “view order” link after long delay beyond token TTL.  
**Expected:** Re-auth path, not raw 500.

**Scenario N-3 — Unsubscribe compliance**  
**Steps:** For marketing lists, verify one-click unsubscribe and headers.

**Suggested improvements:** **Plain-text multipart** for all transactional mail. **Preview text** QA checklist per template.

---

### 21. Internationalization, locale, and formatting

**Scenario I-1 — Currency display without multi-currency settlement**  
**Steps:** Browser locale set to region using different currency symbol than settlement.  
**Expected:** Clear labeling that checkout settles in platform currency.

**Scenario I-2 — Date and time formats**  
**Steps:** Compare short vs long date formats on receipts and booking emails.

**Scenario I-3 — Right-to-left (RTL) readiness**  
**Steps:** Force `dir=rtl` in devtools on forms (future-proofing).  
**Expected:** No overlapping labels; document gaps.

**Suggested improvements:** Central **formatting utilities** tested independently of UI.

---

### 22. Content management and CMS-driven pages

**Scenario CMS-1 — Rich text sanitization**  
**Steps:** If editors can embed HTML, attempt script tags in staging.  
**Expected:** Stripped or escaped consistently.

**Scenario CMS-2 — Draft vs published**  
**Steps:** Publish toggle on marketing page; hit CDN cache.  
**Expected:** Invalidation within SLA; stale content documented if edge cached.

**Suggested improvements:** **Preview mode** token for stakeholders before publish.

---

### 23. Load, stress, and chaos (staging-only)

**Scenario L-1 — Spike on launch announcement**  
**Steps:** Load test `/` and `/wear/shop` with gradual ramp to agreed RPS.  
**Expected:** Error rate under threshold; autoscaling triggers documented.

**Scenario L-2 — Database connection saturation**  
**Steps:** Coordinate with infra to observe pool exhaustion symptoms.  
**Expected:** Graceful degradation, not cascading 500s.

**Scenario L-3 — Third-party outage**  
**Steps:** Simulate Stripe or email provider timeout.  
**Expected:** User messaging and retries; dead-letter or queue visibility for engineers.

**Suggested improvements:** **Circuit breakers** with user-visible status page integration.

---

### 24. Legal, privacy, and compliance touchpoints

**Scenario LP-1 — Privacy policy and terms version**  
**Steps:** Confirm version date in footer matches latest counsel-approved copy.

**Scenario LP-2 — Cookie policy linkage**  
**Steps:** From consent banner, open policy; accept and reject paths recorded.

**Scenario LP-3 — Age gating**  
**Steps:** If products imply age restrictions, verify gate before purchase.

**Suggested improvements:** **Data export** self-service for GDPR-style requests if in scope.

---

### 25. Release gate checklist (sign-off block)

Before marking the public client “green” for a release candidate, assign owners to each line:

- [ ] Smoke regression pack (Section 14) green on staging.  
- [ ] Auth and checkout E2E green in CI within last 24 hours.  
- [ ] No open **blocker** defects in wear checkout.  
- [ ] Stripe webhooks observed for test purchases in staging dashboard.  
- [ ] Error rate in logs below agreed threshold for 24h soak.  
- [ ] Performance budgets met on `/` and primary PDP template.  
- [ ] Accessibility smoke completed on one mobile screen reader.  
- [ ] Security spot checks (CSRF, IDOR) complete for new endpoints in this release.  
- [ ] Rollback plan documented (previous deployment tag, DB migration reversibility).

---

### 26. Handoff to studio-vendor QA (Document 2)

When a public defect touches **studio-owned inventory** (wrong stock, wrong image), reproduce **both** as guest and as logged-in vendor to bisect whether bug is cache, authorization, or data entry. Attach **studio ID**, **product ID**, and **request correlation IDs** in tickets.

---

### 27. Observability expectations for QA engineers

Before closing any defect, capture **HAR files** (redacted), **timestamp in UTC**, **build SHA**, and **feature flag snapshot**. When logs show `getSessionUser` failures, distinguish **database outages** from **suspended users** by verifying row state in read-only replica tools. For intermittent checkout failures, correlate **client PaymentIntent id** with Stripe dashboard events within a five-minute window. This discipline reduces “cannot reproduce” cycles and shortens time-to-fix during launch weekends when leadership expects hourly updates.

---

### 28. Partner and embed scenarios (future-facing)

If the roadmap includes **embedded widgets** or **affiliate deep links**, extend this document with scenarios for `postMessage` origin validation, iframe click-jacking mitigations, and attribution persistence across redirects. Until those features ship, keep a stub charter so QA capacity is reserved before launch crunch, and record any third-party SDK version upgrades that might alter cookie or storage behavior seen by end users.

---

*End of Document 1. Maintain this file alongside release tags. Update when routes or Stripe integration patterns change.*
