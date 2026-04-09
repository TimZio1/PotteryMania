# Accessibility Baseline Report (2026-04-09)

## Scope

- Dedicated Axe baseline for key public routes and admin entry path.

## Automated Run

- Command:
  - `npm run test:accessibility`
- Suite:
  - `tests/e2e/accessibility/accessibility-baseline.spec.ts`
- Gate:
  - no `serious`/`critical` Axe violations on audited routes.

## Audited Routes

- `/`
- `/early-access`
- `/classes`
- `/marketplace`
- `/login`
- `/admin` (authenticated when admin credentials exist; otherwise login callback path fallback)

## Result

- Run result: **6 passed**.
- Baseline status: **pass**.

## Notes

- During implementation, contrast regressions were detected and remediated on warm-surface sections and footer/meta text.
- Runtime Prisma advisory logs are outside this accessibility gate and tracked separately under performance/reliability backlog.
