import { afterEach, describe, expect, it, vi } from "vitest";
import { merchantFeedOfferId } from "@/lib/meta-wear-feed";
import { trackWearEvent, WEAR_EVENT_KINDS } from "@/lib/wear-analytics-client";

describe("wear analytics client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("fires Meta AddToCart with catalog offer ids for item matching", () => {
    const fbq = vi.fn();
    const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ ok: true }))));
    const contentId = merchantFeedOfferId("prod_1", "variant_1");
    vi.stubGlobal("window", { fbq });
    vi.stubGlobal("fetch", fetchMock);

    trackWearEvent(WEAR_EVENT_KINDS.addToCart, {
      productId: "prod_1",
      variantId: "variant_1",
      contentIds: [contentId],
      contentName: "Studio mark tee",
      value: 28,
      currency: "EUR",
      quantity: 2,
    });

    expect(fbq).toHaveBeenCalledWith(
      "track",
      "AddToCart",
      expect.objectContaining({
        content_ids: [contentId],
        content_type: "product",
        content_name: "Studio mark tee",
        value: 28,
        currency: "EUR",
        contents: [{ id: contentId, quantity: 2, item_price: 14 }],
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/wear/events",
      expect.objectContaining({
        method: "POST",
        keepalive: true,
      }),
    );
  });

  it("fires Meta Purchase with value, currency, order id, content ids, and eventID", () => {
    const fbq = vi.fn();
    const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ ok: true }))));
    const contentId = merchantFeedOfferId("prod_1", "variant_1");
    vi.stubGlobal("window", { fbq });
    vi.stubGlobal("fetch", fetchMock);

    trackWearEvent(WEAR_EVENT_KINDS.purchaseSuccess, {
      orderId: "wear_order_1",
      contentIds: [contentId],
      value: 37.99,
      currency: "EUR",
      quantity: 2,
      eventId: "cs_test_123",
    });

    expect(fbq).toHaveBeenCalledWith(
      "track",
      "Purchase",
      expect.objectContaining({
        content_ids: [contentId],
        content_type: "product",
        order_id: "wear_order_1",
        value: 37.99,
        currency: "EUR",
        num_items: 2,
      }),
      { eventID: "cs_test_123" },
    );
  });
});
