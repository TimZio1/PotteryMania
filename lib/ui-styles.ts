import type { VisualMode } from "@/lib/visual-mode";

/**
 * PotteryMania Controlled Aesthetic Engine — UI Tokens
 *
 * ALL colors reference CSS custom properties from `globals.css`.
 * No hardcoded Tailwind color classes — the dark system is enforced globally.
 *
 * Radii: cards 12px, buttons 10px, inputs 8px — LOCKED.
 */

const cardRadius = "rounded-[var(--radius-card)]";
const buttonRadius = "rounded-[var(--radius-button)]";
const inputRadius = "rounded-[var(--radius-input)]";
const pillRadius = "rounded-[var(--radius-pill)]";

const shadowRest = "shadow-[var(--pm-shadow-rest)]";

const fieldControl = `min-h-11 w-full ${inputRadius} border border-[var(--border)] bg-[var(--surface)] px-[var(--pm-space-3)] py-[var(--pm-space-2)] text-base text-[var(--foreground)] ${shadowRest} transition placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-muted)]`;

const focusRing = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

/** Customer-facing surfaces — dark by default. */
export const studioUi = {
  buttonPrimary: `inline-flex min-h-11 w-full sm:w-auto items-center justify-center ${buttonRadius} bg-[var(--accent)] px-[var(--pm-space-6)] py-[var(--pm-space-2)] text-sm font-medium text-[var(--accent-contrast)] ${shadowRest} transition hover:bg-[var(--accent-hover)] ${focusRing} disabled:pointer-events-none disabled:opacity-45`,

  buttonSecondary: `inline-flex min-h-11 w-full sm:w-auto items-center justify-center ${buttonRadius} border border-[var(--border)] bg-[var(--surface)] px-[var(--pm-space-6)] py-[var(--pm-space-2)] text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--accent)] hover:bg-[var(--surface-elevated)] ${focusRing}`,

  buttonGhost: `inline-flex min-h-11 items-center justify-center ${buttonRadius} px-[var(--pm-space-3)] text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)] ${focusRing}`,

  buttonMarketing: `inline-flex min-h-11 w-full sm:w-auto max-w-44 sm:max-w-none items-center justify-center truncate ${buttonRadius} bg-[var(--accent)] px-[var(--pm-space-3)] text-xs font-medium text-[var(--accent-contrast)] sm:px-[var(--pm-space-6)] sm:text-sm ${shadowRest} transition hover:bg-[var(--accent-hover)] ${focusRing} disabled:pointer-events-none disabled:opacity-45`,

  input: fieldControl,
  select: fieldControl,

  chip: `${pillRadius} px-[var(--pm-space-3)] py-[var(--pm-space-1)] text-xs font-medium transition`,
  chipOff: "bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-elevated)]",
  chipOn: "bg-[var(--accent)] text-[var(--accent-contrast)]",
  chipDanger: `${pillRadius} bg-red-950/40 px-[var(--pm-space-3)] py-[var(--pm-space-1)] text-xs font-medium text-red-300 transition hover:bg-red-950/60`,

  chipSm: `${inputRadius} px-2 py-0.5 text-xs transition`,
  chipSmOff: "bg-[var(--surface)] text-[var(--muted)] ring-1 ring-[var(--border)]",
  chipSmOn: "bg-[var(--accent)] text-[var(--accent-contrast)]",

  label: "block text-sm font-medium text-[var(--foreground)]",
  helper: "text-sm text-[var(--muted)]",

  card: `${cardRadius} border border-[var(--border)] bg-[var(--surface)] p-[var(--pm-space-6)] ${shadowRest}`,
  cardMuted: `${cardRadius} border border-[var(--border)] bg-[var(--surface-elevated)] p-[var(--pm-space-6)]`,

  pageContainer: "mx-auto w-full max-w-6xl px-[var(--pm-space-4)] sm:px-[var(--pm-space-8)] lg:px-[var(--pm-space-12)]",
  narrowContainer: "mx-auto w-full max-w-md px-[var(--pm-space-4)] sm:px-[var(--pm-space-6)]",

  tile: `group block overflow-hidden ${cardRadius} border border-[var(--border)] bg-[var(--surface)] ${shadowRest} transition hover:border-[var(--accent)] hover:shadow-[var(--pm-shadow-lift)] ${focusRing}`,

  errorText: "text-sm font-medium text-red-400",
  errorTextDark: "text-sm font-medium text-red-300",

  successText: "text-sm font-medium text-emerald-400",
  successTextDark: "text-sm font-medium text-emerald-300",

  overline: "text-xs font-medium uppercase tracking-wide text-[var(--muted)]",

  navLink: `inline-flex items-center ${buttonRadius} px-[var(--pm-space-3)] py-[var(--pm-space-2)] text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)] ${focusRing}`,
} as const;

