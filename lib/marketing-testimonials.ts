/** Shared studio quotes for marketing (home + early access). Fictional personas for pre-launch social proof. */

export type StudioTestimonial = {
  quote: string;
  name: string;
  role: string;
  studio: string;
  location: string;
};

export const STUDIO_TESTIMONIALS: StudioTestimonial[] = [
  {
    quote:
      "Finally, a place that treats pottery as atmosphere and teaching — not just another generic storefront. We want collectors and students to feel the studio before they book.",
    name: "Elena Maris",
    role: "Founder",
    studio: "Terracotta Lane",
    location: "Lisbon, Portugal",
  },
  {
    quote:
      "I have been stitching together calendars, DMs, and spreadsheets for workshops. Having listings, bookings, and payouts in one calm system feels like a real step up.",
    name: "Marcus Vila",
    role: "Lead instructor",
    studio: "Barcelona Clay Co.",
    location: "Barcelona, Spain",
  },
];

/** Line under quote: "Name, Role · Studio · Location" */
export function testimonialAttribution(t: StudioTestimonial): string {
  return `${t.name}, ${t.role} · ${t.studio} · ${t.location}`;
}
