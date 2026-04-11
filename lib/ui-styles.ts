import type { VisualMode } from "@/lib/visual-mode";

/**
 * PotteryMania UI tokens — single source for non–studio-theme surfaces.
 * Structural values map to `app/globals.css` (`--pm-*`). Visual modes only swap palette.
 *
 * @see docs/DESIGN_SYSTEM.md
 */

const controlRadius = "rounded-[length:var(--pm-radius-control)]";
const cardRadius = "rounded-[length:var(--pm-radius-card)]";
const pillRadius = "rounded-[length:var(--pm-radius-pill)]";

const shadowRest = "shadow-[var(--pm-shadow-rest)]";

const studioFieldControl = `min-h-11 w-full ${controlRadius} border border-stone-200/90 bg-white px-[var(--pm-space-3)] py-[var(--pm-space-2)] text-base text-stone-900 ${shadowRest} transition placeholder:text-stone-400 focus:border-amber-600/40 focus:outline-none focus:ring-2 focus:ring-amber-900/12`;

const platformFieldControl = `min-h-11 w-full ${controlRadius} border border-white/10 bg-zinc-900/80 px-[var(--pm-space-3)] py-[var(--pm-space-2)] text-base text-zinc-100 shadow-none transition placeholder:text-zinc-500 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/25`;

const focusRingAmber = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-950";
const focusRingAmberSoft = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800";
const focusRingZinc = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300";
const focusRingZincMuted = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400";

/** Warm / artistic — marketing, `/studios/…`, `/classes/…` customer surfaces, cart, etc. */
export const studioUi = {
  buttonPrimary: `inline-flex min-h-11 w-full sm:w-auto items-center justify-center ${pillRadius} bg-amber-950 px-[var(--pm-space-6)] py-[var(--pm-space-2)] text-sm font-medium text-white ${shadowRest} transition hover:bg-amber-900 ${focusRingAmber} disabled:pointer-events-none disabled:opacity-45`,

  buttonSecondary: `inline-flex min-h-11 w-full sm:w-auto items-center justify-center ${pillRadius} border border-stone-200 bg-white px-[var(--pm-space-6)] py-[var(--pm-space-2)] text-sm font-medium text-stone-800 transition hover:border-amber-300/60 hover:bg-amber-50/40 ${focusRingAmberSoft}`,

  buttonGhost: `inline-flex min-h-11 items-center justify-center ${controlRadius} px-[var(--pm-space-3)] text-sm font-medium text-stone-600 transition hover:bg-stone-100 hover:text-amber-950 ${focusRingAmberSoft}`,

  /** Marketing header / hero — brand ink fill (not amber). */
  buttonMarketing: `inline-flex min-h-11 w-full sm:w-auto max-w-44 sm:max-w-none items-center justify-center truncate ${pillRadius} bg-(--brand-ink) px-[var(--pm-space-3)] text-xs font-medium text-white sm:px-[var(--pm-space-6)] sm:text-sm ${shadowRest} transition hover:bg-[#3a241a] ${focusRingAmber} disabled:pointer-events-none disabled:opacity-45`,

  input: studioFieldControl,
  select: studioFieldControl,

  chip: `${pillRadius} px-[var(--pm-space-3)] py-[var(--pm-space-1)] text-xs font-medium transition`,
  chipOff: "bg-stone-100 text-stone-700 hover:bg-stone-200",
  chipOn: "bg-amber-950 text-white",
  chipDanger: `${pillRadius} bg-red-50 px-[var(--pm-space-3)] py-[var(--pm-space-1)] text-xs font-medium text-red-800 transition hover:bg-red-100`,

  chipSm: "rounded px-2 py-0.5 text-xs transition",
  chipSmOff: "bg-white text-stone-600 ring-1 ring-stone-200",
  chipSmOn: "bg-amber-900 text-white",

  label: "block text-sm font-medium text-stone-700",
  helper: "text-sm text-stone-500",

  card: `${cardRadius} border border-stone-200/80 bg-white p-[var(--pm-space-6)] ${shadowRest}`,
  cardMuted: `${cardRadius} border border-stone-200/70 bg-stone-50/90 p-[var(--pm-space-6)]`,

  pageContainer: "mx-auto w-full max-w-6xl px-[var(--pm-space-4)] sm:px-[var(--pm-space-8)] lg:px-[var(--pm-space-12)]",
  narrowContainer: "mx-auto w-full max-w-md px-[var(--pm-space-4)] sm:px-[var(--pm-space-6)]",

  tile: `group block overflow-hidden ${cardRadius} border border-stone-200/80 bg-white ${shadowRest} transition hover:border-amber-200/70 hover:shadow-[var(--pm-shadow-lift)] ${focusRingAmber}`,

  errorText: "text-sm font-medium text-red-700",
  errorTextDark: "text-sm font-medium text-red-300",

  successText: "text-sm font-medium text-emerald-800",
  successTextDark: "text-sm font-medium text-emerald-300",

  overline: "text-xs font-medium uppercase tracking-wide text-stone-500",

  /** Same affordance as `buttonGhost` — exists so `getUi()` has a stable nav shape on both modes. */
  navLink: `inline-flex items-center ${controlRadius} px-[var(--pm-space-3)] py-[var(--pm-space-2)] text-sm font-medium text-stone-600 transition hover:bg-stone-100 hover:text-amber-950 ${focusRingAmberSoft}`,
} as const;

