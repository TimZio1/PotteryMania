# Runtime Warnings Report (2026-04-09)

## Checked Contexts

- `npm run test:smoke`
- `npm run test:e2e-role-matrix`
- `npm run test:ux`
- `npm run build` (with required build auth env vars)

## Findings

- **Resolved:** OpenTelemetry `import-in-the-middle` mismatch warnings no longer appear after package override + reinstall.
- **Still present:** Prisma advisory warning:
  - `In production, we recommend using prisma generate --no-engine`
- **Still present:** Next.js local dev warning in E2E web server:
  - `Cross origin request detected ... configure allowedDevOrigins`
- Attempted remediation via `next.config.ts` caused Playwright HMR websocket errors and was reverted for suite stability.
- **Hydration warnings observed:** none during the verified runs.

## Current Status

- Runtime warning target of strict zero is **not yet met** due remaining Prisma advisory warnings.
