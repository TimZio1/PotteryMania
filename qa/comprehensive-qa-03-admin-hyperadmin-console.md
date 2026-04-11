# Comprehensive QA Plan — Document 3 of 3  
## Platform Admin & Hyperadmin Console: `/admin`, Finance Guard, Auditability, and Governance

**Product:** PotteryMania internal console (`/admin` layout)  
**Scope:** All **platform operator** workflows. The codebase distinguishes **`admin`** and **`hyper_admin`** at the database role level (`UserRole` in Prisma). Both roles satisfy `isAdminRole()` and may reach most `/admin` navigation entries, while **financial and session-identity critical actions** require **`hyper_admin`** via `requireHyperAdminUser()` (see `lib/auth-session.ts`). QA must validate **least privilege**, **impersonation rules**, and **audit coverage** alongside functional correctness.  
**Related:** Documents 1 (public) and 2 (studio vendor). If your organization also ships **separate** “Oktana Hyperadmin” or “Oktana Vendors Pro” applications, treat them as **additional targets**: mirror critical scenarios there and keep this file as the **source of truth** for in-app PotteryMania parity.

---

### 1. Role model and session rules (non-negotiable regression)

**Fact check from code:** `requireAdminUser()` rejects the session when `(session?.user as { impersonatorId?: string })?.impersonatorId` is present—meaning certain **impersonation** sessions must **not** receive admin powers through this guard path. QA should confirm the product intent with engineering: typically impersonation is for **support-as-vendor** views, not for silently wielding `/admin` while impersonating.

**Scenario R-1 — Admin vs hyperadmin menu parity**  
**Steps:** Log in as `admin`; note which pages or actions show “upgrade” or 403. Log in as `hyper_admin`.  
**Expected:** Finance engine and other hyper-only surfaces hidden or blocked for plain admin.

**Scenario R-2 — Downgrade live role**  
**Steps:** While browser session open, change DB role from `hyper_admin` to `admin`; hit a hyper-only API.  
**Expected:** Denied on next request because `getSessionUser` reads DB, not stale JWT alone.

**Scenario R-3 — Suspended admin**  
**Steps:** Set `suspendedAt` on admin user; retry `/admin`.  
**Expected:** Session null; redirect to login or forbidden shell.

**Suggested improvements:** **UI badge** showing effective role and impersonation state in header. **Break-glass** hyperadmin account procedure documented outside the app.

---

### 2. Layout, navigation, and mobile admin shell

The sidebar (`app/admin/layout.tsx`) lists: Executive overview, War room, Notifications, Audit, Users, Studios, Revenue, Features, AI insights, Coupons, Wear products, Wear orders, Wear analytics, Orders, Bookings, Operations, Content, Platform add-ons, Feature bundles, Business templates, Public browse (off), Ceramic categories, Experiments, Reports, System, Settings, Finance engine.

**Scenario L-1 — Deep link auth**  
**Steps:** Unauthenticated user opens `/admin/users`.  
**Expected:** Redirect to sign-in; no JSON leak.

**Scenario L-2 — Mobile nav**  
**Steps:** Use `AdminMobileNav`; traverse to Finance and back.  
**Expected:** Focus management; no trapped scroll.

**Scenario L-3 — Vendor view link**  
**Steps:** Use “Vendor view” shortcut to `/dashboard`.  
**Expected:** Context switch clear; no admin chrome on vendor pages.

**Suggested improvements:** **Command palette** (⌘K) to jump to studio by id or slug.

---

### 3. Executive overview (`/admin`)

**Scenario EO-1 — Widget data freshness**  
**Steps:** Compare counts to underlying list pages (users, studios).  
**Expected:** Known lag documented (cache vs live).

**Scenario EO-2 — Error fallbacks**  
**Steps:** Simulate partial API failure in staging.  
**Expected:** Card-level error boundaries, not blank screen.

**Suggested improvements:** **Configurable date range** globally for dashboard.

---

### 4. War room (`/admin/war-room`)

**Scenario WR-1 — Incident annotations**  
**Steps:** Record note during simulated outage; refresh.  
**Expected:** Persistence and author attribution.

