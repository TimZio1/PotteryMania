import type Stripe from "stripe";

/**
 * Stripe Checkout can surface the buyer email on `customer_email` and/or
 * `customer_details.email`. Name may appear on `customer_details` or `shipping_details`.
 */
export function resolveCheckoutSessionBuyerIdentity(session: Stripe.Checkout.Session): {
  email: string | null;
  name: string | null;
} {
  const rawEmail =
    session.customer_details?.email?.trim() ||
    (typeof session.customer_email === "string" ? session.customer_email.trim() : "") ||
    "";
  const email = rawEmail ? rawEmail.toLowerCase() : null;

  const shippingDetails = (
    session as unknown as { shipping_details?: { name?: string | null } | null }
  ).shipping_details;
  const rawName =
    session.customer_details?.name?.trim() || shippingDetails?.name?.trim() || "";
  const name = rawName || null;

  return { email, name };
}
