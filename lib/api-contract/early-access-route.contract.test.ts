import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/early-access/route";

const earlyAccessMocks = vi.hoisted(() => ({
  signupUpsert: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    earlyAccessSignup: {
      upsert: (...args: unknown[]) => earlyAccessMocks.signupUpsert(...args),
    },
  },
}));

describe("API contract: POST /api/early-access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    earlyAccessMocks.signupUpsert.mockResolvedValue({ id: "ea_1" });
  });

  it("accepts valid payload and upserts early-access signup", async () => {
    const req = new Request("http://localhost:3000/api/early-access", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "studio@example.com",
        studioName: "Clay Home",
        country: "Portugal",
        city: "Porto",
        googleMapsUrl: "",
        logoUrl: "https://cdn.example.com/logo.png",
        photoUrls: ["https://cdn.example.com/photo-1.jpg", "https://cdn.example.com/photo-2.jpg"],
        websiteOrIg: "instagram.com/clayhome",
        offeringIntent: "both",
      }),
    });
    const res = await POST(req);
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(earlyAccessMocks.signupUpsert).toHaveBeenCalledTimes(1);
    expect(earlyAccessMocks.signupUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          photoUrls: [
            "https://cdn.example.com/logo.png",
            "https://cdn.example.com/photo-1.jpg",
            "https://cdn.example.com/photo-2.jpg",
          ],
        }),
        update: expect.objectContaining({
          photoUrls: [
            "https://cdn.example.com/logo.png",
            "https://cdn.example.com/photo-1.jpg",
            "https://cdn.example.com/photo-2.jpg",
          ],
        }),
      }),
    );
  });

  it("rejects invalid Google Maps links when provided", async () => {
    const req = new Request("http://localhost:3000/api/early-access", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "studio@example.com",
        studioName: "Clay Home",
        country: "Portugal",
        googleMapsUrl: "https://example.com/not-maps",
        offeringIntent: "both",
      }),
    });
    const res = await POST(req);
    const json = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(400);
    expect(json.error).toBe("Please paste a valid Google Maps link, or leave it empty.");
  });

  it("accepts empty googleMapsUrl", async () => {
    const req = new Request("http://localhost:3000/api/early-access", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "maps-optional@example.com",
        studioName: "Clay Home",
        country: "",
        googleMapsUrl: "",
        offeringIntent: "both",
      }),
    });
    const res = await POST(req);
    const json = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });
});
