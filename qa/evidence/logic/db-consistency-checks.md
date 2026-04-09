# DB Consistency Checks (2026-04-09)

## Intended Checks

- Orphan payments without matching orders
- Negative order totals
- Payment/order currency mismatches

## Current Result

- Protocol-specific blocking was removed from reconciliation checks.
- Current blocker is runtime data-service fetch instability during reconciliation execution (`Cannot fetch data from service: fetch failed`).

## Evidence

- `qa/evidence/logic/reconciliation-report.md`

## Status

- DB consistency gate: **blocked pending stable DB connectivity**.
