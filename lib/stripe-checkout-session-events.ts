export function isCheckoutSessionPaymentSuccessEvent(
  eventType: string,
  paymentStatus?: string | null,
): boolean {
  if (eventType === "checkout.session.async_payment_succeeded") return true;
  if (eventType === "checkout.session.completed") return paymentStatus === "paid";
  return false;
}
