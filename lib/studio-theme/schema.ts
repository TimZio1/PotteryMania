import {
  STUDIO_ACCENT_TONES,
  STUDIO_BUTTON_STYLES,
  STUDIO_CORNER_STYLES,
  STUDIO_DENSITIES,
  STUDIO_FONT_PAIRS,
  STUDIO_IMAGE_STYLES,
  STUDIO_LAYOUT_MODES,
  STUDIO_PRIMARY_TONES,
  STUDIO_THEME_PRESETS,
  type StudioPublicThemeV1,
} from "./types";

const PRESET_SET = new Set<string>(STUDIO_THEME_PRESETS);
const PRIMARY_SET = new Set<string>(STUDIO_PRIMARY_TONES);
const ACCENT_SET = new Set<string>(STUDIO_ACCENT_TONES);
const FONT_SET = new Set<string>(STUDIO_FONT_PAIRS);
const LAYOUT_SET = new Set<string>(STUDIO_LAYOUT_MODES);
const IMG_SET = new Set<string>(STUDIO_IMAGE_STYLES);
const BTN_SET = new Set<string>(STUDIO_BUTTON_STYLES);
const CORNER_SET = new Set<string>(STUDIO_CORNER_STYLES);
const DENSITY_SET = new Set<string>(STUDIO_DENSITIES);

function asBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === "boolean") return v;
  return fallback;
}

function pick<T extends string>(v: unknown, allowed: Set<string>, fallback: T): T {
  if (typeof v === "string" && allowed.has(v)) return v as T;
  return fallback;
}

/** Default storefront theme (warm, gallery-safe). */
export const DEFAULT_STUDIO_PUBLIC_THEME: StudioPublicThemeV1 = {
  themePreset: "warm-minimal",
  primaryTone: "warm_neutral",
  accentTone: "terracotta",
  fontPair: "system_neutral",
  layoutMode: "balanced",
  imageStyle: "rounded",
  buttonStyle: "pill",
  cornerStyle: "xl",
  density: "comfortable",
  showSerifHeadings: false,
  useUppercaseLabels: false,
};

/** Parse unknown JSON from DB; invalid keys fall back to defaults. */
export function parseStudioPublicThemeJson(raw: unknown): StudioPublicThemeV1 {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_STUDIO_PUBLIC_THEME };
  }
  const o = raw as Record<string, unknown>;
  return {
    themePreset: pick(o.themePreset, PRESET_SET, DEFAULT_STUDIO_PUBLIC_THEME.themePreset),
    primaryTone: pick(o.primaryTone, PRIMARY_SET, DEFAULT_STUDIO_PUBLIC_THEME.primaryTone),
    accentTone: pick(o.accentTone, ACCENT_SET, DEFAULT_STUDIO_PUBLIC_THEME.accentTone),
    fontPair: pick(o.fontPair, FONT_SET, DEFAULT_STUDIO_PUBLIC_THEME.fontPair),
    layoutMode: pick(o.layoutMode, LAYOUT_SET, DEFAULT_STUDIO_PUBLIC_THEME.layoutMode),
    imageStyle: pick(o.imageStyle, IMG_SET, DEFAULT_STUDIO_PUBLIC_THEME.imageStyle),
    buttonStyle: pick(o.buttonStyle, BTN_SET, DEFAULT_STUDIO_PUBLIC_THEME.buttonStyle),
    cornerStyle: pick(o.cornerStyle, CORNER_SET, DEFAULT_STUDIO_PUBLIC_THEME.cornerStyle),
    density: pick(o.density, DENSITY_SET, DEFAULT_STUDIO_PUBLIC_THEME.density),
    showSerifHeadings: asBool(o.showSerifHeadings, DEFAULT_STUDIO_PUBLIC_THEME.showSerifHeadings),
    useUppercaseLabels: asBool(o.useUppercaseLabels, DEFAULT_STUDIO_PUBLIC_THEME.useUppercaseLabels),
  };
}
