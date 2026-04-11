# Comprehensive QA Plan — Document 2 of 3  
## Studio Vendor Client: Per-Studio Dashboard, Operations, Commerce, and Isolation

**Product:** PotteryMania — vendor-facing experience under `/dashboard` (and nested studio routes)  
**Scope:** Every workflow a **studio owner or operator** performs after authentication, evaluated **per `studioId`**. This includes creating studios, configuring appearance and templates, managing experiences and classes, bookings, students, kiln workflows, products and shop presence, payments and Stripe Connect onboarding, platform **feature add-ons**, analytics, referrals, waitlists, billing against the platform, and newer areas such as **guided** flows where present.  
**Out of scope for this file:** Public guest journeys (Document 1) and internal `/admin` console (Document 3).  
**Roles assumption:** Vendors are standard authenticated users with **membership or ownership** ties to specific studios enforced by API routes (validate **IDOR** aggressively).

---

### 1. Testing principles for multi-tenant SaaS

A studio dashboard is only “correct” if **tenant isolation** holds: Studio A must never read or mutate Studio B’s bookings, payouts, or private student notes. QA should maintain **at least two studios** under different accounts plus **one user who belongs to two studios** to detect accidental cross-tenant leakage in UI lists, CSV exports, and API responses.

Every defect ticket should cite **`studioId`**, **environment**, **user id**, and whether the user is **owner vs collaborator** if the product distinguishes those.

---

### 2. Entry: `/dashboard` hub and studio creation

**Scenario H-1 — First-time vendor empty state**  
**Steps:** Register a new user with no studios; open `/dashboard`.  
**Expected:** Clear call-to-action to create a studio; no broken cards; no server errors in console.

**Scenario H-2 — Create studio wizard**  
**Steps:** Navigate to `/dashboard/studio/new` (or equivalent). Complete required fields: name, address, timezone, contact channels.  
**Expected:** Validation on missing fields; successful creation returns navigable studio workspace.

**Scenario H-3 — Duplicate or profane studio names**  
**Steps:** Attempt restricted names if business rules exist (trademarked terms, empty unicode).  
**Expected:** Server-side validation mirrors client hints.

**Scenario H-4 — Deep link before membership**  
**Steps:** As user with no access, manually browse to `/dashboard/[foreignStudioId]`.  
**Expected:** 404 or access denied page, **not** a partial shell leaking other studio metadata.

**Suggested improvements:** **Progress autosave** on long studio onboarding. **Import wizard** from CSV for large studios migrating from competitors.

---

### 3. Layout, navigation, and cross-device vendor UX

**Scenario N-1 — Studio switcher**  
**Steps:** User belongs to Studio A and B; switch context from dropdown or list.  
**Expected:** All downstream routes update `studioId`; no stale cache showing A’s data while URL shows B.

**Scenario N-2 — Mobile vendor shift**  
**Steps:** Complete a booking action on a phone viewport during a mock “Saturday rush”.  
**Expected:** Tap targets adequate; tables scroll or stack; critical actions pinned.

**Scenario N-3 — Keyboard shortcuts**  
**Steps:** If calendar supports shortcuts, verify they do not conflict with browser defaults.

**Suggested improvements:** **Offline queue** for attendance marking when Wi-Fi drops in studio backrooms.

---

### 4. Studio settings and profile integrity

**Route focus:** `/dashboard/[studioId]/settings` and related server actions.

**Scenario S-1 — Update public-facing description**  
**Steps:** Change description, save, refresh public studio page if wired.  
**Expected:** Propagation within cache TTL; no markdown injection.

**Scenario S-2 — Contact email change**  
**Steps:** Update notification email; trigger test notification.  
**Expected:** Old inbox stops receiving operational alerts unless CC policy says otherwise.

**Scenario S-3 — Danger zone actions**  
**Steps:** Archive or delete studio if supported; confirm modals.  
**Expected:** Typed confirmation phrase; background jobs cancel future bookings per policy.

**Scenario S-4 — Timezone change mid-season**  
**Steps:** Shift timezone with existing future bookings.  
**Expected:** Documented behavior: either absolute instant preservation or shifted local times—must match product copy emailed to customers.

**Suggested improvements:** **Audit trail visible to vendor** for settings changes (who/when).

---

### 5. Appearance and branding

**Route focus:** `/dashboard/studio/[studioId]/appearance` (nested layout under `studio`).

