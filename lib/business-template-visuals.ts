/** Card / drawer accents per `BusinessTemplate.visualTheme` — keeps templates visually distinct. */

export type BusinessTemplateVisualTheme = {
  cardBorder: string;
  cardBg: string;
  cardHoverBorder: string;
  bulletDot: string;
  ringActive: string;
  compareNewBorder: string;
  compareNewBg: string;
  compareNewLabel: string;
  ctaButton: string;
};

const FALLBACK: BusinessTemplateVisualTheme = {
  cardBorder: "border-stone-200/90",
  cardBg: "bg-white",
  cardHoverBorder: "group-hover:border-amber-300/60",
  bulletDot: "bg-amber-600",
  ringActive: "ring-amber-700/25",
  compareNewBorder: "border-amber-200/80",
  compareNewBg: "bg-amber-50/40",
  compareNewLabel: "text-amber-900",
  ctaButton: "",
};

export const BUSINESS_TEMPLATE_VISUALS: Record<string, BusinessTemplateVisualTheme> = {
  wear: {
    cardBorder: "border-neutral-700/90",
    cardBg: "bg-gradient-to-br from-neutral-900 to-neutral-950",
    cardHoverBorder: "group-hover:border-neutral-500/80",
    bulletDot: "bg-amber-300",
    ringActive: "ring-amber-300/35",
    compareNewBorder: "border-neutral-700/90",
    compareNewBg: "bg-neutral-900/90",
    compareNewLabel: "text-amber-200",
    ctaButton: "",
  },
  amber: {
    cardBorder: "border-amber-200/90",
    cardBg: "bg-gradient-to-br from-amber-50/90 to-white",
    cardHoverBorder: "group-hover:border-amber-400/70",
    bulletDot: "bg-amber-600",
    ringActive: "ring-amber-600/35",
    compareNewBorder: "border-amber-300/80",
    compareNewBg: "bg-amber-50/70",
    compareNewLabel: "text-amber-950",
    ctaButton: "",
  },
  rose: {
    cardBorder: "border-rose-200/90",
    cardBg: "bg-gradient-to-br from-rose-50/80 to-white",
    cardHoverBorder: "group-hover:border-rose-400/60",
    bulletDot: "bg-rose-500",
    ringActive: "ring-rose-500/30",
    compareNewBorder: "border-rose-200/90",
    compareNewBg: "bg-rose-50/60",
    compareNewLabel: "text-rose-950",
    ctaButton: "",
  },
  teal: {
    cardBorder: "border-teal-200/90",
    cardBg: "bg-gradient-to-br from-teal-50/70 to-white",
    cardHoverBorder: "group-hover:border-teal-400/60",
    bulletDot: "bg-teal-600",
    ringActive: "ring-teal-600/30",
    compareNewBorder: "border-teal-200/90",
    compareNewBg: "bg-teal-50/50",
    compareNewLabel: "text-teal-950",
    ctaButton: "",
  },
  violet: {
    cardBorder: "border-violet-200/90",
    cardBg: "bg-gradient-to-br from-violet-50/75 to-white",
    cardHoverBorder: "group-hover:border-violet-400/55",
    bulletDot: "bg-violet-600",
    ringActive: "ring-violet-600/28",
    compareNewBorder: "border-violet-200/90",
    compareNewBg: "bg-violet-50/55",
    compareNewLabel: "text-violet-950",
    ctaButton: "",
  },
  orange: {
    cardBorder: "border-orange-200/90",
    cardBg: "bg-gradient-to-br from-orange-50/80 to-white",
    cardHoverBorder: "group-hover:border-orange-400/60",
    bulletDot: "bg-orange-600",
    ringActive: "ring-orange-500/30",
    compareNewBorder: "border-orange-200/90",
    compareNewBg: "bg-orange-50/55",
    compareNewLabel: "text-orange-950",
    ctaButton: "",
  },
  emerald: {
    cardBorder: "border-emerald-200/90",
    cardBg: "bg-gradient-to-br from-emerald-50/75 to-white",
    cardHoverBorder: "group-hover:border-emerald-400/55",
    bulletDot: "bg-emerald-600",
    ringActive: "ring-emerald-600/28",
    compareNewBorder: "border-emerald-200/90",
    compareNewBg: "bg-emerald-50/50",
    compareNewLabel: "text-emerald-950",
    ctaButton: "",
  },
  sky: {
    cardBorder: "border-sky-200/90",
    cardBg: "bg-gradient-to-br from-sky-50/80 to-white",
    cardHoverBorder: "group-hover:border-sky-400/60",
    bulletDot: "bg-sky-600",
    ringActive: "ring-sky-500/30",
    compareNewBorder: "border-sky-200/90",
    compareNewBg: "bg-sky-50/55",
    compareNewLabel: "text-sky-950",
    ctaButton: "",
  },
  slate: {
    cardBorder: "border-slate-300/90",
    cardBg: "bg-gradient-to-br from-slate-50/90 to-white",
    cardHoverBorder: "group-hover:border-slate-400/60",
    bulletDot: "bg-slate-600",
    ringActive: "ring-slate-600/25",
    compareNewBorder: "border-slate-200/90",
    compareNewBg: "bg-slate-50/70",
    compareNewLabel: "text-slate-900",
    ctaButton: "",
  },
};

export function getBusinessTemplateVisuals(themeKey: string): BusinessTemplateVisualTheme {
  return BUSINESS_TEMPLATE_VISUALS[themeKey] ?? FALLBACK;
}
