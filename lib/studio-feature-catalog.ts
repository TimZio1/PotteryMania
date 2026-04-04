/** Add-on features shown in the studio panel (keys stored in studio_feature_requests). */

export type StudioFeatureCatalogEntry = {
  key: string;
  name: string;
  benefit: string;
  suggestedMonthlyEur: number;
};

export const STUDIO_FEATURE_CATALOG: StudioFeatureCatalogEntry[] = [
  {
    key: "reschedule_bookings",
    name: "Guest rescheduling",
    benefit: "Let customers change dates without losing the sale.",
    suggestedMonthlyEur: 1.3,
  },
  {
    key: "waitlist_system",
    name: "Waitlist",
    benefit: "Capture demand when classes are full.",
    suggestedMonthlyEur: 2,
  },
  {
    key: "advanced_analytics",
    name: "Advanced analytics",
    benefit: "Deeper trends on classes, revenue, and occupancy.",
    suggestedMonthlyEur: 4,
  },
  {
    key: "automated_reminders",
    name: "Automated reminders",
    benefit: "Fewer no-shows with email reminders before class.",
    suggestedMonthlyEur: 3,
  },
  {
    key: "online_shop",
    name: "Online shop",
    benefit: "Sell pottery and supplies alongside classes.",
    suggestedMonthlyEur: 8,
  },
  {
    key: "kiln_tracking",
    name: "Kiln & production",
    benefit: "Track firings and student pieces in one place.",
    suggestedMonthlyEur: 6,
  },
  {
    key: "staff_management",
    name: "Staff & roles",
    benefit: "Delegate access to instructors and assistants.",
    suggestedMonthlyEur: 5,
  },
  {
    key: "ai_advisor",
    name: "AI Advisor",
    benefit: "Ask pricing, scheduling, and growth questions using your studio stats.",
    suggestedMonthlyEur: 7,
  },
];