**Scenario AP-1 — Logo upload**  
**Steps:** Upload PNG, oversized JPEG, SVG if allowed, corrupt file.  
**Expected:** Size/type validation; CDN URL returned; rollback on failure.

**Scenario AP-2 — Color tokens**  
**Steps:** Pick brand colors; preview customer-facing header.  
**Expected:** Contrast remains readable; warm stone / brown chrome theme coherence with marketplace.

**Scenario AP-3 — Reset to default**  
**Steps:** Apply changes then reset.  
**Expected:** Deterministic default bundle.

**Suggested improvements:** **Theme presets** per business template (ties to hyperadmin templates in Document 3).

---

### 6. Business templates (studio-facing)

**Route focus:** `/dashboard/[studioId]/template`

**Scenario T-1 — Apply template**  
**Steps:** Select an available template; confirm overwrite warnings.  
**Expected:** Experiences, copy blocks, or defaults update per template contract.

**Scenario T-2 — Template version bump from platform**  
**Steps:** Simulate hyperadmin publishing template v2 while studio on v1.  
**Expected:** In-app notice; optional upgrade path without silent destructive edits.

**Suggested improvements:** **Diff preview** before applying template changes.

---

### 7. Classes and curriculum-like structures

**Route focus:** `/dashboard/[studioId]/classes`

**Scenario CL-1 — CRUD class**  
**Steps:** Create class with schedule, capacity, pricing. Edit, duplicate, archive.  
**Expected:** Referential integrity with bookings.

**Scenario CL-2 — Capacity reduction below existing bookings**  
**Steps:** Lower capacity under current headcount.  
**Expected:** Block with explanation or forced waitlist migration.

**Suggested improvements:** **Bulk edit** for seasonal schedules.

---

### 8. Experiences, schedules, and closed days

**Route focus:** `/dashboard/experiences/[studioId]` and related panels (e.g. `studio-closed-days`).

**Scenario EX-1 — Create experience with recurrence**  
**Steps:** Weekly pottery night; set exceptions for holidays.  
**Expected:** ICS or internal calendar reflects exceptions.

**Scenario EX-2 — Closed days propagation**  
**Steps:** Mark studio closed; attempt customer booking on that day (public side).  
**Expected:** Slots unavailable.

**Scenario EX-3 — Instructor assignment**  
**Steps:** Assign staff; swap instructor after bookings exist.  
**Expected:** Notifications to customers if policy requires.

**Suggested improvements:** **Google Calendar sync** (read-only or two-way) with conflict detection.

---

### 9. Bookings and operational desk

**Route focus:** `/dashboard/bookings/[studioId]`, `/dashboard/[studioId]/bookings`, vendor actions components.

**Scenario BK-1 — Booking list filters**  
**Steps:** Filter by date range, status (confirmed, cancelled, no-show).  
**Expected:** Counts match drill-down rows; export CSV if present matches screen.

**Scenario BK-2 — Manual booking creation**  
**Steps:** Phone-in customer; vendor creates booking on behalf.  
**Expected:** Customer receives confirmation; payment state correct (paid vs invoice).

**Scenario BK-3 — Cancellation fees**  
**Steps:** Cancel inside and outside policy window.  
**Expected:** Fee logic matches Stripe state; partial refunds if applicable.

**Scenario BK-4 — Vendor actions stress**  
**Steps:** Rapid status changes on same booking (double-click).  
**Expected:** Idempotent server handling.

**Suggested improvements:** **POS integration** for in-studio walk-ins.

---

### 10. Students and CRM-lite data

**Route focus:** `/dashboard/[studioId]/students`

**Scenario ST-1 — PII handling**  
**Steps:** Add student with phone and email; search students.  
**Expected:** Masking rules if any; export respects GDPR constraints.

**Scenario ST-2 — Notes visibility**  
**Steps:** Add internal note; confirm not exposed on public receipts.

**Suggested improvements:** **Consent log** for marketing opt-in per student.

---

### 11. Kiln and production tracking

**Route focus:** `/dashboard/[studioId]/kiln`

**Scenario K-1 — Stage transitions**  
**Steps:** Move piece through kiln stages; assign shelf or batch.  
**Expected:** Customer notification triggers if productized.

**Scenario K-2 — Lost piece**  
**Steps:** Mark damaged; verify inventory linkage if tied to paid orders.

**Suggested improvements:** **Barcode scan** mobile flow.

---

### 12. Products, shop, and wear tied to studio

**Route focus:** `/dashboard/products/[studioId]`, `/dashboard/[studioId]/shop`