**Scenario WR-2 — Read-only mode**  
**Steps:** If war room triggers feature flags, verify blast radius.

**Suggested improvements:** Integration with **Statuspage** or Slack webhook.

---

### 5. Notifications (`/admin/notifications`)

**Scenario NT-1 — Mark read / bulk read**  
**Steps:** Use `notifications-mark-read` flows at scale (100+).  
**Expected:** Performant; optimistic UI rolls back on failure.

**Scenario NT-2 — Deep link to entity**  
**Steps:** Click notification referencing booking or order.  
**Expected:** Lands on correct admin detail with right `id`.

**Suggested improvements:** **Digest** mode for low-priority notices.

---

### 6. Audit log (`/admin/audit`)

**Scenario AU-1 — Coverage completeness**  
**Steps:** Perform representative mutations: refund, feature toggle, user tag change.  
**Expected:** Rows in `admin_audit_logs` with actor, before/after snapshots where promised.

**Scenario AU-2 — PII in audit payloads**  
**Steps:** Inspect log detail JSON in UI.  
**Expected:** Redacted emails or tokens per policy.

**Scenario AU-3 — Export**  
**Steps:** Export large window; verify CSV row cap or streaming.

**Suggested improvements:** **Immutable log sink** to SIEM (Splunk/Datadog) for compliance regimes.

---

### 7. Users (`/admin/users`, `/admin/users/[id]`)

**Scenario U-1 — Search and pagination**  
**Steps:** Search partial email; verify rate limits.

**Scenario U-2 — User detail actions** (`user-admin-actions.tsx`)  
**Steps:** Suspend, unsuspend, reset password link, role change.  
**Expected:** Confirmation modals; emails sent when appropriate.

**Scenario U-3 — Tags** (`user-admin-tags.tsx`)  
**Steps:** Add/remove tags; verify downstream experiments or cohorts.

**Scenario U-4 — Notes** (`user-admin-notes.tsx`)  
**Steps:** Concurrent edits from two admins.

**Suggested improvements:** **Two-person approval** for role elevation to `hyper_admin`.

---

### 8. Studios (`/admin/studios`, `/admin/studios/[studioId]`)

**Scenario ST-1 — Global studio search**  
**Steps:** Find studio by slug, city, Stripe account id fragment.

**Scenario ST-2 — Studio detail actions** (`studio-admin-detail-actions.tsx`)  
**Steps:** Trigger Connect remediation links; schedule cancellations if billing supports hyperadmin-driven cancel (see `studio-feature-billing` comments referencing hyperadmin).

**Scenario ST-3 — Feature entitlements** (`studio-admin-feature-entitlements.tsx`)  
**Steps:** Toggle add-on; verify vendor dashboard gating (Document 2 §15).

**Suggested improvements:** **Risk score** column (chargeback rate, refund rate).

---

### 9. Revenue (`/admin/revenue`)

**Scenario RV-1 — Aggregation vs Stripe**  
**Steps:** Reconcile totals for a week against Stripe balance transactions.

**Scenario RV-2 — Drill-down**  
**Steps:** Click studio slice; arrives at studio revenue tab.

**Suggested improvements:** **MRR movement** waterfall chart.

---

### 10. Features hub (`/admin/features`)

**Scenario FE-1 — Activation analytics**  
**Steps:** Compare to `admin-feature-analytics` partial daily buckets note in code comments.

**Scenario FE-2 — Dangerous global disable**  
**Steps:** Turn off platform-wide experiment; confirm vendor messaging.

**Suggested improvements:** **Canary** percentage rollout UI.

---

### 11. AI insights (`/admin/ai-insights`)

**Scenario AI-1 — Prompt or tool abuse**  
**Steps:** Attempt exfiltration of other studios’ data via cross-tenant prompts.  
**Expected:** Refusal; logging.

**Suggested improvements:** **Cost caps** per day with auto-off.

---

### 12. Coupons (`/admin/coupons`)

**Scenario CP-1 — Stackability rules**  
**Steps:** Create mutually exclusive coupons; public checkout (Document 1) validation.