/** System/internal tools — same dark system. */
export const platformUi = {
  buttonPrimary: `inline-flex min-h-11 w-full sm:w-auto items-center justify-center ${buttonRadius} bg-[var(--accent)] px-[var(--pm-space-6)] py-[var(--pm-space-2)] text-sm font-medium text-[var(--accent-contrast)] ${shadowRest} transition hover:bg-[var(--accent-hover)] ${focusRing} disabled:pointer-events-none disabled:opacity-45`,

  buttonMarketing: `inline-flex min-h-11 w-full sm:w-auto items-center justify-center ${buttonRadius} bg-[var(--accent)] px-[var(--pm-space-6)] py-[var(--pm-space-2)] text-sm font-medium text-[var(--accent-contrast)] ${shadowRest} transition hover:bg-[var(--accent-hover)] ${focusRing} disabled:pointer-events-none disabled:opacity-45`,

  buttonSecondary: `inline-flex min-h-11 w-full sm:w-auto items-center justify-center ${buttonRadius} border border-[var(--border)] bg-[var(--surface)] px-[var(--pm-space-6)] py-[var(--pm-space-2)] text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--accent)] hover:bg-[var(--surface-elevated)] ${focusRing}`,

  buttonGhost: `inline-flex min-h-11 items-center justify-center ${buttonRadius} px-[var(--pm-space-3)] text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)] ${focusRing}`,

  navLink: `inline-flex items-center ${buttonRadius} px-[var(--pm-space-3)] py-[var(--pm-space-2)] text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]`,

  input: fieldControl,
  select: fieldControl,

  chip: `${pillRadius} px-[var(--pm-space-3)] py-[var(--pm-space-1)] text-xs font-medium transition`,
  chipOff: "bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-elevated)]",
  chipOn: "bg-[var(--accent)] text-[var(--accent-contrast)]",
  chipDanger: `${pillRadius} bg-red-950/40 px-[var(--pm-space-3)] py-[var(--pm-space-1)] text-xs font-medium text-red-300 transition hover:bg-red-950/60`,

  chipSm: `${inputRadius} px-2 py-0.5 text-xs transition`,
  chipSmOff: "bg-[var(--surface)] text-[var(--muted)] ring-1 ring-[var(--border)]",
  chipSmOn: "bg-[var(--accent)] text-[var(--accent-contrast)]",

  label: "block text-sm font-medium text-[var(--foreground)]",
  helper: "text-sm text-[var(--muted)]",

  card: `${cardRadius} border border-[var(--border)] bg-[var(--surface)] p-[var(--pm-space-6)] ${shadowRest}`,
  cardMuted: `${cardRadius} border border-[var(--border)] bg-[var(--surface-elevated)] p-[var(--pm-space-6)]`,

  pageContainer: "mx-auto w-full max-w-6xl px-[var(--pm-space-4)] sm:px-[var(--pm-space-8)] lg:px-[var(--pm-space-12)]",
  narrowContainer: "mx-auto w-full max-w-md px-[var(--pm-space-4)] sm:px-[var(--pm-space-6)]",

  tile: `group block overflow-hidden ${cardRadius} border border-[var(--border)] bg-[var(--surface)] ${shadowRest} transition hover:border-[var(--accent)] hover:shadow-[var(--pm-shadow-lift)] ${focusRing}`,

  errorText: "text-sm font-medium text-red-400",
  errorTextDark: "text-sm font-medium text-red-400",

  successText: "text-sm font-medium text-emerald-400",
  successTextDark: "text-sm font-medium text-emerald-400",

  overline: "text-xs font-medium uppercase tracking-wide text-[var(--muted)]",
} as const;

/** @deprecated Prefer `studioUi` or `getUi("studio")` for clarity. */
export const ui = studioUi;

export function getUi(mode: VisualMode): UiTokenSet {
  return mode === "platform" ? platformUi : studioUi;
}

export type UiTokenSet = typeof studioUi | typeof platformUi;
