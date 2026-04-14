import type { StudioAccentTone, StudioThemePreset } from "./types";

/** Base surfaces per preset (curated — not user-editable hex). */
export const PRESET_BASE: Record<
  StudioThemePreset,
  { pageBg: string; surfaceBg: string; text: string; muted: string; heading: string; border: string }
> = {
  "warm-minimal": {
    pageBg: "#0E0E0E",
    surfaceBg: "#161616",
    text: "#EDEDED",
    muted: "#A1A1A1",
    heading: "#EDEDED",
    border: "#262626",
  },
  "earth-and-clay": {
    pageBg: "#0E0E0E",
    surfaceBg: "#171311",
    text: "#E8DDD0",
    muted: "#9A8978",
    heading: "#F0E6D9",
    border: "#2A231C",
  },
  "soft-editorial": {
    pageBg: "#0E0E0E",
    surfaceBg: "#151515",
    text: "#E5E5E5",
    muted: "#9E9E9E",
    heading: "#F0F0F0",
    border: "#252525",
  },
  "stone-gallery": {
    pageBg: "#0E0E0E",
    surfaceBg: "#161616",
    text: "#D4D4D4",
    muted: "#8C8C8C",
    heading: "#E5E5E5",
    border: "#282828",
  },
  "dark-artisan": {
    pageBg: "#0A0A0A",
    surfaceBg: "#141414",
    text: "#E7E5E4",
    muted: "#A8A29E",
    heading: "#FAFAF9",
    border: "rgba(255, 255, 255, 0.1)",
  },
  "mediterranean-light": {
    pageBg: "#0C0E0E",
    surfaceBg: "#141717",
    text: "#D4E0DF",
    muted: "#7A9493",
    heading: "#E0ECEB",
    border: "#1F2A29",
  },
};

/**
 * Controlled accent palette — studios choose ONLY 1.
 * Used for CTA + highlights ONLY. Never backgrounds. Never large text blocks.
 */
export const ACCENT_HEX: Record<StudioAccentTone, string> = {
  clay: "#C47A2C",
  sand: "#D9B38C",
  olive: "#7A8F63",
  stone: "#8C8C8C",
  wine: "#6E2C2C",
};
