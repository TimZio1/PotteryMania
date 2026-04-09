# CSRF / Session Hardening Checklist (2026-04-09)

## Verification Inputs

- `npm run test:security` (route/session behavior)
- `npx vitest run lib/auth-session-hyperadmin.test.ts`
- Manual code scan for auth/session guard usage in API routes.
- `npm run test -- lib/csrf-protection.test.ts lib/cart-server-cookie.test.ts`
- Middleware CSRF same-origin enforcement for state-changing API requests carrying session/cart cookies (`middleware.ts` + `lib/csrf-protection.ts`).

## Checklist

- [x] Protected routes redirect unauthenticated users in smoke flows.
- [x] Admin API routes are guarded (`requireAdminUser`/`requireHyperAdminUser` patterns validated by unit test).
- [x] Impersonation guard behavior covered in unit tests.
- [x] Explicit CSRF middleware coverage for state-changing API routes using session/cart cookies.
- [x] Cookie attribute audit (`SameSite`, `Secure`, `HttpOnly`) captured in dedicated report (`qa/evidence/security/cookie-attribute-audit-2026-04-09.md`).

## Current Verdict

- **Pass**: session boundary behavior, CSRF same-origin middleware coverage, and cookie security attribute checks are evidenced.