**Scenario PR-1 — Create product**  
**Steps:** Add images, variants, tax category.  
**Expected:** Appears in correct public collection after publish toggle.

**Scenario PR-2 — Inventory sync**  
**Steps:** Sell last unit via public checkout; verify vendor dashboard stock hits zero.

**Scenario PR-3 — Stripe Connect pricing**  
**Steps:** Confirm application fees or transfers align with contract for that studio.

**Suggested improvements:** **Low-stock alerts** via SMS.

---

### 13. Orders (studio lens)

**Route focus:** `/dashboard/orders/[studioId]`

**Scenario O-1 — Fulfillment pipeline**  
**Steps:** Move order from paid → ready for pickup → completed.  
**Expected:** Customer messaging at each transition if enabled.

**Scenario O-2 — Partial fulfillment**  
**Steps:** Split order lines if supported.

**Suggested improvements:** **Shipping label** integration.

---

### 14. Payments and Stripe Connect onboarding

**Route focus:** `/dashboard/[studioId]/payments`, API `app/api/studios/[studioId]/stripe/onboard`

**Scenario PS-1 — Onboard fresh studio**  
**Steps:** Start Connect onboarding; complete with Stripe test data.  
**Expected:** `charges_enabled` reflected in UI; disabled actions until complete.

**Scenario PS-2 — Requirements due**  
**Steps:** Let Stripe transition to “currently_due” by withholding info in test harness.  
**Expected:** Banner with deep link to Stripe; no silent payout failures.

**Scenario PS-3 — Payout schedule display**  
**Steps:** Verify copy matches Stripe settings.

**Scenario PS-4 — Refund initiated from platform admin**  
**Steps:** Coordinate with Document 3 scenario; vendor sees ledger note.

**Suggested improvements:** **Simulator mode** for training staff without touching money movement.

---

### 15. Platform feature add-ons (vendor view)

**Route focus:** `/dashboard/[studioId]/features`

**Scenario F-1 — Enable paid add-on**  
**Steps:** Toggle feature requiring billing.  
**Expected:** Proration messaging; invoice or card charge; entitlement activates post-webhook.

**Scenario F-2 — Cancel add-on**  
**Steps:** Cancel mid-cycle; verify end date and feature gate.

**Scenario F-3 — Feature-gated navigation**  
**Steps:** Disable AI route; hit `/dashboard/[studioId]/ai` directly.  
**Expected:** Upgrade prompt, not raw error.

**Suggested improvements:** **Usage meters** (AI tokens, SMS credits) visible to vendor.

---

### 16. AI tools (studio)

**Route focus:** `/dashboard/[studioId]/ai`

**Scenario AI-1 — Prompt safety**  
**Steps:** Submit abusive prompt; verify moderation or refusal.

**Scenario AI-2 — Cost transparency**  
**Steps:** Run tool; observe quota decrement.

**Suggested improvements:** **Saved prompts** per studio for repeatable marketing copy.

---

### 17. Analytics and calendar

**Routes:** `/dashboard/[studioId]/analytics`, `/dashboard/analytics/[studioId]`, `/dashboard/[studioId]/calendar`

**Scenario AN-1 — Metric reconciliation**  
**Steps:** Compare dashboard revenue to Stripe balance for test week.  
**Expected:** Known acceptable deltas documented (fees, refunds).

**Scenario AN-2 — Calendar drag-drop**  
**Steps:** Reschedule class; verify customer notifications.

**Suggested improvements:** **Benchmarking** anonymized against regional averages.

---

### 18. Waitlist and referrals

**Routes:** `/dashboard/waitlist/[studioId]`, `/dashboard/referrals/[studioId]`

**Scenario WL-1 — Promote waitlist to booking**  
**Steps:** When seat opens, notify next waiter; complete conversion.

**Scenario RF-1 — Referral payout accuracy**  
**Steps:** Generate referral; confirm credit application.

**Suggested improvements:** **A/B testing** referral copy per studio.

---

### 19. Billing (platform charges studio)

**Route focus:** `/dashboard/billing`

**Scenario BL-1 — Subscription to PotteryMania itself**  
**Steps:** Update payment method; pay invoice; fail card.  
**Expected:** Grace period behavior for vendor features.

**Suggested improvements:** **Statement descriptor** clarity on bank statements.

---

### 20. Guided flows (if enabled)

**Route focus:** `/dashboard/[studioId]/guided`

**Scenario GD-1 — Linear wizard resilience**  
**Steps:** Refresh mid-flow; back button; deep link to later step.  
**Expected:** Resume or clear restart without duplicate resources.

