# Reconciliation Report

- Timestamp: 2026-04-09T13:31:59.850Z

## Verdict

BLOCKED

- `DATABASE_URL` is using `prisma+postgres://` (data-proxy style).
- This reconciliation script requires direct database access via `postgresql://`.
- Set `DATABASE_URL` to a direct Postgres connection string and rerun.