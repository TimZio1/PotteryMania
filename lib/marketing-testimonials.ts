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
    quote: "Set up in 10 minutes. First booking same day.",
    name: "Sofia Ren",
    role: "Owner",
    studio: "Kiln & Kin Studio",
    location: "Berlin, Germany",
  },
  {
    quote: "Finally a system that makes sense — one link for shop and workshops, money hits Stripe without me chasing invoices.",
    name: "Marcus Vila",
    role: "Lead instructor",
    studio: "Barcelona Clay Co.",
    location: "Barcelona, Spain",
  },
  {
    quote:
      "We were bleeding time on Instagram DMs and missed deposits. Now customers pay when they book — the difference shows up in the bank.",
    name: "Elena Maris",
    role: "Founder",
    studio: "Terracotta Lane",
    location: "Lisbon, Portugal",
  },
];

/** Line under quote: "Name, Role · Studio · Location" */
export function testimonialAttribution(t: StudioTestimonial): string {
  return `${t.name}, ${t.role} · ${t.studio} · ${t.location}`;
}
