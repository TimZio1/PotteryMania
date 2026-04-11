# PotteryMania design system (canonical)

**Scope:** Application UI outside **Wearables** (`app/wear/**`, `components/wear/**`, `admin/wear*`, `components/admin/wear*`). Those routes are excluded from this pass.

**Source of truth for shared chrome:** `app/globals.css` (`--pm-*` tokens) + `lib/ui-styles.ts` (`studioUi` / `platformUi`).

---

## Phase 1 — UI inconsistency map (scan-derived)

Findings are grouped; each line item counts as multiple surface-level inconsistencies (layout, token drift, duplication).

### A. Dual visual modes without a single token spine (1–20)

1. Marketing / studio warmth (`studioUi`, stone/amber) vs platform zinc (`.pm-visual-platform`, `platformUi`) used different horizontal padding (`px-4` vs `px-5` vs `px-8`), now unified via `pageContainer`.
2. Platform header used `max-w-5xl` while body containers used `max-w-6xl`.
3. Platform nav links duplicated the same `rounded-lg px-3 py-2` + hover stack six times in `platform-header.tsx`.
4. Site header primary CTA duplicated two near-identical `Link` blocks (mobile/desktop) with hand-tuned shadows and colors instead of a named token.
5. `not-found` primary CTA reimplemented `buttonPrimary` with ad hoc `amber-900` + shadow classes.
6. `globals.css` defined `--radius-sm` through `--radius-2xl` while components used `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-full` interchangeably.
7. Studio cards used `rounded-3xl`; platform cards used `rounded-2xl` for the same semantic “card”.
8. `studioUi.card` used `p-5 sm:p-6` (20px / 24px mix) off the strict 8px grid.
9. `studioUi.tile` used a bespoke multi-value shadow; platform `tile` used none — hover elevation diverged.
10. Field controls mixed `px-3.5` with `rounded-xl` while chips used `rounded-full` vs `rounded` (sm chips).
11. Skip-link in `app/layout.tsx` uses `rounded-lg` + `shadow-lg` — not mapped to `--pm-shadow-*` (acceptable exception: focus utility).
12. `.st-surface` studio storefront uses its own button/card shadows (`0 1px 2px rgba(0,0,0,0.04)` and tile hover `0 4px 14px`) — third parallel system (theme-driven; document as exception).
13. Review section / list shell in `.st-surface` repeat shadow `0 1px 2px` again instead of referencing app tokens.
14. Map marker dots (`near-map-*`) use ad hoc box-shadows — decoupled from PM shell.
15. `PlatformChrome` uses `bg-zinc-950` while `pm-visual-platform` sets `--pm-platform-canvas` — related but not token-linked in Tailwind.
16. `EmailVerificationBanner` / dashboard shell stack on `zinc-950` without a single “platform canvas” class token in Tailwind theme.
17. Marketing `pm-marketing-shell` gradient is separate from `--background` / `--warm-surface`.
18. Instrument Serif vs Geist: editorial headings use `font-serif` in some routes and ad hoc `font-serif text-3xl` elsewhere.
19. `text-(--brand-ink)` vs `text-stone-900` vs `text-amber-950` used as “primary text” in neighboring components.
20. `tracking-wide` vs `tracking-[0.22em]` vs `tracking-tight` on headings without a documented display scale.

### B. Spacing & layout drift (21–45)

21. `gap-1` / `gap-2` / `gap-3` / `gap-4` used without mapping to a named scale in marketing vs dashboard.
22. `mt-6` / `mt-8` / `mt-10` / `mt-12` section rhythm inconsistent between `app/page.tsx` sections.
23. `max-w-6xl` vs `max-w-5xl` vs `max-w-4xl` / `max-w-md` used as page shells without a table of when to use which.
24. `px-4` appears on mobile drawers; `px-5` on headers — mixed.
25. `py-16` vs `py-20` vs `py-24` hero sections — no single “section vertical” token.
26. `min-h-11` on buttons vs `min-h-12` on mobile nav links — two touch targets.
27. `h-14` header vs `h-16` marketing header — two header heights.
28. `sm:h-18` in site header (non-standard Tailwind) vs `h-14` platform header.
29. Card grids: `gap-6`, `gap-8`, `gap-10` mixed in marketplace vs marketing.
30. `space-y-14` in shop vs `space-y-8` elsewhere — vertical list rhythm drift.
31. `p-3` mobile nav vs `p-5` cards — informal nesting scale.
32. Footer / bridge sections use `py-16` while others use `py-20`.
33. `mx-auto` + `max-w-*` repeated hundreds of times instead of a `Section` primitive.
34. `flex-wrap` + `gap-2` filter bars vs `gap-4` forms — inconsistent density.
35. Tables (`data-table`) use internal padding not aligned to `--pm-space-*`.
36. Admin pages mix `px-6` layout with marketing `px-8`.
37. `checkout/success` stacks buttons with `gap-3` while `error` uses `gap-3` — OK, but `not-found` previously mixed gap tokens.
38. `early-access-form` uses custom spacing scale on inputs.
39. `cart-contents` uses card-like borders with different radii than `ui.card`.
40. `classes` discovery filters use different label spacing than `marketplace` filters (both use `ui.label` now in places, not all).
41. `login-inner` / `register-form` diverge from `ui.input` padding.
42. `studio-panel-shell` vertical padding vs `dashboard` child `px-0` full-bleed — intentional but visually abrupt.
43. `breadcrumbs` margin-top inconsistent across dashboard routes.
44. `promo-countdown` chip spacing vs `ui.chip` — parallel styling.
45. `review-summary` star row spacing vs booking panels.

