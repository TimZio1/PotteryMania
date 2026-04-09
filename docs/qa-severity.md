# QA Defect Severity Policy

Use this policy for triage, score penalties, and release gating.

## Critical

Definition:
- Security bypass, data corruption, payment integrity break, or production outage.
- Any defect that can cause direct money loss, privilege escalation, or broken core flow for many users.

Examples:
- Unauthorized access to admin/studio data.
- Incorrect charge/refund behavior.
- Checkout completion impossible.

SLA:
- Immediate stop-ship.
- Fix starts now, hotfix path preferred.

## High

Definition:
- Major flow broken with workaround or significant user/business impact.
- Strong reliability/performance regressions affecting core journeys.

Examples:
- Login intermittently fails for valid users.
- Marketplace/classes pages fail in common runtime conditions.
- Credits/commissions computed incorrectly in edge cases.

SLA:
- Next patch cycle, before release candidate promotion.

## Medium

Definition:
- Non-core flow degradation, missing validation, moderate UX friction, noisy runtime defects.

Examples:
- Inconsistent error messages.
- Partial form-state loss.
- Non-blocking API contract mismatch.

SLA:
- Scheduled into active sprint.

## Low

Definition:
- Cosmetic or minor wording/UI consistency issues with negligible business impact.

Examples:
- Spacing/alignment issues.
- Typos and minor label inconsistencies.

SLA:
- Backlog grooming and bundled fixes.

## Release Rule Mapping

- Any open `Critical`: release fail.
- Any open `High`: cannot claim production-ready.
- `Medium` and `Low`: allowed only with explicit acceptance and owners/dates.
