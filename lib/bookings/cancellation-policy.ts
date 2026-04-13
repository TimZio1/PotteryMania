/**
 * Single source for customer-initiated refund math from the JSON snapshot stored on bookings.
 * Vendor/admin cancellations bypass this (full collected amount).
 */
export type RefundEligibility = {
  refundOutcome: string;
  refundAmountCents: number;
};

export function describeCancellationPolicySnapshot(snap: unknown): string | null {
  if (!snap || typeof snap !== "object") return null;

  const normalized = snap as Record<string, unknown>;

  const parts: string[] = [];
  const name = typeof normalized.name === "string" ? normalized.name.trim() : "";
  const policyType = typeof normalized.policyType === "string" ? normalized.policyType : "";
  const hoursBeforeStart = typeof normalized.hoursBeforeStart === "number" ? normalized.hoursBeforeStart : null;
  const refundPercentage = typeof normalized.refundPercentage === "number" ? normalized.refundPercentage : null;
  const customPolicyText = typeof normalized.customPolicyText === "string" ? normalized.customPolicyText.trim() : "";

  if (name) parts.push(name);

  switch (policyType) {
    case "non_refundable":
      parts.push("non-refundable");
      break;
    case "refundable_until_hours":
      if (hoursBeforeStart != null) parts.push(`full refund up to ${hoursBeforeStart}h before start`);
      break;
    case "partial_refund_until_hours":
      if (hoursBeforeStart != null) {
        parts.push(`${refundPercentage ?? 0}% refund up to ${hoursBeforeStart}h before start`);
      }
      break;
    case "custom":
      if (customPolicyText) parts.push(customPolicyText);
      break;
    default:
      break;
  }

  return parts.filter(Boolean).join(" · ") || null;
}

export function refundEligibilityFromPolicySnapshot(
  snap: Record<string, unknown> | null | undefined,
  input: {
    slotDate: Date;
    startTime: string;
    totalAmountCents: number;
    paidCents: number;
  },
): RefundEligibility {
  const paid = input.paidCents;
  if (!snap) {
    return { refundOutcome: "no_policy_full_refund", refundAmountCents: paid };
  }

  const policyType = snap.policyType as string | undefined;
  const hoursBeforeStart = (snap.hoursBeforeStart as number) ?? 0;
  const refundPercentage = (snap.refundPercentage as number) ?? 100;

  const slotStart = new Date(input.slotDate);
  const [h, m] = (input.startTime || "00:00").split(":").map(Number);
  slotStart.setHours(h || 0, m || 0, 0, 0);
  const hoursUntil = (slotStart.getTime() - Date.now()) / (1000 * 60 * 60);

  if (policyType === "non_refundable") {
    return { refundOutcome: "non_refundable", refundAmountCents: 0 };
  }
  if (policyType === "refundable_until_hours") {
    if (hoursUntil >= hoursBeforeStart) {
      return { refundOutcome: "full_refund_eligible", refundAmountCents: paid };
    }
    return { refundOutcome: "past_deadline", refundAmountCents: 0 };
  }
  if (policyType === "partial_refund_until_hours") {
    if (hoursUntil >= hoursBeforeStart) {
      const fromPolicy = Math.floor((input.totalAmountCents * refundPercentage) / 100);
      return { refundOutcome: "partial_refund_eligible", refundAmountCents: Math.min(paid, fromPolicy) };
    }
    return { refundOutcome: "past_deadline", refundAmountCents: 0 };
  }
  return { refundOutcome: "custom_review_needed", refundAmountCents: 0 };
}