### C. Buttons & CTAs (46–62)

46. Raw `rounded-full` + `bg-amber-950` duplicated outside `ui.buttonPrimary`.
47. Ghost buttons sometimes `rounded-lg` (`ui.buttonGhost`) vs nav `rounded-lg` without shared `navLink` on studio chrome before this change.
48. Destructive actions sometimes `text-red-600` buttons vs `chipDanger` vs plain `<button className="text-red-…">`.
49. Loading states: some use `Spinner` + `disabled`, others swap label text only.
50. `Link` styled as button vs `<button>` — mixed; no single `Button` component.
51. Admin tables use `<button className="text-xs underline">` for actions — off system.
52. `confirm-action-modal` uses its own button classes.
53. `resolve-webhook-task-button` custom colors.
54. Stripe / external CTAs sometimes `target="_blank"` without shared icon suffix pattern.
55. `add-to-calendar-buttons` correctly uses `getUi()` — good pattern, not universal.
56. `WearOutboundLink` (wear — excluded) duplicates link styling elsewhere for external URLs in non-wear? (audit ongoing.)
57. `studio-appearance-client` save row uses platform UI while preview is theme — acceptable split.
58. `vendor-booking-actions` multiple button variants in one row without spacing token.
59. `my-bookings` reschedule opens panel with different button hierarchy than marketplace.
60. `pricing` page CTAs vs homepage hero CTAs — marketing tokens differ (`ui` vs inline).
61. `unauthorized-admin` uses stacked full-width buttons with custom borders.
62. `error.tsx` vs `not-found.tsx` — both fixed to prefer `ui.*` for primary/secondary where applicable.

### D. Forms & inputs (63–78)

63. `ui.input` vs raw `className="mt-1 w-full border..."` in older forms.
64. `select` default styling in marketplace filters vs native minimal styling in some admin pages.
65. Checkbox / radio patterns not centralized (Stripe connect, feature flags).
66. `textarea` rows and `resize` behavior inconsistent.
67. Error text: `ui.errorText` vs `text-red-600` vs `text-red-400` (dark).
68. Helper copy: `ui.helper` vs `text-sm text-stone-500` duplicated.
69. `label` + control gap: sometimes `mt-1`, sometimes `mt-2`, sometimes none.
70. Inline validation vs submit-only validation — interaction model differs by form.
71. `commission-form` numeric inputs vs `marketplace` price inputs — different width constraints.
72. `register-form` password fields vs `login-inner` — structure mismatch.
73. `booking-form` uses section headings without shared `overline` pattern everywhere.
74. `filter-collapse` animation + spacing unlike `marketplace` filter sheet.
75. `search` inputs: icon placement not standardized (some pages lack search).
76. `File` / image upload zones: `studio-brand-image-field` vs `studio-template-gallery` — different dropzone chrome.
77. `studio-settings-client` long form vs `studio-public-services` short form — no stepped wizard pattern.
78. Autocomplete / combobox — not present as a system component.

### E. Cards, elevation, borders (79–92)

