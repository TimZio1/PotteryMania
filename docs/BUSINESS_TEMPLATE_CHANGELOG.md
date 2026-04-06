# Business template system — changelog

## 2026-04-19 — Catalog, admin, analytics, snapshots

### Added

- **Prisma**: `BusinessTemplate` (hyperadmin-editable catalog), `BusinessTemplateFunnelEvent`, `BusinessTemplateActivationLog` (rollback-safe snapshots: `previous_snapshot` / `new_snapshot` JSON).
- **8 distinct business models** seeded via `prisma/business-template-seeds.cjs` (upserted at start of `prisma/seed.cjs`): daily classes, weekend workshops, shop hybrid, private events, members club, production/kiln, ship/kits, solo lean.
- **`lib/business-template-visuals.ts`**: per-template `visualTheme` → card / drawer accent classes (amber, rose, teal, violet, orange, emerald, sky, slate).
- **`lib/business-template-recommendation.ts`**: heuristic “recommended for this studio” from products, experiences, bookings (90d), orders (90d), kiln feature.
- **`lib/admin-business-templates-overview.ts`**: shared admin overview (templates + 30d funnel + active studio counts by slug).
- **API**: `POST /api/studios/[studioId]/business-template/events` (`gallery_view`, `drawer_open`, `activate_click`); activation still logs **`activation_success`** server-side on `POST .../business-template`.
- **API**: `GET /api/admin/business-templates`, `PATCH /api/admin/business-templates/[id]` (visibility, price, featured, platform pick, default, sort; audit reason ≥8 chars).
- **Admin UI**: `/admin/business-templates` + nav link “Business templates”.
- **Vendor gallery**: business-model label line, theme-based cards, badge priority (studio rec → platform pick → featured → default starter), empty state if no visible templates.

### Changed

- **Templates** load from **database** (`listVisibleBusinessTemplates` / `getBusinessTemplateBySlug`) instead of static TS array.
- **`POST .../business-template`**: validates **visible** template only; writes **activation log** + **funnel** row in one transaction.
- **Studio template page** passes `studioRecommendedSlug` and `defaultTemplateSlug` into the gallery client.

### Verified

- `npm run lint` and `npm run build` (local).

### Later wiring (not blocking)

- Stripe price for template subscription line item.
- Hyperadmin UI to edit long copy fields (name/tagline/summaries) without raw SQL.
- Dashboard surfaces that react to `businessTemplateSlug` beyond badge + gallery (deeper product behavior).
