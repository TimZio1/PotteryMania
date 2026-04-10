/**
 * PotteryMania has two visual environments that must not leak into each other:
 *
 * - **platform**: PotteryMania system UI (dashboard, admin, internal tools).
 *   Strict, minimal, non–studio-customizable.
 * - **studio**: Public studio identity (warm/neutral, brand-led).
 *
 * Use `getUi(mode)` or `platformUi` / `studioUi` from `@/lib/ui-styles`.
 * Wrap platform routes with `data-pm-visual="platform"` (see `PlatformChrome` or dashboard layout).
 */

export type VisualMode = "platform" | "studio";

/** HTML data attribute for debugging, E2E, and future CSS hooks. */
export const PM_VISUAL_ATTR = "data-pm-visual" as const;

export function pmVisualDataAttr(mode: VisualMode): Record<typeof PM_VISUAL_ATTR, VisualMode> {
  return { [PM_VISUAL_ATTR]: mode };
}