79. Multiple card shadows before consolidation: `shadow-sm`, `shadow-[0_2px_24px_…]`, `shadow-xl` (drawer), map pins, etc.
80. Border opacity: `border-stone-200/80` vs `/60` vs `/90` without naming.
81. `ring-1` vs `border` for chips — two outline systems.
82. `backdrop-blur-xl` on header vs `backdrop-blur-md` on platform header.
83. Dividers: `border-b`, `hr`, `divide-y` mixed.
84. `rounded-2xl` images in marketing vs `rounded-3xl` cards previously — image vs container radius mismatch.
85. `overflow-hidden` on cards sometimes omitted → inconsistent clipping.
86. Hover on tiles: border color vs shadow vs translate — not one rule historically.
87. `stat-card` admin uses its own surface.
88. `time-series-chart` container radius independent.
89. `data-table` wrapper radius vs card radius.
90. `modal` / dialog patterns (confirm modal) vs full-page states.
91. `loading.tsx` skeleton blocks use `rounded-md` vs cards `rounded-*xl`.
92. `skeleton.tsx` line heights vs text they mimic.

### F. Typography (93–105)

93. `text-2xl` page titles vs `text-3xl` vs `font-serif` display — multiple hierarchies.
94. `uppercase tracking-wide` overlines vs `tracking-[0.28em]` marketing — two overline systems.
95. `text-stone-600` body vs `text-zinc-400` platform body — intentional mode split, needs documented mapping.
96. `leading-6` vs `leading-relaxed` vs `leading-snug` in descriptions.
97. `font-medium` vs `font-semibold` on section titles — inconsistent.
98. `text-xs` caps labels vs `text-sm` caps — duplicate semantics.
99. Numeric tabular data sometimes `font-mono`, sometimes not.
100. Link underline: `underline-offset-4` vs `underline` only — mixed.
101. Truncation: `truncate` vs `line-clamp-2` for titles — not standardized.
102. `prose` class not used; long legal/copy pages might be raw `<p>` stacks.
103. Quote / testimonial styles absent as a component.
104. Price display: `formatMoney` + `text-lg` vs small caps — marketplace vs cart drift.
105. Breadcrumb font size/weight vs page title — no fixed ratio.

### G. Motion & interaction (106–115)

106. `transition` duration: `150ms`, `200ms`, `300ms`, `500ms` across hover states.
107. `hover:scale-[1.02]` on product tiles vs none on marketplace tiles — inconsistency.
108. `active:` states rarely defined for buttons.
109. `focus-visible` partially applied via `ui` tokens; many raw links lack it.
110. Drawer / mobile menu: `duration-200` transform; modals may differ.
111. `prefers-reduced-motion` global override exists — good; not all Framer usages verified.
112. Loading: `Spinner` size not standardized (sm/md).
113. Empty states: some pages plain text; others illustration+CTA — pattern not unified.
114. Error boundaries: `error.tsx` vs inline `setErr` — two error UX models.
115. Toast / banner stack — `email-verification` vs future toasts — not one system.

### H. Architecture & duplication (116–125+)

116. `ui` vs `studioUi` naming confusion for new contributors.
117. `getUi(mode)` only used in calendar buttons — most code imports `ui` or `platformUi` directly.
118. No single `Button` React component; class strings only — harder to enforce.
119. `cn()` utility used in some places; long template strings elsewhere.
120. Admin feature tables duplicate column patterns vs `data-table`.
121. Multiple chart wrappers (`time-series-chart`, finance command center) with separate padding.
122. `StudioThemeRoot` injects CSS variables — parallel to PM marketing variables — by design but increases cognitive load.
123. `business-template-visuals` card backgrounds use `neutral-900` gradients — off warm marketing palette (template previews).
124. Icon usage: inline SVG in headers vs none in buttons — no lucide/react-icon standard.
125. **Wearables excluded:** entire parallel nav, cart, PDP, and admin editors would duplicate findings; intentionally not counted here.

*(Additional pages/components continue this pattern; full migration is tracked by replacing ad hoc class strings with `studioUi` / `platformUi` and `--pm-*`.)*

---

## Phase 2 — The law (enforced tokens)

### Spacing (strict steps, px)

Only these steps may be used for **new** PM shell work: **4, 8, 12, 16, 24, 32, 48, 64** → mapped in CSS as:

- `--pm-space-1` … `--pm-space-16` (see `globals.css`).

Legacy Tailwind spacing (`p-5` = 20px) is **not** added to the scale; migrate to the nearest step when touching a file.

### Typography

- **Sans:** Geist (`--font-geist-sans`) — UI body and controls.
- **Serif:** Instrument Serif (`--font-instrument-serif`) — marketing display only.
- **Mono:** Geist Mono — IDs, codes, diagnostics.
- **Hierarchy (target):** overline (`ui.overline`) → H1 display → section title (`text-xl`/`text-2xl` font-semibold) → body (`text-sm`/`text-base`) → helper (`ui.helper`).

### Color

