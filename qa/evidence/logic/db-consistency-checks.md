# DB Consistency Checks (2026-04-09)

## Intended Checks

- Orphan payments without matching orders
- Negative order totals
- Payment/order currency mismatches

## Current Result

- Execution blocked because `DATABASE_URL` currently uses `prisma+postgres://`.
- Direct DB checks require `postgresql://` connection string.

## Evidence

- `qa/evidence/logic/reconciliation-report.md`

## Status

- DB consistency gate: **blocked pending direct DB URL**.
