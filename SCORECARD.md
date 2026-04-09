# PotteryMania Live Scorecard

Scoring model: `Pillar Score = 1000 * (Weighted Completion %) - Open Defect Penalties`

Hard caps:
- Any Critical open in a pillar -> pillar max 499
- Any High open in a pillar -> pillar max 799

## Functionality (1000)

| KPI | Weight | Current | Target | Evidence |
|---|---:|---:|---:|---|
| Smoke pass rate | 20% |  | 100% | CI run link |
| E2E role matrix pass rate | 20% |  | 100% | CI run link |
| API contract pass rate | 20% |  | 100% | API suite report |
| Button/form action coverage | 15% |  | 100% | Test map |
| Silent failure count | 15% |  | 0 | Monitoring |
| Flake rate | 10% |  | <1% | Stability report |

Penalty rules: Critical -250 each, High -100 each, Medium -25 each, Low -5 each

## UX/UI (1000)

| KPI | Weight | Current | Target | Evidence |
|---|---:|---:|---:|---|
| Top-10 customer journey completion | 25% |  | 100% | Journey scripts |
| Top-10 vendor journey completion | 25% |  | 100% | Journey scripts |
| Top-10 hyperadmin journey completion | 20% |  | 100% | Journey scripts |
| Accessibility baseline pass | 15% |  | 100% | Axe/Lighthouse |
| UI consistency checklist pass | 10% |  | 100% | Design QA |
| Micro-issue backlog burn-down | 5% |  | 0 open | QA board |

## Logic & Data Integrity (1000)

| KPI | Weight | Current | Target | Evidence |
|---|---:|---:|---:|---|
| State transition tests pass | 20% |  | 100% | Test report |
| Idempotency tests pass | 20% |  | 100% | Replay suite |
| Financial reconciliation accuracy | 25% |  | 100% | Ledger report |
| Race-condition test pass | 15% |  | 100% | Concurrency suite |
| Orphan/consistency checks | 10% |  | 0 issues | DB checks |
| Migration safety verification | 10% |  | 100% | Staging run |

## Security (1000)

| KPI | Weight | Current | Target | Evidence |
|---|---:|---:|---:|---|
| Role-boundary test pass | 25% |  | 100% | AuthZ suite |
| Privilege-escalation attempts blocked | 20% |  | 100% | Security tests |
| CSRF/session hardening checks | 15% |  | 100% | Checklist |
| Rate-limit effectiveness | 15% |  | 100% | Abuse report |
| Secret/config hygiene | 15% |  | 100% | Validator + scan |
| Security telemetry coverage | 10% |  | 100% | Monitoring |

## Performance & Reliability (1000)

| KPI | Weight | Current | Target | Evidence |
|---|---:|---:|---:|---|
| p95 API latency SLA hit rate | 25% |  | >=99% | APM |
| Error rate SLA hit rate | 20% |  | >=99.9% | APM |
| Load smoke pass | 15% |  | 100% | k6/Artillery |
| Long-running job resilience | 15% |  | 100% | Resilience tests |
| Hydration/runtime warning count | 10% |  | 0 | Runtime logs |
| Availability | 15% |  | >=99.9% | Uptime monitor |

## Business Viability (1000)

| KPI | Weight | Current | Target | Evidence |
|---|---:|---:|---:|---|
| Checkout conversion technical success | 20% |  | >=99% | Funnel analytics |
| Payment/refund correctness | 20% |  | 100% | Reconciliation |
| Commission/credit correctness | 20% |  | 100% | Finance audit |
| Revenue leakage incidents | 15% |  | 0 | Incident log |
| Spreadshop fulfillment success | 15% |  | >=99% | Fulfillment dashboard |
| Hyperadmin operational visibility | 10% |  | 100% | Health checklist |

## Global Dashboard

| Pillar | Score /1000 | Critical Open | High Open | Gate Status |
|---|---:|---:|---:|---|
| Functionality |  |  |  |  |
| UX/UI |  |  |  |  |
| Logic |  |  |  |  |
| Security |  |  |  |  |
| Performance |  |  |  |  |
| Business |  |  |  |  |
| **Total** | **/6000** |  |  |  |

## Release Gate Rules

- FAIL if any Critical is open
- FAIL if any pillar < 800
- SOFT LAUNCH ONLY if all pillars >= 800 and at least one pillar < 950
- PRODUCTION READY only if all pillars >= 950 and no Critical/High open
