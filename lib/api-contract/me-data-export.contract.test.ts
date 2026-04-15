import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  checkRateLimit: vi.fn(),
  userFindUnique: vi.fn(),
  customerProfileFindUnique: vi.fn(),
  bookingFindMany: vi.fn(),
  orderFindMany: vi.fn(),
  reviewFindMany: vi.fn(),
  membershipPurchaseFindMany: vi.fn(),
  classPackagePurchaseFindMany: vi.fn(),
  bookingWaitlistEntryFindMany: vi.fn(),
}));

vi.mock("@/lib/auth-session", () => ({
  getSessionUser: () => mocks.getSessionUser(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mocks.checkRateLimit(...args),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => mocks.userFindUnique(...args) },
    customerProfile: { findUnique: (...args: unknown[]) => mocks.customerProfileFindUnique(...args) },
    booking: { findMany: (...args: unknown[]) => mocks.bookingFindMany(...args) },
    order: { findMany: (...args: unknown[]) => mocks.orderFindMany(...args) },
    review: { findMany: (...args: unknown[]) => mocks.reviewFindMany(...args) },
    membershipPurchase: { findMany: (...args: unknown[]) => mocks.membershipPurchaseFindMany(...args) },
    classPackagePurchase: { findMany: (...args: unknown[]) => mocks.classPackagePurchaseFindMany(...args) },
    bookingWaitlistEntry: { findMany: (...args: unknown[]) => mocks.bookingWaitlistEntryFindMany(...args) },
  },
}));

import { GET } from "@/app/api/me/data-export/route";

describe("API contract: GET /api/me/data-export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionUser.mockResolvedValue({
      id: "u_1",
      email: "customer@example.com",
      role: "customer",
    });
    mocks.checkRateLimit.mockReturnValue({ allowed: true });
    mocks.userFindUnique.mockResolvedValue({
      marketingConsent: true,
      emailVerifiedAt: new Date("2026-01-01T10:00:00.000Z"),
    });
    mocks.customerProfileFindUnique.mockResolvedValue(null);
    mocks.bookingFindMany.mockResolvedValue([]);
    mocks.orderFindMany.mockResolvedValue([]);
    mocks.reviewFindMany.mockResolvedValue([]);
    mocks.membershipPurchaseFindMany.mockResolvedValue([]);
    mocks.classPackagePurchaseFindMany.mockResolvedValue([]);
    mocks.bookingWaitlistEntryFindMany.mockResolvedValue([]);
  });

  it("returns consent fields and core export sections", async () => {
    const res = await GET();
    const json = (await res.json()) as {
      user: {
        id: string;
        email: string;
        role: string;
        consents: {
          marketing: boolean;
          emailVerifiedAt: string | null;
        };
      };
      bookings: unknown[];
      orders: unknown[];
      memberships: unknown[];
      classPackages: unknown[];
      waitlistEntries: unknown[];
    };

    expect(res.status).toBe(200);
    expect(json.user).toMatchObject({
      id: "u_1",
      email: "customer@example.com",
      role: "customer",
      consents: {
        marketing: true,
        emailVerifiedAt: "2026-01-01T10:00:00.000Z",
      },
    });
    expect(json).toHaveProperty("bookings");
    expect(json).toHaveProperty("orders");
    expect(json).toHaveProperty("memberships");
    expect(json).toHaveProperty("classPackages");
    expect(json).toHaveProperty("waitlistEntries");
  });
});
