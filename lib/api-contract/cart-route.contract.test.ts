import { beforeEach, describe, expect, it, vi } from "vitest";

const cartRouteMocks = vi.hoisted(() => ({
  assertRateLimit: vi.fn(),
  getSessionUser: vi.fn(),
  getCartForRequest: vi.fn(),
  withCartCookie: vi.fn(),
  cartFindUnique: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  assertRateLimit: cartRouteMocks.assertRateLimit,
}));

vi.mock("@/lib/auth-session", () => ({
  getSessionUser: cartRouteMocks.getSessionUser,
}));

vi.mock("@/lib/cart-server", () => ({
  getCartForRequest: cartRouteMocks.getCartForRequest,
  withCartCookie: cartRouteMocks.withCartCookie,
  cartItemInclude: {},
}));

vi.mock("@/lib/bookings/seat-type", () => ({
  seatTypeCapacityError: () => null,
  validateSeatTypeRequired: () => null,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    cart: { findUnique: cartRouteMocks.cartFindUnique },
    cartItem: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    product: { findFirst: vi.fn() },
    bookingSlot: { findUnique: vi.fn() },
  },
}));

import { GET, POST } from "@/app/api/cart/route";

describe("API contract: /api/cart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cartRouteMocks.assertRateLimit.mockReturnValue({ allowed: true });
    cartRouteMocks.getSessionUser.mockResolvedValue(null);
    cartRouteMocks.getCartForRequest.mockResolvedValue({ cartId: "cart_1", setCookie: true });
    cartRouteMocks.withCartCookie.mockImplementation((res: Response) => res);
    cartRouteMocks.cartFindUnique.mockResolvedValue({
      id: "cart_1",
      items: [],
    });
  });

  it("GET returns 400 contract when cart cannot be loaded", async () => {
    cartRouteMocks.cartFindUnique.mockResolvedValue(null);

    const res = await GET();
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(400);
    expect(json.error).toBe("Cart missing");
  });

  it("POST returns 429 contract on rate-limit reject", async () => {
    cartRouteMocks.assertRateLimit.mockReturnValue({ allowed: false });
    const req = new Request("http://localhost:3000/api/cart", { method: "POST", body: "{}" });

    const res = await POST(req);
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(429);
    expect(json.error).toBe("Too many cart updates");
  });

  it("POST returns 400 for malformed JSON", async () => {
    const req = new Request("http://localhost:3000/api/cart", {
      method: "POST",
      body: "{oops",
    });

    const res = await POST(req);
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid JSON");
  });

  it("POST returns 400 when productId and slotId are both missing", async () => {
    const req = new Request("http://localhost:3000/api/cart", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ quantity: 1 }),
    });

    const res = await POST(req);
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(400);
    expect(json.error).toBe("productId or slotId required");
  });
});
