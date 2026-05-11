import { describe, expect, it } from "vitest";

import { isCheckoutSessionPaymentSuccessEvent } from "./stripe-checkout-session-events";

describe("isCheckoutSessionPaymentSuccessEvent", () => {
  it("processes synchronous paid Checkout sessions", () => {
    expect(isCheckoutSessionPaymentSuccessEvent("checkout.session.completed", "paid")).toBe(true);
  });

  it("does not process unpaid Checkout completion events", () => {
    expect(isCheckoutSessionPaymentSuccessEvent("checkout.session.completed", "unpaid")).toBe(false);
  });

  it("processes Stripe asynchronous payment success events", () => {
    expect(isCheckoutSessionPaymentSuccessEvent("checkout.session.async_payment_succeeded", "unpaid")).toBe(true);
  });
});
