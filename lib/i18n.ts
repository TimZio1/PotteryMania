import { EU_DEFAULTS } from "@/lib/promo";

export const SUPPORTED_LOCALES = ["en", "el"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function resolveLocale(locale?: string | null): SupportedLocale {
  return locale === "el" ? "el" : "en";
}

export function formatMoneyEur(amountCents: number, locale?: string | null) {
  return new Intl.NumberFormat(resolveLocale(locale) === "el" ? "el-GR" : EU_DEFAULTS.locale, {
    style: "currency",
    currency: "EUR",
  }).format(amountCents / 100);
}