**Scenario GD-2 — Permission**  
**Steps:** Collaborator vs owner roles (if differentiated).  
**Expected:** Appropriate restrictions.

**Suggested improvements:** **Checklist export** PDF for franchise auditors.

---

### 21. Cross-studio security regression suite

Run weekly in staging:

1. User U1 owns Studio A only. Request `/api/...` or UI paths with Studio B id (from seed). Expect **403/404**.  
2. U2 owns A and B. Verify **no response** ever returns both studios’ PII in one payload unless explicitly a “account overview” endpoint.  
3. After **impersonation** from admin (Document 3), vendor session must not inherit admin powers (public app should block impersonated admin hitting vendor APIs if architecture forbids).

**Suggested improvements:** Automated **contract tests** mirroring `admin-api-routes-guard` style for `/api/studios/**` vendor routes.

---

### 22. Performance and data volume

**Scenario PF-1 — Year of bookings**  
**Steps:** Seed 10k rows; open booking list.  
**Expected:** Pagination; acceptable TTFB.

**Scenario PF-2 — Heavy image studio**  
**Steps:** 500 product images; open shop management.  
**Expected:** Lazy load; no main-thread lock.

**Suggested improvements:** **Background exports** emailed when CSV too large.

---

### 23. Accessibility for vendors

**Scenario AC-1 — Color-blind status chips**  
**Steps:** Verify booking statuses distinguishable without color alone.

**Scenario AC-2 — Screen reader on calendar**  
**Steps:** Navigate month grid.

**Suggested improvements:** Vendor-facing **WCAG statement** for employment compliance in some jurisdictions.

---

### 24. Disaster recovery drills

**Scenario DR-1 — Read-only database**  
**Steps:** Infra simulates RO mode.  
**Expected:** Friendly global banner; no partial writes.

**Scenario DR-2 — Stripe API outage**  
**Steps:** Toggle mock 500 from Stripe SDK wrapper in staging.  
**Expected:** Retry guidance; no duplicate Connect accounts on retry.

---

### 25. Improvement backlog (vendor client)

1. **Role matrix** UI for inviting staff with scoped permissions.  
2. **Changelog** in-app when platform updates affect vendor workflows.  
3. **Sandbox studio** clone for training without touching live customers.  
4. **Webhook debugger** for studio-scoped events (booking.created).  
5. **Unified search** across students, bookings, and orders.  
6. **Printable roster** per class with emergency contacts.  
7. **Tip pooling** ledger if staff compensation features grow.  
8. **Multi-language** vendor UI parity with customer-facing locale.  
9. **API keys** for studios integrating their own websites.  
10. **Health dashboard** showing integration status (Stripe, email, webhooks).

---

### 26. Sign-off checklist (vendor readiness)

- [ ] Two-studio isolation suite green.  
- [ ] Stripe Connect onboarding path green in test mode.  
- [ ] Booking lifecycle (create → complete → payout visibility) exercised.  
- [ ] Feature gating aligned with entitlements from platform.  
- [ ] Mobile sanity on bookings and calendar.  
- [ ] No high-severity open defects in payments or PII surfaces.

---

### 27. Coordination with other QA documents

When **hyperadmin** changes a **business template** or **platform feature** default, rerun Sections 6 and 15. When **public checkout** fails, bisect using Document 1 scenarios before blaming vendor configuration.

---

### 28. Long-horizon scenarios (franchise and multi-location)

Franchise brands may create **many studios** under one billing entity. Validate whether the product supports **org-level billing** or only per-studio cards; QA should document current limitations explicitly so sales does not over-promise. Scenarios include consolidated reporting, shared coupon pools, and staff moving between locations—each is a common source of subtle authorization bugs when `studioId` remains the sole tenancy key without an intermediate **organization id**.

---

### 29. Data migration and onboarding from competitors

Run a **mock migration week**: import customers, historical classes, and open balances. Validate duplicate detection on email, phone normalization (country codes), and reconciliation of **gift certificates** if migrated. Capture improvement ideas such as **dry-run import** PDF summary before commit, and **rollback window** where migration can be reversed from backup without corrupting live bookings created post-import.

---

### 30. Studio support and escalation path

Define how vendors contact support: in-app ticket, email, or phone. QA should verify **support-only impersonation** (from Document 3) leaves **audit entries** vendors can see at high level (“PotteryMania staff accessed your account on date X”) to maintain trust. If not implemented, file as **major trust feature** for roadmap.

