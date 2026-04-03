export const EUROPEAN_PREREGISTRATION_COUNTRIES = [
  "Albania",
  "Andorra",
  "Austria",
  "Belgium",
  "Bosnia and Herzegovina",
  "Bulgaria",
  "Croatia",
  "Cyprus",
  "Czechia",
  "Denmark",
  "Estonia",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "Iceland",
  "Ireland",
  "Italy",
  "Kosovo",
  "Latvia",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Malta",
  "Moldova",
  "Monaco",
  "Montenegro",
  "Netherlands",
  "North Macedonia",
  "Norway",
  "Poland",
  "Portugal",
  "Romania",
  "San Marino",
  "Serbia",
  "Slovakia",
  "Slovenia",
  "Spain",
  "Sweden",
  "Switzerland",
  "Ukraine",
  "United Kingdom",
  "Vatican City",
] as const;

export const EUROPEAN_PREREGISTRATION_NOTE =
  "For now, preregistration is open to European countries only, including the UK and the Balkans.";

const EUROPEAN_PREREGISTRATION_SET = new Set<string>(EUROPEAN_PREREGISTRATION_COUNTRIES);

export function normalizePreregistrationCountry(value: string): string {
  return value.trim();
}

export function isAllowedPreregistrationCountry(value: string): boolean {
  return EUROPEAN_PREREGISTRATION_SET.has(normalizePreregistrationCountry(value));
}
