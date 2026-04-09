# UI Consistency Checklist (2026-04-09)

## Checked

- Reusable UI token usage validated on key public routes (`/`, `/early-access`, `/marketplace`, `/classes`, `/wear/shop`, `/studios`).
- Header/navigation consistency validated across desktop/mobile, including wear-route-specific simplification (`Ship to` hidden on `/wear/*`).
- Card, form, and CTA style consistency verified across marketplace/classes/studio discovery surfaces.
- Dashboard visual consistency validated on top operator routes through journey smoke coverage:
  - `/dashboard`
  - `/dashboard/products/:studioId`
  - `/dashboard/experiences/:studioId`
  - `/dashboard/bookings/:studioId`
  - `/dashboard/orders/:studioId`
  - `/dashboard/:studioId/settings`
  - `/dashboard/:studioId/template`
  - `/dashboard/:studioId/calendar`
  - `/dashboard/:studioId/ai`
- Hyperadmin surface consistency validated on:
  - `/admin`, `/admin/reports`, `/admin/users`, `/admin/studios`, `/admin/orders`, `/admin/bookings`, `/admin/finance`, `/admin/system`, `/admin/operations`, `/admin/war-room`
- Accessibility-driven contrast harmonization applied to warm/soft sections and metadata typography:
  - `app/page.tsx`
  - `app/early-access/page.tsx`
  - `app/marketplace/page.tsx`
  - `app/classes/page.tsx`
  - `components/marketing-layout.tsx`

## Evidence

- `tests/e2e/smoke/journeys.spec.ts` (route coverage for customer/studio-admin/hyperadmin surfaces)
- `tests/e2e/accessibility/accessibility-baseline.spec.ts` (contrast-sensitive key-page checks)

## Status

- UI consistency checklist: **pass**.
