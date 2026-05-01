/**
 * Homepage FAQ — single source of truth for visible copy and FAQPage JSON-LD.
 * Keep answers in sync with what renders on `/` (search engines require parity).
 */
export const WEAR_HOME_APPAREL_FAQ = [
  {
    question: "When does my order ship?",
    answer:
      "Fast turnaround — most orders ship within a few business days. Tracking hits your inbox as soon as your package is on the move.",
  },
  {
    question: "Do you ship internationally?",
    answer:
      "Yes. We ship across the EU, UK, US and most of the world. Final shipping cost and ETA are calculated at checkout based on your address.",
  },
  {
    question: "How does the return policy work?",
    answer:
      "You have 30 days to request a return for unworn pieces. We guide you through the return label and refund within 5 business days of receiving the item.",
  },
  {
    question: "How does the affiliate program pay out?",
    answer:
      "15% commission on the final paid amount of every qualifying sale, calculated after any active discount. Cookies last 30 days. Payouts transfer through Stripe once unpaid commission reaches €50.",
  },
  {
    question: "Is checkout secure?",
    answer:
      "Yes. Payments are processed by Stripe — we never see your card details. Apple Pay, Google Pay, and Link are supported on the checkout page.",
  },
] as const;
