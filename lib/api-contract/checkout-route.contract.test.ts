import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  assertRateLimit: vi.fn(),
  getCartForRequest: vi.fn(),
  buildCheckoutLineRowsFromCart: vi.fn(),
  cartFindUnique: vi.fn(),
  studioFindUnique: vi.fn(),
  stripeAccFindUnique: vi.fn(),
  isRuntimeFlagEnabled: vi.fn(),
  createPendingCheckoutOrder: vi.fn(),
  sessionCreate: vi.fn(),
  orderUpdate: vi.fn(),
  transaction: vi.fn(),
  resolveShippingZoneForDestination: vi.fn(),
  zonePriceCents: vi.fn(),
  productFindMany: vi.fn(),
}));

vi.mock("@/lib/auth-session", () => ({ getSessionUser: () => mocks.getSessionUser() }));
vi.mock("@/lib/rate-limit", () => ({ assertRateLimit: () => mocks.assertRateLimit() }));
vi.mock("@/lib/cart-server", () => ({
  getCartForRequest: () => mocks.getCartForRequest(),
  cartItemInclude: {},
}));
vi.mock("@/lib/runtime-feature-flags", () => ({
  isRuntimeFlagEnabled: () => mocks.isRuntimeFlagEnabled(),
  RUNTIME_FLAG_KEYS: {
    bookingCheckoutEnabled: "bookingCheckoutEnabled",
    marketplaceCheckoutEnabled: "marketplaceCheckoutEnabled",
  },
}));
vi.mock("@/lib/checkout-line-rows", () => ({
  buildCheckoutLineRowsFromCart: (...a: unknown[]) => mocks.buildCheckoutLineRowsFromCart(...a),
}));
vi.mock("@/lib/coupon-checkout", () => ({
  normalizeCouponCode: (c: string) => c.toUpperCase(),
  validateCouponState: () => null,
  computeCouponDiscountCents: () => 0,
  capDiscountForMinimumLineRemainder: () => ({ discountCents: 0 }),
  applyCouponToLineRows: (rows: unknown[]) => rows,
  lineRowsToStripeLineItems: () => [{ quantity: 1, price_data: { currency: "eur", unit_amount: 5000, product_data: { name: "Bowl" } } }],
  recomputeTotalsFromLineRows: () => ({ subtotal: 5000, commissionTotal: 125 }),
  MIN_DISCOUNTED_SUBTOTAL_CENTS: 50,
}));
vi.mock("@/lib/gift-cards/checkout", () => ({
  previewGiftCardRedemption: vi.fn(),
  applyGiftCardToLineRows: (rows: unknown[]) => rows,
  attachGiftCardReservationsToSession: vi.fn(),
  releaseGiftCardRedemptionsForOrder: vi.fn(),
}));
vi.mock("@/lib/tax", () => ({
  calculateEstimatedTaxCents: () => 0,
  stripeTaxEnabled: () => false,
}));
vi.mock("@/lib/shipping-zones", () => ({
  resolveShippingZoneForDestination: () => mocks.resolveShippingZoneForDestination(),
  zonePriceCents: () => mocks.zonePriceCents(),
}));
vi.mock("@/lib/checkout/checkout-order-creation", () => ({
  createPendingCheckoutOrder: (...a: unknown[]) => mocks.createPendingCheckoutOrder(...a),
}));
vi.mock("@/lib/orders/checkout-completion", () => ({
  settleCheckoutOrderPayment: vi.fn().mockResolvedValue({ skip: false, confirmedBookingIds: [], pendingApprovalIds: [], autoCancelledIds: [], stockFailureCancelled: false }),
  runCheckoutCompletionSideEffects: vi.fn(),
}));
vi.mock("@/lib/studio-operating-gates", () => ({ studioCanOperateMessage: () => "Studio cannot operate" }));
vi.mock("@/lib/monitoring", () => ({ logApiError: () => {} }));
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    checkout: { sessions: { create: (...a: unknown[]) => mocks.sessionCreate(...a) } },
  }),
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    cart: { findUnique: (...a: unknown[]) => mocks.cartFindUnique(...a) },
    studio: { findUnique: (...a: unknown[]) => mocks.studioFindUnique(...a) },
    stripeAccount: { findUnique: (...a: unknown[]) => mocks.stripeAccFindUnique(...a) },
    product: { findMany: (...a: unknown[]) => mocks.productFindMany(...a) },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => mocks.transaction(fn),
  },
}));

const { POST } = await import("@/app/api/checkout/route");

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost:3000/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/checkout — contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertRateLimit.mockReturnValue({ allowed: true });
    mocks.getSessionUser.mockResolvedValue({ id: "u_1", role: "customer" });
    mocks.getCartForRequest.mockResolvedValue({ cartId: "cart_1" });
    mocks.isRuntimeFlagEnabled.mockResolvedValue(true);
    mocks.cartFindUnique.mockResolvedValue({
      id: "cart_1",
      items: [{ id: "ci_1", productId: "prod_1", quantity: 1 }],
    });
    mocks.buildCheckoutLineRowsFromCart.mockResolvedValue({
      ok: true,
      lineRows: [
        { cartItemId: "ci_1", itemType: "product", productId: "prod_1", quantity: 1, chargedLineCents: 5000, commissionCents: 125, vendorCents: 4875 },
      ],
      subtotal: 5000,
      studioId: "st_1",
      productBps: 250,
      bookingBps: 250,
    });
    mocks.studioFindUnique.mockResolvedValue({ id: "st_1", status: "approved", country: "PT" });
    mocks.stripeAccFindUnique.mockResolvedValue({ stripeAccountId: "acct_x", chargesEnabled: true, payoutsEnabled: true });
    mocks.createPendingCheckoutOrder.mockResolvedValue({ id: "ord_1" });
    mocks.resolveShippingZoneForDestination.mockReturnValue("domestic");
    mocks.zonePriceCents.mockReturnValue(0);
    mocks.productFindMany.mockResolvedValue([{ id: "prod_1", title: "Bowl", shippingDomesticCents: 0 }]);
    mocks.sessionCreate.mockResolvedValue({ url: "https://checkout.stripe.com/session_abc", id: "cs_2" });
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ order: { update: (...a: unknown[]) => mocks.orderUpdate(...a) } }),
    );
  });

  it("returns 400 when customer fields missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when cart is empty", async () => {
    mocks.cartFindUnique.mockResolvedValue({ id: "cart_1", items: [] });
    const res = await POST(makeRequest({ customerName: "Jane", customerEmail: "j@e.com" }));
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    mocks.assertRateLimit.mockReturnValue({ allowed: false });
    const res = await POST(makeRequest({ customerName: "Jane", customerEmail: "j@e.com" }));
    expect(res.status).toBe(429);
  });

  it("returns Stripe URL on successful product checkout", async () => {
    const res = await POST(makeRequest({
      customerName: "Jane",
      customerEmail: "j@e.com",
      shippingAddress: { country: "PT" },
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toContain("https://checkout.stripe.com");
    expect(json.orderId).toBe("ord_1");
  });

  it("refuses when studio Stripe not enabled", async () => {
    mocks.stripeAccFindUnique.mockResolvedValue({ chargesEnabled: false, payoutsEnabled: false });
    const res = await POST(makeRequest({
      customerName: "Jane",
      customerEmail: "j@e.com",
      shippingAddress: { country: "PT" },
    }));
    expect(res.status).toBe(400);
  });
});