**Scenario CP-2 — Abuse limits**  
**Steps:** Per-user redemption caps.

**Suggested improvements:** **Fraud velocity** alerts.

---

### 13. Wear catalog and operations

**Routes:** `/admin/wear-products`, `/admin/wear-products/new`, `/admin/wear-products/[id]`, `/admin/wear-orders`, `/admin/wear-orders/[orderId]`, `/admin/wear-analytics`

**Scenario W-1 — Admin CRUD product**  
**Steps:** Create product; publish; verify public shop.

**Scenario W-2 — Wear order refund panel** (`admin-order-refund-panel`)  
**Steps:** Partial vs full refund; Stripe dashboard correlation.

**Scenario W-3 — Analytics**  
**Steps:** Filters by date; export.

**Suggested improvements:** **Inventory allocation** rules between platform warehouse vs dropship.

---

### 14. Orders and bookings (cross-studio)

**Routes:** `/admin/orders`, `/admin/orders/[id]`, `/admin/bookings`, `/admin/bookings/[id]`

**Scenario OB-1 — Cross-studio search**  
**Steps:** Locate booking by customer email spanning two studios.

**Scenario OB-2 — Refund authorization**  
**Steps:** Attempt refund as `admin` if hyper-only—expect block.

**Suggested improvements:** **Case management** ticket id linkage.

---

### 15. Operations (`/admin/operations`)

**Scenario OP-1 — Queue processing**  
**Steps:** Replay failed jobs if UI exposes controls.

**Suggested improvements:** **SLO dashboard** for webhook lag.

---

### 16. Content (`/admin/content`)

**Scenario CT-1 — Publish pipeline**  
**Steps:** Draft → review → publish with RBAC if split roles exist.

**Suggested improvements:** **Scheduled publish** at local midnight per region.

---

### 17. Platform add-ons & bundles

**Routes:** `/admin/platform-features`, `/admin/feature-bundles`

**Scenario PF-1 — Bundle composition**  
**Steps:** Create bundle; assign price; activate for cohort.

**Scenario PF-2 — Conflict with individual add-ons**  
**Steps:** Ensure pricing rules deterministic.

**Suggested improvements:** **Dependency graph** visualization.

---

### 18. Business templates (`/admin/business-templates`)

**Scenario BT-1 — Save bumps client row state** (per code comment in `business-templates.ts`)  
**Steps:** Edit template; verify vendor template page reflects version bump notice.

**Scenario BT-2 — Preview as studio**  
**Steps:** Impersonate vendor (if allowed) to view draft template—confirm guardrails.

**Suggested improvements:** **Template lint** for missing required fields.

---

### 19. Marketplace admin (`/admin/marketplace`, ranking)

**Routes:** `/admin/marketplace-ranking`, `/admin/marketplace`

**Scenario MK-1 — Ranking drift**  
**Steps:** Change weights; observe browse order on public side if enabled.

**Scenario MK-2 — “Public browse (off)” label**  
**Steps:** Confirm feature flag truly disables browse.

**Suggested improvements:** **Simulation mode** preview ranking without persisting.

---

### 20. Ceramic categories (`/admin/categories`)

**Scenario CG-1 — Reorder tree**  
**Steps:** Drag parent/child; verify wear filters.

**Suggested improvements:** **Import** categories from CSV.

---

### 21. Experiments (`/admin/experiments`)

**Scenario EX-1 — Assignment consistency**  
**Steps:** Same user always gets bucket stable per cookie/device logic.

**Scenario EX-2 — Ethical pause**  
**Steps:** Emergency kill switch.

**Suggested improvements:** **Bayesian monitoring** auto-pause on harm signals.

---

### 22. Reports (`/admin/reports`)

**Scenario RP-1 — Large CSV**  
**Steps:** Export year of data; memory safe.

**Suggested improvements:** **Async email** download link.

---

### 23. System (`/admin/system`, feature flags)

**Scenario SY-1 — Flag flip blast radius**  
**Steps:** Toggle core flag; run Documents 1–2 smoke.

