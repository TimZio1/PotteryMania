const BOOKING_STATUS_LABELS: Record<string, string> = {
  awaiting_vendor_approval: "Waiting on the studio",
  pending: "Pending",
  confirmed: "Confirmed",
  cancellation_requested: "Cancellation requested",
  completed: "Attended",
  no_show: "No-show",
  cancelled_by_customer: "Cancelled",
  cancelled_by_vendor: "Cancelled by the studio",
  cancelled_by_admin: "Cancelled by admin",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
};

export function humanBookingStatus(status: string): string {
  if (BOOKING_STATUS_LABELS[status]) return BOOKING_STATUS_LABELS[status];
  return status.replace(/_/g, " ").replace("vendor", "studio");
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: "Paid",
  pending: "Pending",
  processing: "Processing",
  failed: "Payment failed",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
  authorised: "Authorised",
  authorized: "Authorised",
  requires_action: "Needs a quick action",
  cancelled: "Cancelled",
  canceled: "Cancelled",
};

export function humanPaymentStatus(status: string): string {
  if (PAYMENT_STATUS_LABELS[status]) return PAYMENT_STATUS_LABELS[status];
  return status.replace(/_/g, " ");
}

const FULFILLMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Not started",
  processing: "Preparing your order",
  shipped: "On its way",
  delivered: "Delivered",
  ready_for_pickup: "Ready for pickup",
  cancelled: "Cancelled",
  canceled: "Cancelled",
};

export function humanFulfillmentStatus(status: string): string {
  if (FULFILLMENT_STATUS_LABELS[status]) return FULFILLMENT_STATUS_LABELS[status];
  return status.replace(/_/g, " ");
}

const MEMBERSHIP_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  trialing: "On free trial",
  past_due: "Payment overdue",
  paused: "Paused",
  cancelled: "Cancelled",
  canceled: "Cancelled",
  expired: "Expired",
  pending: "Pending",
};

export function humanMembershipStatus(status: string): string {
  if (MEMBERSHIP_STATUS_LABELS[status]) return MEMBERSHIP_STATUS_LABELS[status];
  return status.replace(/_/g, " ");
}

const PACKAGE_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  expired: "Expired",
  cancelled: "Cancelled",
  canceled: "Cancelled",
  fully_used: "All credits used",
};

export function humanPackageStatus(status: string): string {
  if (PACKAGE_STATUS_LABELS[status]) return PACKAGE_STATUS_LABELS[status];
  return status.replace(/_/g, " ");
}

const WAITLIST_STATUS_LABELS: Record<string, string> = {
  pending: "Waiting",
  notified: "Seat offered",
  converted: "Booked",
  cancelled: "Cancelled",
  canceled: "Cancelled",
  expired: "Expired",
};

export function humanWaitlistStatus(status: string): string {
  if (WAITLIST_STATUS_LABELS[status]) return WAITLIST_STATUS_LABELS[status];
  return status.replace(/_/g, " ");
}

const REFUND_OUTCOME_LABELS: Record<string, string> = {
  full_refund: "Full refund",
  partial_refund: "Partial refund",
  no_refund: "No refund",
  pending: "Refund pending",
  denied: "Refund denied",
};

export function humanRefundOutcome(outcome: string): string {
  if (REFUND_OUTCOME_LABELS[outcome]) return REFUND_OUTCOME_LABELS[outcome];
  return outcome.replace(/_/g, " ");
}

export function prettifySeatKey(key: string): string {
  return key.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
