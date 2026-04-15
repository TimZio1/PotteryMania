export const SELL_TYPES = [
  { label: "Bowls, plates & mugs", slug: "tableware" },
  { label: "Decor & art pieces", slug: "decorative-objects" },
  { label: "Plants & home", slug: "vases-plant-pots" },
] as const;

export const CLASS_LENGTHS = [
  { label: "Around 1½ hours", minutes: 90 },
  { label: "Around 3 hours", minutes: 180 },
  { label: "A full day", minutes: 420 },
] as const;

export const SCHEDULE_PRESETS = [
  { preset: "sat_am" as const, label: "Saturday morning", hint: "10:00–12:30" },
  { preset: "sun_pm" as const, label: "Sunday afternoon", hint: "14:00–17:00" },
  { preset: "wed_eve" as const, label: "Wednesday evening", hint: "18:00–20:30" },
];

export type Flow = "studio" | "sell" | "class" | "paid" | null;

export function parseFlow(v: string | null): Flow {
  if (v === "studio" || v === "sell" || v === "class" || v === "paid") return v;
  return null;
}

export function flowSummaryLabel(flow: Exclude<Flow, null>): string {
  switch (flow) {
    case "studio":
      return "Studio page basics";
    case "sell":
      return "A product for your catalog";
    case "class":
      return "A bookable experience";
    case "paid":
      return "Payments and payouts";
    default:
      return "Setup";
  }
}
