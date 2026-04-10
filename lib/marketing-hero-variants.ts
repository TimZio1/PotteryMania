/**
 * Homepage hero copy. Primary is shown on `/`. Alternatives are for A/B tests or swaps — same CTA everywhere.
 */
export const MARKETING_HERO_PRIMARY = {
  eyebrow: "All-in-one for studios",
  headline: "Stop losing bookings and sales to chaos.",
  subhead:
    "Sell your work. Book your classes. Run everything in one place.",
  ctaPrimary: "Create your studio",
  ctaSecondary: "How it works",
} as const;

/** Brutally clear, money + simplicity — swap into `MARKETING_HERO_PRIMARY` or use in experiments. */
export const MARKETING_HERO_VARIANTS = [
  {
    headline: "Turn DMs into paid bookings — automatically.",
    subhead: "One checkout, one calendar, one place your customers pay you. Less admin, more revenue.",
  },
  {
    headline: "Your shop and classes. One link. One system.",
    subhead: "Stop duct-taping Squarespace, Calendly, and spreadsheets. Run the business from a single dashboard.",
  },
  {
    headline: "Get paid before you lose the sale.",
    subhead: "Professional booking and checkout under your studio name — so serious buyers stop ghosting.",
  },
  {
    headline: "€19/month beats five half-broken tools.",
    subhead: "Replace the stack you are paying for separately with shop + bookings + ops built for how studios work.",
  },
  {
    headline: "Stop doing business in Instagram DMs.",
    subhead: "Put pricing, availability, and payment where customers expect them — on your studio site.",
  },
] as const;