**Scenario SY-2 — Audit of flag changes**  
**Steps:** Appears in audit log with actor.

**Suggested improvements:** **Flag approvals** with TTL.

---

### 24. Settings (`/admin/settings`, commission form)

**Scenario SE-1 — Commission math**  
**Steps:** Change platform commission; run test checkout; verify application fee.

**Scenario SE-2 — Validation bounds**  
**Steps:** Attempt >100% or negative.

**Suggested improvements:** **Effective date** scheduling for commission changes.

---

### 25. Finance engine (`/admin/finance`) — hyperadmin-only surface

**Code expectation:** `requireHyperAdminUser()` gates financial identity operations; finance overview APIs aggregate ledger + snapshots (`lib/finance/overview.ts`). QA must verify **plain `admin` cannot** hit finance APIs (403) while **`hyper_admin` can**.

**Scenario FN-1 — Command center load** (`finance-command-center.tsx`)  
**Steps:** Open finance page; verify cards: balances, unsettled, risk.

**Scenario FN-2 — Payout holds**  
**Steps:** Simulate Stripe risk hold; UI explains vendor impact.

**Scenario FN-3 — Ledger drill-down**  
**Steps:** Click line; verify immutable history.

**Scenario FN-4 — Separation of duties**  
**Steps:** Attempt refund in finance UI vs order UI; document which role can do which.

**Suggested improvements:** **Export to NetSuite** or QuickBooks CSV mapping versioned per month.

---

### 26. Impersonation API (`/api/admin/.../impersonate` contract tests)

The repository includes `admin-impersonate-route.contract.test.ts` ensuring `isAdminRole` gating. QA should still run **manual** impersonation: start as hyperadmin, impersonate vendor, confirm **admin APIs blocked** per `requireAdminUser` impersonator check, and vendor dashboards behave as the target user.

**Scenario IM-1 — Start impersonation**  
**Expected:** Clear banner on vendor session.

**Scenario IM-2 — End impersonation**  
**Expected:** Return to operator account without stale cookies.

**Suggested improvements:** **Time-boxed** impersonation tokens (30 min).

---

### 27. Webhook events (`/admin/webhook-events`)

**Scenario WH-1 — Replay**  
**Steps:** Replay dead letter safely in staging.

**Suggested improvements:** **Signature failure** rate chart.

---

### 28. AI-insights force unlock (`admin-insight-force-unlock-button`)

**Scenario IF-1 — Abuse of force unlock**  
**Steps:** Only hyperadmin (if coded); audit entry mandatory.

**Suggested improvements:** **Reason code** required text field.

---

### 29. Security testing checklist (admin)

- [ ] CSRF on all POST admin actions.  
- [ ] SSRF on any “fetch URL” admin tool.  
- [ ] IDOR on `/api/admin/**` paths with altered ids.  
- [ ] CSV formula injection on exports (`=cmd|`).  
- [ ] Rate limits on user search.  
- [ ] Clickjacking headers on `/admin`.

**Suggested improvements:** Annual **penetration test** scope includes admin console exclusively.

---

### 30. Performance & reliability

**Scenario PR-1 — Cold start heavy page**  
**Steps:** `/admin/studios` with 5k studios.

**Scenario PR-2 — DB connection storms**  
**Steps:** Parallel exports.

**Suggested improvements:** **Read replicas** for reporting queries.

---

### 31. Accessibility (admin dark shell)

**Scenario AC-1 — Contrast on zinc-950**  
**Steps:** Validate WCAG for primary reading text.

**Scenario AC-2 — Focus rings**  
**Steps:** Keyboard traverse sidebar.

**Suggested improvements:** **High-contrast admin** theme toggle.

---

### 32. Disaster and incident runbooks

**Scenario DR-1 — Stripe API global outage**  
**Steps:** Finance page should degrade gracefully.

**Scenario DR-2 — Accidental mass email**  
**Steps:** Kill switch for notifications module.

**Suggested improvements:** **Playbooks** linked inside War room.

---

### 33. External Oktana apps (if deployed)

