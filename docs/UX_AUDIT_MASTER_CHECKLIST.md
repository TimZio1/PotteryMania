# PotteryMania — UX Audit: Remaining Tasks

**No open items** from the last batch (motion, hero photo, reduced-motion note, named testimonials, route metadata, testimonial dedupe).

---

## Critical

- [x] ~~**UXB-001** | Wear order lifecycle modal — add `role="dialog"`, `aria-modal`, focus trap, Escape handler (`components/admin/wear-order-detail-client.tsx`)~~
- [x] ~~**UXB-002** | Vendor booking actions — add loading/disabled states to Approve, Decline, Cancel, Retry, Sync buttons (`components/dashboard/vendor-booking-actions.tsx`)~~
- [x] ~~**UXB-003** | Add dynamic SEO metadata (`generateMetadata`) to marketplace product page, class detail page, studio profile page~~

## High

- [x] ~~**UXB-004** | Wear shop grid — add "Image coming soon" placeholder when product has no image (`app/wear/shop/page.tsx`)~~
- [x] ~~**UXB-005** | Replace ~15 raw "Loading..." text strings with Spinner/Skeleton components across pages and components~~
- [x] ~~**UXB-006** | Studio edit form — replace raw Prisma key labels (`displayName`, `addressLine1`) with human-readable labels, add `type`/`required` (`dashboard/studio/[studioId]/page.tsx`)~~
- [x] ~~**UXB-007** | Fix silent API error handling — show error feedback in `resolve-webhook-task-button.tsx`, `kiln-manager.tsx`, `experiments-admin-client.tsx`)~~
- [x] ~~**UXB-008** | Add meaningful `alt` text to product/class/studio images (use titles instead of `alt=""`) across marketplace, classes, studios pages~~

## Medium

- [x] ~~**UXA-019** | Extend `ui-styles.ts` with dark-mode error/success tokens (`errorTextDark`, `successTextDark`) for wear theme~~
- [x] ~~**UXA-023** | Add Google OAuth social login via NextAuth provider~~
- [x] ~~**UXA-026** | Add animation/motion system (framer-motion) for modal enter/exit, page transitions, list stagger (`confirm-action-modal`, wear lifecycle modal, `MarketingPageTransition`, `ClarityCardsStagger`, `FeaturedStudiosRail`; `useReducedMotion` + `lib/motion-ui.ts`)~~
- [x] ~~**UXA-027** | Make wear cart cancelled-session banner more prominent — add explanation and retry CTA~~
- [x] ~~**UXA-029** | Replace SVG hero illustration with real studio photography on home page (`components/marketing/hero-photography.tsx`, Unsplash)~~
- [x] ~~**UXA-030** | Add breadcrumb component for studio detail, product detail, class detail, dashboard sub-pages (dashboard: `DashboardRouteBreadcrumbs` + `StudioPanelShell`; public detail pages: verify existing `Breadcrumbs` where applicable)~~
- [x] ~~**UXB-009** | Make clickable table rows keyboard-accessible — add `tabIndex`, `role`, `onKeyDown` (`studio-bookings-client.tsx`, `studio-shop-client.tsx`)~~
- [x] ~~**UXB-010** | Show product thumbnails in marketplace cart line items (`app/cart/cart-contents.tsx`)~~
- [x] ~~**UXB-011** | Add `aria-controls` + `id` to `FilterCollapse` toggle and collapsible panel~~
- [x] ~~**UXB-012** | Add accessible `aria-label` to review star ratings (`components/review-summary.tsx`)~~
- [x] ~~**UXB-013** | Add `aria-describedby` linking modal description in `confirm-action-modal.tsx`)~~
- [x] ~~**UXB-015** | Fix small touch targets — wear cart quantity input, "Remove" link, photo remove button~~
- [x] ~~**UXB-016** | Add Stripe trust badge / lock icon near checkout buttons on both carts~~

## Low

- [x] ~~**UXA-033** | `prefers-reduced-motion` — global CSS in `globals.css` + `useReducedMotion` on motion surfaces~~
- [x] ~~**UXA-034** | Wear subnav cart count hydration flash — use cookie-based count hint for SSR~~
- [x] ~~**UXA-035** | Replace anonymous/duplicate testimonials with named studio testimonials (`lib/marketing-testimonials.ts`; pre-launch fictional personas, clearly attributed)~~
- [x] ~~**UXB-014** | Replace ad-hoc styling in admin components (kiln-manager, experiments, marketplace-controls) with `ui.*` tokens (+ vendor domains card inputs; extended `ui-styles` with `select`, chip tokens)~~
- [x] ~~**UXB-017** | Add `aria-label` to admin sidebar `<nav>` element~~
- [x] ~~**UXB-018** | Add page-specific metadata to ~70 pages that inherit generic root defaults (`lib/seo-routes.ts`, `lib/dashboard-metadata.ts`, admin layout + pages, dashboard layout + pages, auth/cart/checkout/my-* pages)~~
- [x] ~~**UXB-019** | Studio create form — add `type="email"` on email field, URL validation~~
- [x] ~~**UXB-020** | Adopt Skeleton/SkeletonText in components (currently only used in loading.tsx files)~~
- [x] ~~**UXB-021** | Wear PDP — add image placeholder when primary image is missing~~
- [x] ~~**UXB-022** | Deduplicate anonymous testimonials between home page and early-access page (shared `STUDIO_TESTIMONIALS`)~~
