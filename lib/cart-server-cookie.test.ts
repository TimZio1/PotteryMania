import { beforeEach, describe, expect, it, vi } from "vitest";

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
    cartMocks.cookieGet.mockReturnValue(undefined);
    cartMocks.cartFindFirst.mockResolvedValue(null);
    cartMocks.cartCreate.mockResolvedValue({ id: "cart_1" });
  });

  it("includes HttpOnly and SameSite for anonymous carts", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    try {
      const out = await getCartForRequest(null);
      expect(out.setCookie).toContain("HttpOnly");
      expect(out.setCookie).toContain("SameSite=Lax");
      expect(out.setCookie).not.toContain("Secure");
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it("adds Secure attribute in production", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const out = await getCartForRequest(null);
      expect(out.setCookie).toContain("HttpOnly");
      expect(out.setCookie).toContain("SameSite=Lax");
      expect(out.setCookie).toContain("Secure");
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });
});