If **oktana-hyperadmin** or **oktana-vendors-pro** remain in use for certain operators, run **parity smoke**: login, list studios, view order, attempt financial action. Record divergences; long-term improvement is **single console** to reduce duplicate RBAC bugs.

---

### 34. Improvement backlog (admin ecosystem)

1. **Granular permissions** beyond binary admin/hyper_admin (e.g. finance_read vs finance_write).  
2. **Just-in-time** elevation with manager approval.  
3. **Session recording** opt-in for training (privacy reviewed).  
4. **Bulk studio tagging** for cohort communications.  
5. **Anomaly detection** on refund velocity per operator account.  
6. **Customer consent** log viewer for GDPR audits.  
7. **API tokens** for internal automation with scoped scopes.  
8. **Dark/light** theme parity for screenshots in runbooks.  
9. **Change management** integration (Jira auto-task on flag flip).  
10. **Quarterly** access review export of all `hyper_admin` users.

---

### 35. Sign-off checklist (admin readiness)

- [ ] Role matrix scenarios R-1–R-3 pass.  
- [ ] Finance page verified hyperadmin-only.  
- [ ] Impersonation flows audited and bannered.  
- [ ] Audit log captures mutations in §6.  
- [ ] Exports scanned for PII leakage.  
- [ ] Webhook health acceptable for 24h soak.  
- [ ] Mobile nav smoke on top 5 pages.

---

### 36. Governance: segregation of duties narrative

Document which combinations are **forbidden**: the same human should not routinely hold **`hyper_admin`** and **production database** credentials without MFA on both. QA environments should use **distinct** test accounts mirroring production separation. When engineers temporarily grant themselves `hyper_admin` in staging, **reset** roles after testing to avoid accidental assumption of parity with production policy.

---

### 37. Long-form scenario: coordinated refund and feature cancel

**Narrative test (walkthrough):** A studio disputes a double charge after a platform feature subscription renews the same day as a class pack purchase. Hyperadmin opens **Finance engine**, locates duplicate **PaymentIntents**, initiates refund from **Wear orders** panel, then opens **Studios → feature entitlements** to schedule cancellation per billing comment patterns. Concurrently, vendor (Document 2) should see consistent **ledger notes** and **email** without conflicting states. QA validates **audit log** sequence ordering, **Stripe** dashboard final state, and **customer** email wording. **Improvements:** single **case id** threading across admin and vendor UIs.

---

### 38. Long-form scenario: marketplace ranking ethics

Ranking changes can shift studio revenue overnight. Hyperadmin adjusts **marketplace ranking** weights to promote new studios in an underserved city. QA verifies **transparency logs** (why rank changed), **A/B** guardrails in **Experiments**, and **support macros** for studios that drop in rank. **Improvements:** **preview mode** showing rank deltas before commit, and **notification** to affected studios with opt-in explanation links.

---

### 39. Tooling recommendations for QA automation

Adopt **Playwright** projects: `admin-smoke`, `vendor-smoke`, `public-smoke`. Store credentials in CI secrets. Use **contract tests** already present (`admin-api-routes-guard.test.ts` pattern) as gates: every new `app/api/admin/**/route.ts` must reference a guard. Add **visual snapshots** for finance charts only if flakiness controlled (mask dynamic numbers).

---

### 40. Closing coordination

Before production promotion, require **signed** checklist (§35) from QA lead and **on-call** engineering lead. Link this document in the release ticket and archive PDF snapshots of critical admin pages for compliance if your industry requires screenshots per release.

---

### 41. Google Analytics and marketing configuration (hyperadmin surfaces)

If `hyperadmin-google-analytics.tsx` and related sections manage measurement IDs, QA should validate **non-production IDs** on staging, **no PII** pushed into custom dimensions, and **consent mode v2** alignment with the public site (Document 1). **Scenario GA-1:** change property id; verify events within 24h in GA debug view. **Scenario GA-2:** revoke access token; UI surfaces OAuth reconnect without throwing. **Improvements:** **change history** table per GA field with who edited, supporting rollback when a typo silences conversion tracking during a campaign.

---

### 42. Hyperadmin-only sections inventory (living list)

