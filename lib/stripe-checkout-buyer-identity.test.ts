import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { resolveCheckoutSessionBuyerIdentity } from "./stripe-checkout-buyer-identity";

function session(partial: Partial<Stripe.Checkout.Session>): Stripe.Checkout.Session {
  return partial as Stripe.Checkout.Session;
}

describe("resolveCheckoutSessionBuyerIdentity", () => {
  it("prefers customer_details email but falls back to customer_email", () => {
    expect(
      resolveCheckoutSessionBuyerIdentity(
        session({ customer_details: { email: "A@EXAMPLE.COM" } as Stripe.Checkout.Session.CustomerDetails }),
      ).email,
    ).toBe("a@example.com");
    expect(
      resolveCheckoutSessionBuyerIdentity(session({ customer_email: "Link@Example.com" })).email,
    ).toBe("link@example.com");
  });

  it("reads shipping_details name when customer name missing", () => {
    const s = session({
      customer_details: null,
      customer_email: "x@y.co",
    }) as unknown as Stripe.Checkout.Session;
    (s as unknown as { shipping_details: { name: string } }).shipping_details = { name: "  Pat Buyer  " };
    expect(resolveCheckoutSessionBuyerIdentity(s).name).toBe("Pat Buyer");
  });
});
