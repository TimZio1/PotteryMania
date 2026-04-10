import type { StudioAccentTone, StudioThemePreset } from "./types";

/** Base surfaces per preset (curated — not user-editable hex). */
export const PRESET_BASE: Record<
  StudioThemePreset,
  { pageBg: string; surfaceBg: string; text: string; muted: string; heading: string; border: string }
> = {
  "warm-minimal": {
    pageBg: "#faf8f5",
    surfaceBg: "#ffffff",
    text: "#292524",
    muted: "#78716c",
    heading: "#431407",
    border: "rgba(41, 24, 19, 0.1)",
  },
  "earth-and-clay": {
    pageBg: "#f4ede6",
    surfaceBg: "#faf6f1",
    text: "#3d2b1f",
    muted: "#6b5344",
    heading: "#5c2e0a",
    border: "rgba(60, 40, 28, 0.12)",
  },
  "soft-editorial": {
    pageBg: "#f7f5f2",
    surfaceBg: "#ffffff",
    text: "#1f2933",
    muted: "#5c6570",
    heading: "#111827",
    border: "rgba(17, 24, 39, 0.08)",
  },
  "stone-gallery": {
    pageBg: "#e7e5e4",
    surfaceBg: "#fafaf9",
    text: "#292524",
    muted: "#57534e",
    heading: "#1c1917",
    border: "rgba(28, 25, 23, 0.12)",
  },
  "dark-artisan": {
    pageBg: "#0c0a09",
    surfaceBg: "#1c1917",
    text: "#e7e5e4",
    muted: "#a8a29e",
    heading: "#fafaf9",
    border: "rgba(255, 255, 255, 0.1)",
  },
  "mediterranean-light": {
    pageBg: "#f0f7f6",
    surfaceBg: "#ffffff",
    text: "#1e3a3a",
    muted: "#4b6b6a",
    heading: "#134e4a",
    border: "rgba(19, 78, 74, 0.12)",
  },
};

export const ACCENT_HEX: Record<StudioAccentTone, string> = {
  terracotta: "#b45309",
  sage: "#4d7c5a",
  slate: "#475569",
  gold: "#a16207",
  ink: "#1c1917",
  blush: "#9f5068",
};
