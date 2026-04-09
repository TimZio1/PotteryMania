# TASKLIST 6000

Objective: reach `6000/6000` on `SCORECARD.md` with hard evidence.

Rules:
- No open Critical or High defects at release.
- Every KPI row must have measurable `Current` and linked evidence.
- Minimum 3 consecutive full green pipeline runs before sign-off.

## Owners

- `QA-Lead`: test orchestration, flake control, evidence archive.
- `Backend-Lead`: API contracts, data integrity, migrations.
- `Security-Lead`: abuse testing, authz boundaries, config hygiene.
- `Perf-Lead`: latency/error SLO, load and resilience.
- `Product/Ops-Lead`: business funnel, reconciliation, fulfillment.

## Evidence Paths

- `qa/evidence/functionality/`
- `qa/evidence/ux/`
- `qa/evidence/logic/`
- `qa/evidence/security/`
- `qa/evidence/performance/`
- `qa/evidence/business/`

## Phase 0 - Baseline and CI

- [x] Create evidence folders above.
- [x] Add script commands:
  - [x] `npm run test:smoke`
  - [x] `npm run test:e2e-role-matrix`
  - [x] `npm run test:api-contract`
  - [x] `npm run test:security`
  - [x] `npm run test:load-smoke`
  - [x] `npm run test:reconciliation`
- [x] Add CI workflow to run all pillar scripts and upload artifacts.
- [x] Add defect severity policy (`Critical/High/Medium/Low`) to docs.

Done when:
- One CI run produces artifacts for all six pillars.

## Phase 1 - Functionality 1000

- [x] Smoke suite pass rate = 100%.
- [x] Role matrix pass rate = 100% (customer/studio/hyperadmin).
- [x] API contract pass rate = 100%.
- [x] Ceramic 10-category system implemented end-to-end (nav, pages, API, admin assignment/manager, SEO).
- [ ] Button/form action coverage map completed and 100% tested.
- [x] Silent failures = 0 (server + client).
- [ ] Flake rate < 1% across 30 re-runs.

Evidence:
- [x] `qa/evidence/functionality/smoke-report.*`
- [x] `qa/evidence/functionality/role-matrix-report.*`
- [x] `qa/evidence/functionality/api-contract-report.*`
- [x] `qa/evidence/functionality/ceramic-category-system-2026-04-09.md`
- [x] `qa/evidence/functionality/action-coverage-map.md`
- [x] `qa/evidence/functionality/flake-analysis.md`

## Phase 2 - UX/UI 1000

- [x] Top-10 customer journeys complete.
- [x] Top-10 studio-admin journeys complete.
- [x] Top-10 hyperadmin journeys complete.
- [x] Accessibility baseline pass (Axe/Lighthouse key pages).
- [ ] UI consistency checklist pass.
- [ ] Micro-issue backlog = 0.

Evidence:
- [x] `qa/evidence/ux/customer-journeys.md`
- [x] `qa/evidence/ux/studio-journeys.md`
- [x] `qa/evidence/ux/hyperadmin-journeys.md`
- [x] `qa/evidence/ux/accessibility-report.*`
- [x] `qa/evidence/ux/ui-consistency-checklist.md`
- [x] `qa/evidence/ux/micro-issues-burndown.md`

## Phase 3 - Logic and Data Integrity 1000

- [x] State transition tests pass (orders/bookings/refunds/credits).
- [x] Idempotency tests pass (webhooks/retries).
- [ ] Financial reconciliation accuracy = 100%.
- [x] Race-condition suite pass.
- [ ] Orphan/consistency DB checks = 0 issues.
- [ ] Migration safety verification pass (staging replay).

Evidence:
- [x] `qa/evidence/logic/state-transitions-report.*`
- [x] `qa/evidence/logic/idempotency-report.*`
- [x] `qa/evidence/logic/reconciliation-report.*`
- [x] `qa/evidence/logic/concurrency-report.*`
- [x] `qa/evidence/logic/db-consistency-checks.md`
- [x] `qa/evidence/logic/migration-safety-report.md`

## Phase 4 - Security 1000

- [x] Role-boundary suite = 100%.
- [x] Privilege escalation attempts blocked = 100%.
- [x] CSRF/session hardening checks pass.
- [x] Rate-limit abuse checks pass.
- [x] Secret/config hygiene pass.
- [x] Security telemetry coverage pass.

Evidence:
- [x] `qa/evidence/security/authz-suite-report.*`
- [x] `qa/evidence/security/escalation-tests-report.*`
- [x] `qa/evidence/security/csrf-session-checklist.md`
- [x] `qa/evidence/security/rate-limit-abuse-report.md`
- [x] `qa/evidence/security/secret-hygiene-scan.md`
- [x] `qa/evidence/security/telemetry-coverage.md`

## Phase 5 - Performance and Reliability 1000

- [ ] p95 API latency SLA hit rate >= 99%.
- [ ] Error rate SLA hit rate >= 99.9%.
- [x] Load smoke pass = 100%.
- [ ] Long-running job resilience pass.
- [ ] Hydration/runtime warnings = 0 on target paths.
- [ ] Availability >= 99.9%.

Evidence:
- [x] `qa/evidence/performance/apm-latency-report.*`
- [x] `qa/evidence/performance/apm-error-rate-report.*`
- [x] `qa/evidence/performance/load-smoke-report.*`
- [x] `qa/evidence/performance/resilience-report.*`
- [x] `qa/evidence/performance/runtime-warnings-report.md`
- [x] `qa/evidence/performance/uptime-report.*`

## Phase 6 - Business Viability 1000

- [ ] Checkout technical success >= 99%.
- [x] Registered-user free studio listing enabled (map/database), with limited functionality.
- [x] Wearables categorized across shop + admin listing surfaces.
- [x] Payment/refund correctness = 100%.
- [ ] Commission/credit correctness = 100%.
- [ ] Revenue leakage incidents = 0.
- [ ] Spreadshop fulfillment success >= 99%.
- [ ] Hyperadmin operational visibility checklist = 100%.

Evidence:
- [x] `qa/evidence/business/checkout-funnel-report.*`
- [x] `qa/evidence/business/free-studio-listing-rollout-2026-04-09.md`
- [x] `qa/evidence/business/wear-categorization-rollout-2026-04-09.md`
- [x] `qa/evidence/business/payment-refund-reconciliation.*`
- [x] `qa/evidence/business/commission-credit-audit.*`
- [x] `qa/evidence/business/revenue-leakage-log-review.md`
- [x] `qa/evidence/business/spreadshop-fulfillment-report.*`
- [x] `qa/evidence/business/hyperadmin-ops-checklist.md`

## Final Release Gate

- [x] `SCORECARD.md` fully filled (no blank `Current`/`Evidence`).
- [ ] Every pillar score >= 950.
- [ ] Total score = 6000/6000.
- [ ] Critical open = 0.
- [ ] High open = 0.
- [ ] 3 consecutive full green CI runs archived.

## Run Order (do not reorder)

1. Phase 0
2. Phase 1
3. Phase 3
4. Phase 4
5. Phase 5
6. Phase 6
7. Phase 2
8. Final Release Gate
