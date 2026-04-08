/** Shared class strings — design system surface. Prefer these over one-off duplicates. */

const fieldControl =
  "min-h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-base text-stone-900 shadow-sm transition placeholder:text-stone-400 focus:border-amber-600/40 focus:outline-none focus:ring-2 focus:ring-amber-900/15";

export const ui = {
  /** Primary actions: checkout, submit auth, pay */
  buttonPrimary:
    "inline-flex min-h-11 w-full sm:w-auto items-center justify-center rounded-full bg-amber-950 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-amber-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-950 disabled:pointer-events-none disabled:opacity-45",

  /** Secondary: alternate path, less emphasis */
  buttonSecondary:
    "inline-flex min-h-11 w-full sm:w-auto items-center justify-center rounded-full border border-stone-300 bg-white px-6 py-2.5 text-sm font-medium text-stone-800 transition hover:border-amber-400/60 hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800",

  /** Text-style navigation buttons */
  buttonGhost:
    "inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-100 hover:text-amber-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800",

  input: fieldControl,

  /** Native `<select>` — same surface as inputs */
  select: fieldControl,

  /** Pill toggles (e.g. kiln firing status) */
  chip: "rounded-full px-3 py-1 text-xs font-medium transition",
  chipOff: "bg-stone-100 text-stone-700 hover:bg-stone-200",
  chipOn: "bg-amber-950 text-white",
  chipDanger: "rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-800 transition hover:bg-red-100",

  /** Compact status chips (e.g. kiln piece queue) */
  chipSm: "rounded px-2 py-0.5 text-xs transition",
  chipSmOff: "bg-white text-stone-600 ring-1 ring-stone-200",
  chipSmOn: "bg-amber-800 text-white",

  label: "block text-sm font-medium text-stone-700",

  helper: "text-sm text-stone-500",

  card: "rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm sm:p-6",

  cardMuted: "rounded-2xl border border-stone-200/80 bg-stone-50/80 p-5 sm:p-6",

  pageContainer: "mx-auto w-full max-w-6xl px-4 sm:px-6",

  narrowContainer: "mx-auto w-full max-w-md px-4 sm:px-6",

  /** Product / experience grid cards */
  tile:
    "group block overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-sm transition hover:border-amber-300/50 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900",

  errorText: "text-sm font-medium text-red-700",
  errorTextDark: "text-sm font-medium text-red-300",

  successText: "text-sm font-medium text-emerald-800",
  successTextDark: "text-sm font-medium text-emerald-300",

  overline: "text-xs font-medium uppercase tracking-wide text-stone-500",
} as const;
