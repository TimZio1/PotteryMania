import { STUDIO_THEME_PRESETS, type StudioPublicThemeTier, type StudioThemePreset } from "./types";

/** Paid activation unlocks full curated palette; free listing stays in “safe” presets. */
export function studioPublicThemeTierFromStudio(studio: { activationPaidAt: Date | null }): StudioPublicThemeTier {
  return studio.activationPaidAt ? "full" : "starter";
}

const STARTER_PRESETS = new Set<StudioThemePreset>(["warm-minimal", "stone-gallery"]);

export function presetAllowedForTier(preset: StudioThemePreset, tier: StudioPublicThemeTier): boolean {
  if (tier === "full") return true;
  return STARTER_PRESETS.has(preset);
}

export function clampThemePresetForTier(
  preset: StudioThemePreset,
  tier: StudioPublicThemeTier,
): StudioThemePreset {
  if (presetAllowedForTier(preset, tier)) return preset;
  return "warm-minimal";
}

export function allowedPresetsForTier(tier: StudioPublicThemeTier): StudioThemePreset[] {
  if (tier === "full") return [...STUDIO_THEME_PRESETS];
  return STUDIO_THEME_PRESETS.filter((p) => STARTER_PRESETS.has(p));
}

export type StudioForThemeTier = { activationPaidAt: Date | null; publicTheme: unknown | null };