---

### 31. Communications hub and notification preferences (if present or planned)

Even when not a standalone route, vendors receive operational signals: booking confirmations, payout notices, and feature billing receipts. **Scenario CM-1:** vendor toggles email vs SMS vs in-app notifications; trigger each event type in staging and verify only selected channels fire. **Scenario CM-2:** unsubscribe from marketing while remaining subscribed to transactional messages—confirm legal separation. **Scenario CM-3:** language preference per vendor user if localized templates exist. **Improvements:** digest mode (“daily summary at 6pm local”) to reduce alert fatigue on busy Saturdays; **quiet hours** so SMS never fires during sleep unless emergencies.

---

### 32. Integrations: printers, cash drawers, and hardware labs

Studios often use receipt printers or label printers. If the web app only offers **browser print**, QA should validate **print CSS** for rosters and pickup slips: margins, page breaks, and monochrome contrast. **Scenario HW-1:** print 50-line roster in Chrome and Edge. **Scenario HW-2:** very long class notes do not overflow off printable area. **Improvements:** optional **ZPL or ESC/POS** proxy through a small local bridge app with explicit security model documented.

---

### 33. Content policy and user-generated imagery

Studios upload student work photos for pickup marketing. **Scenario UGC-1:** upload borderline content; verify moderation queue if product includes reporting. **Scenario UGC-2:** copyright strike simulation when DMCA process exists. **Improvements:** perceptual hash duplicate detection to block accidental re-upload of huge RAW files; **virus scan** on uploads at ingress.

---

### 34. Financial edge cases: credits, packages, and gift cards

**Scenario FIN-1:** customer purchases a **class pack** of ten sessions; vendor marks attendance consuming credits; attempt overspend. **Scenario FIN-2:** **gift card** redemption partially covers an order; remainder card balance visible to vendor reporting. **Scenario FIN-3:** **price change** mid-series for subscription-like class memberships—verify grandfathering rules in UI copy and ledger. **Improvements:** single **customer ledger** view per student tying credits, refunds, and comps with immutable event sourcing for disputes.

---

### 35. Accessibility of dense operational tables

Beyond color-blind chips, test **zoom 200%** on bookings grid: sticky headers should not obscure first row; horizontal scroll should keep row actions visible or offer a kebab menu per row. **Scenario Z-1:** Windows **High Contrast** mode; verify borders remain. **Improvements:** optional **compact vs comfortable** density toggle stored per user.

---

### 36. Vendor education and in-product help

**Scenario ED-1:** open every `?` help popover on dashboard without network; offline message should appear if help docs remote. **Scenario ED-2:** broken documentation links (404) are unacceptable before launch. **Improvements:** embed **short Loom** links maintained by CS team with version tags matching app release.

---

### 37. Regression matrix snapshot (printable)

| Area | Critical path | Last pass date | Owner |
|------|---------------|----------------|-------|
| Studio create | H-2 | | |
| Isolation | §21 | | |
| Stripe Connect | PS-1 | | |
| Bookings | BK-1 | | |
| Features | F-1 | | |
| Appearance | AP-1 | | |
| Analytics | AN-1 | | |

Extend the table as new routes ship; store alongside sprint retro notes.

---

### 38. Seasonal operations and daylight saving jumps

**Scenario DST-1:** create a recurring Thursday 7pm class across a **spring-forward** weekend; confirm there is no “missing hour” duplicate slot and no impossible local times in the database. **Scenario DST-2:** on the **fall-back** night where local time repeats, attempt to create two bookings at the same nominal wall clock time; uniqueness constraints and UI messaging must align. **Improvements:** show an explicit **IANA timezone** identifier on schedule surfaces; add automated unit tests around timezone helpers with frozen clock injections so QA and engineering share the same expectations.

---

### 39. Vendor offboarding and account closure

**Scenario OFF-1:** studio requests closure while future bookings exist; verify whether the product blocks closure, auto-cancels with refunds, or transfers students—behavior must match terms of service. **Scenario OFF-2:** request a **data export** and validate CSV completeness for students, bookings, and payouts. **Scenario OFF-3:** walk through **Stripe Connect** deauthorization; vendor should retain read-only history for an agreed window. **Improvements:** surface a transparent **data retention countdown** in the UI to reduce support tickets, and email the studio owner a **closure confirmation** that lists disabled webhook subscriptions and export download links.

---

*End of Document 2. Update when dashboard routes, Stripe Connect flows, or tenancy model change.*
