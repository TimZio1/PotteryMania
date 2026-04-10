# Studio public theme (controlled theming)

## Principle

- **Platform** (dashboard, admin, tools): fixed royal-black system — see `lib/ui-styles.ts` (`platformUi`) and `data-pm-visual="platform"`.
- **Studio public** (`/studios/:id` only): curated JSON theme on `studios.public_theme`, resolved to CSS variables — never mixed into platform UI.

## File map

| Area | Files |
|------|--------|
| DB | `prisma/schema.prisma` (`publicTheme` Json), migration `prisma/migrations/20260410120000_studio_public_theme/` |
| Types & validation | `lib/studio-theme/types.ts`, `lib/studio-theme/schema.ts` |
| Presets & accents | `lib/studio-theme/presets.ts` |
| Tier / plan guard | `lib/studio-theme/tier.ts` (`activationPaidAt` → starter vs full) |
| Resolver | `lib/studio-theme/resolve.ts` → `ResolvedStudioPublicTheme` |
| CSS | `app/globals.css` (`.st-surface` … utilities) |
| Root wrapper | `components/studio-public/studio-theme-root.tsx` |
| Public page | `app/studios/[studioId]/page.tsx` |
| API | `app/api/studios/[studioId]/public-theme/route.ts` (GET + PATCH, owner-only) |
| Editor + preview | `app/dashboard/studio/[studioId]/appearance/*` |
| Shared components | `components/marketing/studio-product-add-to-cart.tsx` (`studioThemed`), `components/review-summary.tsx` (`studioThemed`) |

## Theme schema (v1)

Persisted as JSON (`StudioPublicThemeV1`):

- `themePreset`: `warm-minimal` \| `earth-and-clay` \| `soft-editorial` \| `stone-gallery` \| `dark-artisan` \| `mediterranean-light`
- `primaryTone`: `warm_neutral` \| `deep_ink` \| `soft_clay` \| `stone` \| `olive` \| `midnight`
- `accentTone`: `terracotta` \| `sage` \| `slate` \| `gold` \| `ink` \| `blush`
- `fontPair`: `system_neutral` \| `serif_editorial` \| `humanist_soft` \| `classic_literary` \| `mono_accent`
- `layoutMode`: `balanced` \| `airy` \| `compact`
- `imageStyle`: `rounded` \| `sharp` \| `polaroid`
- `buttonStyle`: `pill` \| `soft` \| `outline`
- `cornerStyle`: `xl` \| `md` \| `none`
- `density`: `comfortable` \| `compact`
- `showSerifHeadings`: boolean
- `useUppercaseLabels`: boolean

Invalid enum values from clients are **ignored** (fallback per key); unknown keys are dropped by merge + parse.

## Token structure

Resolver outputs:

- `cssVariables`: `--st-page-bg`, `--st-surface-bg`, `--st-text`, `--st-muted`, `--st-heading`, `--st-border`, `--st-accent`, `--st-accent-contrast`, `--st-font-sans`, `--st-font-heading`, radii, spacing.
- `surfaceClassName`: `st-surface` + `st-layout-*`, `st-density-*`, `st-btn-*`, `st-img-*`, optional `st-upper-labels`, `st-polaroid`.

Components on the public studio page use **`st-*` utility classes** scoped under `.st-surface` (see `globals.css`).

## Guardrails

1. **No hex / font uploads** — only enums + booleans; palette from `PRESET_BASE` + `ACCENT_HEX`.
2. **Preset tier**: until `activationPaidAt` is set, only `warm-minimal` and `stone-gallery` are allowed; PATCH clamps other presets to `warm-minimal`.
3. **Checkout / dashboard / admin** unchanged — theme applies only inside `StudioThemeRoot` on `/studios/[studioId]`.
4. **Accessibility**: contrast tuned on light presets; `dark-artisan` uses light-on-dark text; accent used for links and primary buttons with `accent-contrast` text.

## API

- `GET /api/studios/:id/public-theme` — owner; returns `theme`, `tier`, `presetsAllowed`, `activationPaidAt`, lightweight `resolved` summary.
- `PATCH /api/studios/:id/public-theme` — owner; body partial theme object; server merges, clamps preset, persists `publicTheme`.

## Fallback

`public_theme` null or invalid → `parseStudioPublicThemeJson` yields `DEFAULT_STUDIO_PUBLIC_THEME` (`warm-minimal`).
