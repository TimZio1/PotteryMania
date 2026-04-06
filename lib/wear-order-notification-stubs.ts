/**
 * Reserved hooks for transactional email / SMS / webhooks when wear orders move through lifecycle.
 * Persisted state + admin audit already capture facts; call these from transition APIs when automation ships.
 */
export type WearOrderNotifyKind = "order_confirmed" | "fulfilled" | "shipped" | "refunded";

export function scheduleWearOrderNotification(
  kind: WearOrderNotifyKind,
  orderId: string,
  context?: Record<string, unknown>,
): void {
  void kind;
  void orderId;
  void context;
  /* Intentionally empty — wire Resend / Postmark / queue here later. */
}
