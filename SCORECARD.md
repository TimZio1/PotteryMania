# PotteryMania Live Scorecard

Scoring model: `Pillar Score = 1000 * (Weighted Completion %) - Open Defect Penalties`

Hard caps:
- Any Critical open in a pillar -> pillar max 499
- Any High open in a pillar -> pillar max 799

## Functionality (1000)

| KPI | Weight | Current | Target | Evidence |
|---|---:|---:|---:|---|
| Smoke pass rate | 20% | 100% (10 passed / 10 total) | 100% | `qa/evidence/functionality/smoke-report-2026-04-09.md` |
| E2E role matrix pass rate | 20% | 100% (15 passed / 15 total) | 100% | `qa/evidence/functionality/role-matrix-report-2026-04-09.md` |
| API contract pass rate | 20% | 100% for current contract suite scope (30/30 passing across 8 route contract files) | 100% | `qa/evidence/functionality/api-contract-report-2026-04-09.md` |
| Button/form action coverage | 15% | 25% (smoke subset only) | 100% | Covered: login negative, early-access submit paths, route smoke |
| Silent failure count | 15% | 0 (static silent-catch scan remediated) | 0 | `qa/evidence/functionality/silent-failures-scan-2026-04-09.md` |
| Flake rate | 10% | >1% (env-dependent skips/timeouts seen) | <1% | Multiple re-runs required before deterministic smoke state |

Penalty rules: Critical -250 each, High -100 each, Medium -25 each, Low -5 each

## UX/UI (1000)

| KPI | Weight | Current | Target | Evidence |
|---|---:|---:|---:|---|
| Top-10 customer journey completion | 25% | 100% (10/10 evidenced; journey smoke suite green) | 100% | `qa/evidence/ux/customer-journeys.md` |
| Top-10 vendor journey completion | 25% | 100% (10/10 evidenced; journey smoke suite green) | 100% | `qa/evidence/ux/studio-journeys.md` |
| Top-10 hyperadmin journey completion | 20% | 100% (10/10 evidenced; journey smoke suite green) | 100% | `qa/evidence/ux/hyperadmin-journeys.md` |
| Accessibility baseline pass | 15% | 100% (Axe baseline suite passes key pages: 6/6) | 100% | `qa/evidence/ux/accessibility-report-2026-04-09.md` |
| UI consistency checklist pass | 10% | 35% (partial checklist completed) | 100% | `qa/evidence/ux/ui-consistency-checklist.md` |
| Micro-issue backlog burn-down | 5% | In progress (several closed, backlog not zero) | 0 open | `qa/evidence/ux/micro-issues-burndown.md` |

## Logic & Data Integrity (1000)

| KPI | Weight | Current | Target | Evidence |
|---|---:|---:|---:|---|
| State transition tests pass | 20% | 100% (booking + wear-order lifecycle + refund/commission transition suites passing in current gate scope) | 100% | `qa/evidence/logic/state-transitions-report-2026-04-09.md` |
| Idempotency tests pass | 20% | 100% (booking + duplicate submit coverage plus webhook dedup/retry/task-failure idempotency suites all passing) | 100% | `qa/evidence/logic/idempotency-report-2026-04-09.md` |
| Financial reconciliation accuracy | 25% | BLOCKED (reconciliation script now supports current URL protocol, but run is blocked by runtime data-service fetch failure) | 100% | `qa/evidence/logic/reconciliation-report.md` |
| Race-condition test pass | 15% | 100% (slot lock plus coupon row-lock/concurrency guard suites passing) | 100% | `qa/evidence/logic/concurrency-report-2026-04-09.md` |
| Orphan/consistency checks | 10% | BLOCKED (protocol blocker removed; consistency run still blocked by runtime data-service fetch failure) | 0 issues | `qa/evidence/logic/db-consistency-checks.md` |
| Migration safety verification | 10% | 70% (CI migrate+seed path verified; staging replay pending) | 100% | `qa/evidence/logic/migration-safety-report.md` |

## Security (1000)

| KPI | Weight | Current | Target | Evidence |
|---|---:|---:|---:|---|
| Role-boundary test pass | 25% | 100% (admin guard scan + role boundary unit tests + route contracts for impersonation/refund/finance/user-management all passing) | 100% | `qa/evidence/security/escalation-tests-report-2026-04-09.md` |
| Privilege-escalation attempts blocked | 20% | 100% (self-mutation, non-hyper role elevation, last-hyper demotion, impersonation admin-target, and restricted refund/finance paths all blocked in tests) | 100% | `qa/evidence/security/escalation-tests-report-2026-04-09.md` |
| CSRF/session hardening checks | 15% | 100% (CSRF same-origin middleware + session boundary tests + cookie attribute audit all passing in current scope) | 100% | `qa/evidence/security/csrf-session-checklist.md` |
| Rate-limit effectiveness | 15% | 100% (static route guard scan + abuse-oriented limiter unit checks passing) | 100% | `qa/evidence/security/rate-limit-abuse-report.md` |
| Secret/config hygiene | 15% | 100% (no hardcoded live-secret patterns detected in current scan scope) | 100% | `qa/evidence/security/secret-hygiene-scan.md` |
| Security telemetry coverage | 10% | 100% (telemetry hooks cover all sensitive catch-bearing API routes; broader non-sensitive hardening continues) | 100% | `qa/evidence/security/telemetry-coverage.md` |

