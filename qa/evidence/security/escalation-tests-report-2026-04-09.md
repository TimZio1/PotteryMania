# Security Escalation/Boundary Test Report (2026-04-09)

## Commands

- `npm run test -- lib/auth-session-admin.test.ts lib/auth-session-hyperadmin.test.ts lib/admin-api-routes-guard.test.ts lib/finance/admin-guard.test.ts`
- `npm run test:api-contract` (includes admin impersonation/refund/finance/users privilege boundary contracts)

## Result

- Test files: `12` (combined across executed commands)
- Tests: `44` (combined across executed commands)
- Passed: `44`
- Failed: `0`

## Coverage Notes

- Verifies admin API route files reference explicit auth guards.
- Verifies `requireAdminUser` role boundary behavior for `hyper_admin`/`admin` allow and `vendor`/`customer` deny.
- Verifies suspended users and impersonated sessions are denied before privilege paths.
- Verifies `requireHyperAdminUser` restricts financial/identity-sensitive actions to hyper_admin.
- Verifies `requireFinanceAdmin` returns explicit `403` response when admin session is absent.
- Verifies impersonation route contract blocks non-hyper-admin callers and admin-target escalation attempts.
- Verifies admin refund and finance route contracts enforce privilege boundaries and reject malformed payloads.
- Verifies admin user-management route blocks self-mutation, non-hyper role elevation, and last-hyper-admin demotion.
