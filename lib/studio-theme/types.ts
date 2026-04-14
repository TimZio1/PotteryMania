/** Curated presets — no free-form colors. */
export const STUDIO_THEME_PRESETS = [
  "warm-minimal",
  "earth-and-clay",
  "soft-editorial",
  "stone-gallery",
  "dark-artisan",
  "mediterranean-light",
] as const;

export type StudioThemePreset = (typeof STUDIO_THEME_PRESETS)[number];

export const STUDIO_PRIMARY_TONES = [
  "warm_neutral",
  "deep_ink",
  "soft_clay",
  "stone",
  "olive",
  "midnight",
] as const;

export type StudioPrimaryTone = (typeof STUDIO_PRIMARY_TONES)[number];

/** Controlled accent palette — studios choose exactly ONE. */
export const STUDIO_ACCENT_TONES = ["clay", "sand", "olive", "stone", "wine"] as const;
export type StudioAccentTone = (typeof STUDIO_ACCENT_TONES)[number];

export const STUDIO_FONT_PAIRS = [
  "system_neutral",
  "serif_editorial",
  "humanist_soft",
  "classic_literary",
  "mono_accent",
] as const;

export type StudioFontPair = (typeof STUDIO_FONT_PAIRS)[number];

export const STUDIO_LAYOUT_MODES = ["balanced", "airy", "compact"] as const;
export type StudioLayoutMode = (typeof STUDIO_LAYOUT_MODES)[number];

export const STUDIO_IMAGE_STYLES = ["rounded", "sharp", "polaroid"] as const;
export type StudioImageStyle = (typeof STUDIO_IMAGE_STYLES)[number];

export const STUDIO_BUTTON_STYLES = ["pill", "soft", "outline"] as const;
export type StudioButtonStyle = (typeof STUDIO_BUTTON_STYLES)[number];

export const STUDIO_CORNER_STYLES = ["xl", "md", "none"] as const;
export type StudioCornerStyle = (typeof STUDIO_CORNER_STYLES)[number];

export const STUDIO_DENSITIES = ["comfortable", "compact"] as const;
export type StudioDensity = (typeof STUDIO_DENSITIES)[number];

/** Persisted shape (subset allowed; merged with preset defaults). */
export type StudioPublicThemeV1 = {
  themePreset: StudioThemePreset;
  primaryTone: StudioPrimaryTone;
  accentTone: StudioAccentTone;
  fontPair: StudioFontPair;
  layoutMode: StudioLayoutMode;
  imageStyle: StudioImageStyle;
  buttonStyle: StudioButtonStyle;
  cornerStyle: StudioCornerStyle;
  density: StudioDensity;
  showSerifHeadings: boolean;
  useUppercaseLabels: boolean;
};

export type StudioPublicThemeTier = "starter" | "full";

export type ResolvedStudioPublicTheme = StudioPublicThemeV1 & {
  /** CSS custom properties for the theme root (`style={{ ... }}`). */
  cssVariables: Record<string, string>;
  /** Root classes + data attributes for CSS hooks. */
  surfaceClassName: string;
};