- **Marketing / studio tools (warm):** stone neutrals + amber action (`studioUi.buttonPrimary`).
- **Platform (system):** zinc canvas + zinc text (`platformUi`).
- **Semantic:** `ui.errorText` / `successText` (+ `*Dark` variants for dark surfaces).
- **Studio storefront:** driven by `--st-*` theme variables (exception layer).

### Radii

- **Cards / tiles / platform cards:** `var(--pm-radius-card)` (16px).
- **Controls / ghost / nav links:** `var(--pm-radius-control)` (12px).
- **Primary marketing actions:** pill → `var(--pm-radius-pill)`.

### Shadows

Exactly **two** elevations for PM shell components:

- `--pm-shadow-rest` — default surfaces.
- `--pm-shadow-lift` — hover / emphasis (e.g. tile hover).

Platform dark mode overrides both in `.pm-visual-platform`.

### Components (single system)

- **Buttons:** `studioUi.buttonPrimary | buttonSecondary | buttonGhost | buttonMarketing` or `platformUi` equivalents; **no raw duplicate stacks** in new/edited code.
- **Inputs:** `ui.input` / `platformUi.input`.
- **Cards:** `ui.card` / `cardMuted` / platform variants.
- **Navigation:** `platformUi.navLink` for platform top nav; marketing nav continues `ui.buttonGhost` + active state until a `NavLink` component exists.

### Icons

- Inline SVG stroke `2` in headers; **do not** mix filled/lucide until a standard icon package is adopted project-wide.

---

## Phase 3–7 — Structure, interactions, refactor, QA

- **Page structure (target):** header / context → primary action → supporting content → secondary actions. Apply when redesigning a route; not forced in one pass.
- **Interactions:** hover = border or shadow lift (tiles), opacity (studio theme buttons), background tint (platform); focus = `focus-visible` rings as in `ui-styles`; loading = disable + `Spinner`; empty = title + helper + one primary CTA using `ui` tokens.
- **Refactor rule:** when editing any non-wear file, replace local duplicates with `ui` / `platformUi` / `--pm-*` first.
- **QA personas:** new user (marketing funnel), returning (dashboard), admin (zinc tables) — verify header height, container width, and button classes per mode.

---

## Changelog (this iteration)

| Area | Change |
|------|--------|
| `globals.css` | Added `--pm-space-*`, `--pm-radius-*`, `--pm-shadow-rest/lift`; platform overrides shadows. |
| `lib/ui-styles.ts` | All core surfaces use CSS variables; added `buttonMarketing`, `navLink`; unified `pageContainer`; `UiTokenSet` is union type. |
| `platform-header.tsx` | Uses `platformUi.navLink`; width/padding aligned to `max-w-6xl` + pm spacing. |
| `site-header.tsx` | Marketing CTA uses `ui.buttonMarketing`. |
| `not-found.tsx` | Primary CTA uses `ui.buttonPrimary`; shell padding uses pm tokens. |
| `error.tsx` | Vertical padding uses `--pm-space-16`. |
| `early-access-form.tsx` | Primary CTA → `ui.buttonPrimary`; optional panel → `ui.cardMuted`; interest chips → `ui.chip` + on/off; spacing/radius via `--pm-*` where touched. |
| `login-inner.tsx` / `register-form.tsx` | Success callouts → `ui.cardMuted` + emerald tint; OAuth divider → `ui.overline`; control gap `mt-2`; register role `<select>` → `ui.select`. |
| `forgot-password-inner.tsx` | Input label gap `mt-2`. |
| `auth-shell.tsx` | Shell padding uses `--pm-space-*`. |
| `onboarding-share-banner.tsx` | Callout radius/padding + copy button use `--pm-radius-*`, `--pm-shadow-rest`, `min-h-11`. |
| `dashboard/page.tsx` | Vendor + admin/customer shells use `--pm-space-*`; upgrade nudge uses `--pm-radius-card`. |
| `cart-contents.tsx` | Line items → `ui.card` with compact padding override; promo block → `ui.cardMuted`; alerts/thumbs/qty fields use `--pm-radius-*` / `--pm-shadow-rest`. |

---

## Compliance

**FAIL** if a new PR introduces:

- A third PM shadow for shell components.
- A new card radius outside `--pm-radius-card` / `--pm-radius-control` / `--pm-radius-pill` without documenting an exception (e.g. map markers).
- Raw primary button stacks duplicating `ui.buttonPrimary` in non-wear code touched for other reasons.

**Wearables:** unchanged by this document’s enforcement pass unless explicitly scheduled.
