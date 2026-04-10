import type { VisualMode } from "@/lib/visual-mode";

/**
 * Design tokens are split by **visual mode**:
 * - `studioUi` — warm ceramic surfaces for marketing + **public studio** experiences.
 * - `platformUi` — royal black / zinc system chrome for **PotteryMania tools only**.
 *
 * Default export `ui` remains **studio** for backward compatibility on studio-facing pages.
 * Platform code should import `platformUi` or call `getUi("platform")`.
 */

const studioFieldControl =
  "min-h-11 w-full rounded-xl border border-stone-200/90 bg-white px-3.5 py-2 text-base text-stone-900 shadow-[0_1px_2px_rgba(44,24,16,0.05)] transition placeholder:text-stone-400 focus:border-amber-600/40 focus:outline-none focus:ring-2 focus:ring-amber-900/12";

const platformFieldControl =
  "min-h-11 w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3.5 py-2 text-base text-zinc-100 shadow-none transition placeholder:text-zinc-500 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/25";

/** Warm / artistic — marketing, `/studios/…`, `/classes/…` customer surfaces, cart, etc. */
export const studioUi = {
  buttonPrimary:
    "inline-flex min-h-11 w-full sm:w-auto items-center justify-center rounded-full bg-amber-950 px-6 py-2.5 text-sm font-medium text-white shadow-[0_1px_2px_rgba(69,26,3,0.2)] transition hover:bg-amber-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-950 disabled:pointer-events-none disabled:opacity-45",

  buttonSecondary:
    "inline-flex min-h-11 w-full sm:w-auto items-center justify-center rounded-full border border-stone-200 bg-white px-6 py-2.5 text-sm font-medium text-stone-800 transition hover:border-amber-300/60 hover:bg-amber-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800",

  buttonGhost:
    "inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-sm font-medium text-stone-600 transition hover:bg-stone-100 hover:text-amber-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800",

  input: studioFieldControl,
  select: studioFieldControl,

  chip: "rounded-full px-3 py-1 text-xs font-medium transition",
  chipOff: "bg-stone-100 text-stone-700 hover:bg-stone-200",
  chipOn: "bg-amber-950 text-white",
  chipDanger: "rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-800 transition hover:bg-red-100",

  chipSm: "rounded px-2 py-0.5 text-xs transition",
  chipSmOff: "bg-white text-stone-600 ring-1 ring-stone-200",
  chipSmOn: "bg-amber-900 text-white",

  label: "block text-sm font-medium text-stone-700",
  helper: "text-sm text-stone-500",

  card: "rounded-3xl border border-stone-200/80 bg-white p-5 shadow-[0_2px_24px_rgba(44,24,16,0.05)] sm:p-6",
  cardMuted: "rounded-3xl border border-stone-200/70 bg-stone-50/90 p-5 sm:p-6",

  pageContainer: "mx-auto w-full max-w-6xl px-5 sm:px-8 lg:px-10",
  narrowContainer: "mx-auto w-full max-w-md px-4 sm:px-6",

  tile:
    "group block overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-[0_1px_3px_rgba(44,24,16,0.05)] transition hover:border-amber-200/70 hover:shadow-[0_8px_30px_rgba(120,53,15,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900",

  errorText: "text-sm font-medium text-red-700",
  errorTextDark: "text-sm font-medium text-red-300",

  successText: "text-sm font-medium text-emerald-800",
  successTextDark: "text-sm font-medium text-emerald-300",

  overline: "text-xs font-medium uppercase tracking-wide text-stone-500",
} as const;

/** System / internal tools only — do not use on public studio storefronts. */
export const platformUi = {
  buttonPrimary:
    "inline-flex min-h-11 w-full sm:w-auto items-center justify-center rounded-full bg-zinc-100 px-6 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300 disabled:pointer-events-none disabled:opacity-45",

  buttonSecondary:
    "inline-flex min-h-11 w-full sm:w-auto items-center justify-center rounded-full border border-white/15 bg-transparent px-6 py-2.5 text-sm font-medium text-zinc-100 transition hover:border-white/25 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400",

  buttonGhost:
    "inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400",

  input: platformFieldControl,
  select: platformFieldControl,

  chip: "rounded-full px-3 py-1 text-xs font-medium transition",
  chipOff: "bg-white/5 text-zinc-300 hover:bg-white/10",
  chipOn: "bg-zinc-100 text-zinc-950",
  chipDanger: "rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300 transition hover:bg-red-500/15",

  chipSm: "rounded px-2 py-0.5 text-xs transition",
  chipSmOff: "bg-zinc-900 text-zinc-400 ring-1 ring-white/10",
  chipSmOn: "bg-zinc-100 text-zinc-950",

  label: "block text-sm font-medium text-zinc-300",
  helper: "text-sm text-zinc-500",

  card: "rounded-2xl border border-white/10 bg-zinc-900/40 p-5 backdrop-blur-sm sm:p-6",
  cardMuted: "rounded-2xl border border-white/10 bg-zinc-950/60 p-5 sm:p-6",

  pageContainer: "mx-auto w-full max-w-6xl px-4 sm:px-6",
  narrowContainer: "mx-auto w-full max-w-md px-4 sm:px-6",

  tile:
    "group block overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/30 transition hover:border-white/20 hover:bg-zinc-900/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400",

  errorText: "text-sm font-medium text-red-400",
  errorTextDark: "text-sm font-medium text-red-300",

  successText: "text-sm font-medium text-emerald-400",
  successTextDark: "text-sm font-medium text-emerald-300",

  overline: "text-xs font-medium uppercase tracking-wide text-zinc-500",
} as const;

/** @deprecated Prefer `studioUi` or `getUi("studio")` for clarity. Alias preserved for marketing + studio pages. */
export const ui = studioUi;

export function getUi(mode: VisualMode): UiTokenSet {
  return (mode === "platform" ? platformUi : studioUi) as UiTokenSet;
}

export type UiTokenSet = typeof studioUi;
