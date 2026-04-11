import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cartMocks = vi.hoisted(() => ({
  cookieGet: vi.fn(),
  cartFindFirst: vi.fn(),
  cartCreate: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (...args: unknown[]) => cartMocks.cookieGet(...args),
  }),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    cart: {
      findFirst: (...args: unknown[]) => cartMocks.cartFindFirst(...args),
      create: (...args: unknown[]) => cartMocks.cartCreate(...args),
    },
  },
}));

import { getCartForRequest } from "@/lib/cart-server";

describe("cart cookie security attributes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    cartMocks.cookieGet.mockReturnValue(undefined);
    cartMocks.cartFindFirst.mockResolvedValue(null);
    cartMocks.cartCreate.mockResolvedValue({ id: "cart_1" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("includes HttpOnly and SameSite for anonymous carts", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const out = await getCartForRequest(null);
    expect(out.setCookie).toContain("HttpOnly");
    expect(out.setCookie).toContain("SameSite=Lax");
    expect(out.setCookie).not.toContain("Secure");
  });

  it("adds Secure attribute in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const out = await getCartForRequest(null);
    expect(out.setCookie).toContain("HttpOnly");
    expect(out.setCookie).toContain("SameSite=Lax");
    expect(out.setCookie).toContain("Secure");
  });
});

