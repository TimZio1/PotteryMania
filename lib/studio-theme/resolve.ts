import { ACCENT_HEX, PRESET_BASE } from "./presets";
import { parseStudioPublicThemeJson } from "./schema";
import { clampThemePresetForTier, studioPublicThemeTierFromStudio, type StudioForThemeTier } from "./tier";
import type { ResolvedStudioPublicTheme, StudioPublicThemeV1 } from "./types";

function fontStacks(fontPair: StudioPublicThemeV1["fontPair"], serifHeadings: boolean): { sans: string; heading: string } {
  const serif = 'Georgia, "Times New Roman", Times, serif';
  const humanist = '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  const mono = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  const system = 'ui-sans-serif, system-ui, sans-serif';

  switch (fontPair) {
    case "serif_editorial":
      return { sans: humanist, heading: serifHeadings ? serif : humanist };
    case "humanist_soft":
      return { sans: humanist, heading: serifHeadings ? serif : humanist };
    case "classic_literary":
      return { sans: humanist, heading: serifHeadings ? 'Palatino, "Book Antiqua", Palatino Linotype, serif' : humanist };
    case "mono_accent":
      return { sans: humanist, heading: serifHeadings ? mono : humanist };
    default:
      return { sans: system, heading: serifHeadings ? serif : system };
  }
}

function corners(corner: StudioPublicThemeV1["cornerStyle"]): { lg: string; md: string } {
  if (corner === "none") return { lg: "0.25rem", md: "0.125rem" };
  if (corner === "md") return { lg: "0.75rem", md: "0.5rem" };
  return { lg: "1.25rem", md: "0.75rem" };
}

function imgRadius(style: StudioPublicThemeV1["imageStyle"], lg: string): string {
  if (style === "sharp") return "0.125rem";
  if (style === "polaroid") return "0.25rem";
  return lg;
}

/**
 * Resolves persisted JSON + studio tier into CSS variables and surface hooks.
 * Safe on bad DB data: always returns a complete theme.
 */
export function resolveStudioPublicTheme(studio: StudioForThemeTier): ResolvedStudioPublicTheme {
  const tier = studioPublicThemeTierFromStudio(studio);
  const parsed = parseStudioPublicThemeJson(studio.publicTheme);
  const preset = clampThemePresetForTier(parsed.themePreset, tier);
  let base = { ...PRESET_BASE[preset] };
  const accent = ACCENT_HEX[parsed.accentTone] ?? ACCENT_HEX.clay;

  /* Primary tone: subtle shifts on curated bases only (no user hex). */
  if (parsed.primaryTone === "deep_ink" && preset !== "dark-artisan") {
    base = { ...base, text: "#1c1917", heading: "#0c0a09", muted: "#57534e" };
  }
  if (parsed.primaryTone === "soft_clay") {
    base = { ...base, muted: "#78716c" };
  }
  if (parsed.primaryTone === "midnight" && preset !== "dark-artisan") {
    base = { ...base, heading: "#0f172a", text: "#1e293b" };
  }
  const { sans, heading } = fontStacks(parsed.fontPair, parsed.showSerifHeadings);
  const { lg: radiusLg, md: radiusMd } = corners(parsed.cornerStyle);
  const imgR = imgRadius(parsed.imageStyle, radiusLg);

  const sectionPad =
    parsed.layoutMode === "airy" ? "3.5rem" : parsed.layoutMode === "compact" ? "2rem" : "2.75rem";
  const gridGap = parsed.density === "compact" ? "1rem" : "1.5rem";

  const cssVariables: Record<string, string> = {
    "--st-page-bg": base.pageBg,
    "--st-surface-bg": base.surfaceBg,
    "--st-text": base.text,
    "--st-muted": base.muted,
    "--st-heading": base.heading,
    "--st-border": base.border,
    "--st-accent": accent,
    "--st-accent-contrast": preset === "dark-artisan" ? "#fafaf9" : "#ffffff",
    "--st-font-sans": sans,
    "--st-font-heading": heading,
    "--st-radius-lg": radiusLg,
    "--st-radius-md": radiusMd,
    "--st-radius-img": imgR,
    "--st-section-pad-y": sectionPad,
    "--st-grid-gap": gridGap,
  };

  const surfaceClassName = [
    "st-surface",
    parsed.useUppercaseLabels ? "st-upper-labels" : "",
    `st-layout-${parsed.layoutMode}`,
    `st-density-${parsed.density}`,
    `st-btn-${parsed.buttonStyle}`,
    `st-img-${parsed.imageStyle}`,
    parsed.imageStyle === "polaroid" ? "st-polaroid" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    ...parsed,
    themePreset: preset,
    cssVariables,
    surfaceClassName,
  };
}
