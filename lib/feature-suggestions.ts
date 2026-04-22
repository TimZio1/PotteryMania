export const FEATURE_SUGGESTION_STATUSES = [
  "new",
  "triaged",
  "planned",
  "shipped",
  "declined",
] as const;

export type FeatureSuggestionStatus = (typeof FEATURE_SUGGESTION_STATUSES)[number];

export const FEATURE_SUGGESTION_STATUS_LABEL: Record<FeatureSuggestionStatus, string> = {
  new: "New",
  triaged: "Triaged",
  planned: "Planned",
  shipped: "Shipped",
  declined: "Declined",
};

export function isFeatureSuggestionStatus(value: unknown): value is FeatureSuggestionStatus {
  return typeof value === "string" && (FEATURE_SUGGESTION_STATUSES as readonly string[]).includes(value);
}
