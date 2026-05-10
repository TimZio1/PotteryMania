import { afterEach, describe, expect, it, vi } from "vitest";
import { buildCartAddToCartPayload, trackCartAddToCart } from "@/lib/cart-analytics-client";

describe("cart add-to-cart analytics", () => {
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("builds GA4 and Meta payloads from cents and quantity", () => {
    const payload = buildCartAddToCartPayload({
      itemType: "product",
      itemId: "prod_1",
      itemName: "Mug",
      unitPriceCents: 1295,
      quantity: 2,
    });

    expect(payload.ga4).toEqual({
      currency: "EUR",
      value: 25.9,
      items: [
        {
          item_id: "prod_1",
          item_category: "product",
          item_name: "Mug",
          quantity: 2,
          price: 12.95,
        },
      ],
    });
    expect(payload.meta).toMatchObject({
      content_ids: ["prod_1"],
      content_type: "product",
      content_name: "Mug",
      value: 25.9,
      currency: "EUR",
      contents: [{ id: "prod_1", quantity: 2, item_price: 12.95 }],
    });
  });

  it("fires GA4 and Meta AddToCart when browser trackers are available", () => {
    const gtag = vi.fn();
    const fbq = vi.fn();
    vi.stubGlobal("window", { gtag, fbq });

    trackCartAddToCart({
      itemType: "booking",
      itemId: "exp_1",
      itemName: "Wheel class",
      unitPriceCents: 3000,
      valueCents: 6000,
      currency: "EUR",
      quantity: 2,
    });

    expect(gtag).toHaveBeenCalledWith("event", "add_to_cart", expect.objectContaining({ value: 60 }));
    expect(fbq).toHaveBeenCalledWith("track", "AddToCart", expect.objectContaining({ value: 60 }));
  });

  it("queues Meta AddToCart until fbq loads", () => {
    vi.useFakeTimers();
    const gtag = vi.fn();
    const fbq = vi.fn();
    const windowRef: { gtag: typeof gtag; fbq?: typeof fbq } = { gtag };
    vi.stubGlobal("window", windowRef);

    trackCartAddToCart({
      itemType: "product",
      itemId: "prod_queued",
      unitPriceCents: 500,
    });

    expect(fbq).not.toHaveBeenCalled();
    windowRef.fbq = fbq;
    vi.advanceTimersByTime(50);

    expect(fbq).toHaveBeenCalledWith("track", "AddToCart", expect.objectContaining({ content_ids: ["prod_queued"] }));
  });
});
