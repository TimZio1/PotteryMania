import { afterEach, describe, expect, it, vi } from "vitest";
import { sendMetaConversionsPurchase } from "@/lib/meta-conversions-api";

describe("sendMetaConversionsPurchase", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  it("posts a Purchase event to the production pixel fallback with value and catalog ids", async () => {
    process.env.FB_CONVERSIONS_API = "test-token";
    delete process.env.META_PIXEL_ID;
    delete process.env.NEXT_PUBLIC_META_PIXEL_ID;

    const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ events_received: 1 }))));
    vi.stubGlobal("fetch", fetchMock);

    const promise = sendMetaConversionsPurchase({
      eventId: "cs_test_123",
      orderId: "wear_order_1",
      value: 42.5,
      currency: "eur",
      contentIds: ["offer_1", "offer_2"],
      numItems: 3,
      email: "Buyer@Example.com",
      eventSourceUrl: "https://potterymania.com/wear/success",
    });
    await promise;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("https://graph.facebook.com/v21.0/1956916491397785/events");
    expect(String(url)).toContain("access_token=test-token");
    expect(init).toMatchObject({ method: "POST", headers: { "Content-Type": "application/json" } });

    const body = JSON.parse(String(init?.body)) as {
      data: Array<{
        event_name: string;
        event_id: string;
        event_source_url: string;
        user_data: { em: string[] };
        custom_data: Record<string, unknown>;
      }>;
    };
    expect(body.data[0]).toMatchObject({
      event_name: "Purchase",
      event_id: "cs_test_123",
      event_source_url: "https://potterymania.com/wear/success",
    });
    expect(body.data[0]?.user_data.em[0]).toHaveLength(64);
    expect(body.data[0]?.custom_data).toMatchObject({
      value: 42.5,
      currency: "EUR",
      order_id: "wear_order_1",
      content_type: "product",
      content_ids: ["offer_1", "offer_2"],
      num_items: 3,
    });
  });

  it("does not call Meta when the access token is absent", async () => {
    delete process.env.FB_CONVERSIONS_API;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await sendMetaConversionsPurchase({
      eventId: "cs_test_123",
      orderId: "wear_order_1",
      value: 42.5,
      currency: "EUR",
      contentIds: ["offer_1"],
      numItems: 1,
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