/** System / internal tools only — do not use on public studio storefronts. */
export const platformUi = {
  buttonPrimary: `inline-flex min-h-11 w-full sm:w-auto items-center justify-center ${pillRadius} bg-zinc-100 px-[var(--pm-space-6)] py-[var(--pm-space-2)] text-sm font-medium text-zinc-950 transition hover:bg-white ${focusRingZinc} disabled:pointer-events-none disabled:opacity-45`,

  buttonMarketing: `inline-flex min-h-11 w-full sm:w-auto items-center justify-center ${pillRadius} bg-zinc-100 px-[var(--pm-space-6)] py-[var(--pm-space-2)] text-sm font-medium text-zinc-950 transition hover:bg-white ${focusRingZinc} disabled:pointer-events-none disabled:opacity-45`,

  buttonSecondary: `inline-flex min-h-11 w-full sm:w-auto items-center justify-center ${pillRadius} border border-white/15 bg-transparent px-[var(--pm-space-6)] py-[var(--pm-space-2)] text-sm font-medium text-zinc-100 transition hover:border-white/25 hover:bg-white/5 ${focusRingZincMuted}`,

  buttonGhost: `inline-flex min-h-11 items-center justify-center ${controlRadius} px-[var(--pm-space-3)] text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100 ${focusRingZincMuted}`,

  /** Top nav links — platform chrome only. */
  navLink: `inline-flex items-center ${controlRadius} px-[var(--pm-space-3)] py-[var(--pm-space-2)] text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100`,

  input: platformFieldControl,
  select: platformFieldControl,

  chip: `${pillRadius} px-[var(--pm-space-3)] py-[var(--pm-space-1)] text-xs font-medium transition`,
  chipOff: "bg-white/5 text-zinc-300 hover:bg-white/10",
  chipOn: "bg-zinc-100 text-zinc-950",
  chipDanger: `${pillRadius} bg-red-500/10 px-[var(--pm-space-3)] py-[var(--pm-space-1)] text-xs font-medium text-red-300 transition hover:bg-red-500/15`,

  chipSm: "rounded px-2 py-0.5 text-xs transition",
  chipSmOff: "bg-zinc-900 text-zinc-400 ring-1 ring-white/10",
  chipSmOn: "bg-zinc-100 text-zinc-950",

  label: "block text-sm font-medium text-zinc-300",
  helper: "text-sm text-zinc-500",

  card: `${cardRadius} border border-white/10 bg-zinc-900/40 p-[var(--pm-space-6)] backdrop-blur-sm ${shadowRest}`,
  cardMuted: `${cardRadius} border border-white/10 bg-zinc-950/60 p-[var(--pm-space-6)]`,

  pageContainer: "mx-auto w-full max-w-6xl px-[var(--pm-space-4)] sm:px-[var(--pm-space-8)] lg:px-[var(--pm-space-12)]",
  narrowContainer: "mx-auto w-full max-w-md px-[var(--pm-space-4)] sm:px-[var(--pm-space-6)]",

  tile: `group block overflow-hidden ${cardRadius} border border-white/10 bg-zinc-900/30 transition hover:border-white/20 hover:bg-zinc-900/50 ${focusRingZincMuted}`,

  errorText: "text-sm font-medium text-red-400",
  errorTextDark: "text-sm font-medium text-red-300",

  successText: "text-sm font-medium text-emerald-400",
  successTextDark: "text-sm font-medium text-emerald-300",

  overline: "text-xs font-medium uppercase tracking-wide text-zinc-500",
} as const;

/** @deprecated Prefer `studioUi` or `getUi("studio")` for clarity. Alias preserved for marketing + studio pages. */
export const ui = studioUi;

export function getUi(mode: VisualMode): UiTokenSet {
  return mode === "platform" ? platformUi : studioUi;
}

export type UiTokenSet = typeof studioUi | typeof platformUi;