## Performance & Reliability (1000)

| KPI | Weight | Current | Target | Evidence |
|---|---:|---:|---:|---|
| p95 API latency SLA hit rate | 25% | 0% (not measured) | >=99% | `qa/evidence/performance/apm-latency-report-2026-04-09.md` |
| Error rate SLA hit rate | 20% | 0% (not measured) | >=99.9% | `qa/evidence/performance/apm-error-rate-report-2026-04-09.md` |
| Load smoke pass | 15% | 100% (3/3 smoke scenarios passed in dedicated load-smoke runs) | 100% | `qa/evidence/performance/load-smoke-report-2026-04-09.md` |
| Long-running job resilience | 15% | 30% (partial resilience checks documented) | 100% | `qa/evidence/performance/resilience-report-2026-04-09.md` |
| Hydration/runtime warning count | 10% | Non-zero (OpenTelemetry mismatch resolved; Prisma advisory warnings remain) | 0 | `qa/evidence/performance/runtime-warnings-report.md` |
| Availability | 15% | 0% (not measured) | >=99.9% | `qa/evidence/performance/uptime-report-2026-04-09.md` |

## Business Viability (1000)

| KPI | Weight | Current | Target | Evidence |
|---|---:|---:|---:|---|
| Checkout conversion technical success | 20% | 30% (checkout-init and booking checkout smoke path passing) | >=99% | `qa/evidence/business/checkout-funnel-report-2026-04-09.md` |
| Payment/refund correctness | 20% | 100% (refund snapshot, status transitions, full/partial/capped/error flows covered and passing) | 100% | `qa/evidence/business/payment-refund-reconciliation-2026-04-09.md` |
| Commission/credit correctness | 20% | 80% (commission rule/rounding + checkout-line split math + ledger dedupe/idempotency covered; DB-backed credit-adjustment tie-out pending) | 100% | `qa/evidence/business/commission-credit-audit-2026-04-09.md` |
| Revenue leakage incidents | 15% | Unknown (not yet provable with current reconciliation blocker) | 0 | `qa/evidence/business/revenue-leakage-log-review.md` |
| Spreadshop fulfillment success | 15% | 0% (not measured) | >=99% | `qa/evidence/business/spreadshop-fulfillment-report-2026-04-09.md` |
| Hyperadmin operational visibility | 10% | 35% (ops checklist partially validated) | 100% | `qa/evidence/business/hyperadmin-ops-checklist.md` |

## Global Dashboard

| Pillar | Score /1000 | Critical Open | High Open | Gate Status |
|---|---:|---:|---:|---|
| Functionality | 190 | TBD | TBD | FAIL (insufficient coverage + open issues) |
| UX/UI | 905 | TBD | TBD | SOFT PASS (journeys + accessibility complete; consistency/micro backlog still open) |
| Logic | 160 | TBD | TBD | FAIL (financial/race/consistency suites missing) |
| Security | 220 | TBD | TBD | FAIL (partial authZ only; no full abuse suite) |
| Performance | 0 | TBD | TBD | FAIL (no SLA/APM/load proof) |
| Business | 20 | TBD | TBD | FAIL (checkout/payment/fulfillment audits missing) |
| **Total** | **660/6000** | TBD | TBD | **FAIL** |

## Release Gate Rules

- FAIL if any Critical is open
- FAIL if any pillar < 800
- SOFT LAUNCH ONLY if all pillars >= 800 and at least one pillar < 950
- PRODUCTION READY only if all pillars >= 950 and no Critical/High open

## Remaining Blockers (Immediate)

- Full E2E role matrix now executes and is attached; expand from smoke subset to deeper role-privilege matrix.
- Financial reconciliation is no longer protocol-blocked, but remains blocked by intermittent runtime DB/data-service fetch failures.
- API contract suite exists but coverage is still narrow; expand to checkout, cart, bookings, and admin endpoints.
- Performance validation is missing entirely (APM p95/error rate, load smoke, uptime).
- Business integrity evidence is missing (checkout conversion, refunds, commissions/credits, leakage audit, fulfillment).
- Security abuse/escalation testing is not yet evidenced.