Maintain a **spreadsheet** mirroring navigation labels to **authorization function**: `requireAdminUser` vs `requireHyperAdminUser` vs custom finance guard (`requireFinanceAdmin` in `lib/finance/admin-guard.ts`). Each release, diff routes in `app/api/admin/**` and mark new endpoints for **IDOR** and **role** tests. This living list prevents the classic drift where UI hides a button but API remains open—QA explicitly hits APIs with curl using **admin** cookies then **hyper_admin** cookies and records HTTP codes.

---

### 43. Finance guard edge cases (`requireFinanceAdmin`)

Coordinate with engineering on the exact semantics of **`requireFinanceAdmin`** versus `requireHyperAdminUser`: automated tests in `admin-guard.test.ts` and finance route contract tests mock these guards, but manual QA should still run **boundary** cases such as **`admin`** attempting to download **payout export** and receiving **403**, while **`hyper_admin`** succeeds and the export includes **no full card numbers**. If a **finance_read** role is introduced later, revise this section first before granting access broadly.

---

### 44. Data residency and cross-region admin access

If production ever spans regions, hyperadmin queries might aggregate **EU and US** studios. QA should document whether **personal data** crosses borders in admin CSV exports and whether **audit logs** themselves contain enough PII to trigger **DPA** obligations. **Scenario DRG-1:** export users from EU-only filter; verify file excludes non-EU rows. **Improvements:** **region-tagged** admin accounts that cannot query outside assigned region.

---

### 45. Bulk operations and background jobs

Many admin actions may enqueue **background jobs** (emails, recalculations). **Scenario BK-1:** trigger bulk coupon generation or mass notification; observe job queue depth and completion emails to operators. **Scenario BK-2:** cancel mid-flight if UI supports cancellation; verify partial writes do not corrupt state. **Improvements:** **progress bars** with ETA based on historical durations; **idempotency keys** on bulk POST bodies.

---

### 46. Admin onboarding for new internal employees

**Scenario OB-1:** brand-new `admin` account first login tour; verify links to internal Notion or wiki. **Scenario OB-2:** mistaken assignment of `hyper_admin` to intern account—process to detect via weekly access review (§34 item 10). **Improvements:** **checklist** task system inside `/admin` for first-week operators covering audit, finance read-only shadowing, and impersonation ethics training.

---

### 47. Chaos testing specific to admin mutations

Beyond public chaos, admin chaos includes **double-submit** on destructive actions (studio suspension) and **optimistic locking** when two hyperadmins edit **commission** form concurrently—last write should not silently overwrite without warning if versioning exists. If no versioning, file improvement to add **ETags** or updated_at checks on PATCH requests.

---

### 48. Print and PDF artifacts from admin

Some reports may offer print-friendly layouts. **Scenario PRN-1:** print **audit** page—ensure hundreds of rows paginate rather than freezing the browser. **Scenario PRN-2:** PDF export of finance summary for board meeting; verify numbers match on-screen totals. **Improvements:** **watermark** “CONFIDENTIAL” on PDFs generated from staging vs production with different colors to avoid accidental board packs from wrong environment.

---

### 49. Regression matrix snapshot (admin)

| Surface | Role | Critical tests | Owner |
|---------|------|----------------|-------|
| Finance | hyper_admin | FN-1–FN-4 | |
| Users | admin+ | U-2 suspension | |
| Studios | admin+ | ST-2 payouts | |
| Impersonation | admin+ | IM-1–IM-2 | |
| System flags | hyper_admin? | SY-1 | |

Fill **Role** column with minimum role actually required after verifying code each sprint.

---

### 50. Final improvement themes (strategic)

Consolidate **admin**, **hyperadmin**, and any **external** operator consoles behind unified **identity provider** groups. Invest in **continuous authorization** checks per request rather than static page gating. Build **synthetic transactions** nightly that simulate a purchase, a booking, and a refund across two studios, alerting Slack if any step fails—this catches cross-document integration drift faster than manual quarterly passes alone.

---

*End of Document 3. Update when RBAC, finance modules, or admin navigation structure change.*
