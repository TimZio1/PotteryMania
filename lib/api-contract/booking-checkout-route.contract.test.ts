import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  assertRateLimit: vi.fn(),
  isRuntimeFlagEnabled: vi.fn(),
  slotFindUnique: vi.fn(),
  stripeAccountFindUnique: vi.fn(),
  resolveCommissionBps: vi.fn(),
  commissionCentsFromLine: vi.fn(),
  allocateTicketRef: vi.fn(),
  bookingCreate: vi.fn(),
  orderCreate: vi.fn(),
  bookingAddOnCreateMany: vi.fn(),
  slotUpdate: vi.fn(),
  transaction: vi.fn(),
  sessionCreate: vi.fn(),
  validateAddOns: vi.fn(),
  validateIntake: vi.fn(),
  instructorLinkFindFirst: vi.fn(),
  bookingCount: vi.fn(),
}));

vi.mock("@/lib/auth-session", () => ({
  getSessionUser: () => mocks.getSessionUser(),
}));
vi.mock("@/lib/rate-limit", () => ({
  assertRateLimit: () => mocks.assertRateLimit(),
}));
vi.mock("@/lib/runtime-feature-flags", () => ({
  isRuntimeFlagEnabled: () => mocks.isRuntimeFlagEnabled(),
  RUNTIME_FLAG_KEYS: { bookingCheckoutEnabled: "bookingCheckoutEnabled" },
}));
vi.mock("@/lib/commission", () => ({
  resolveCommissionBps: () => mocks.resolveCommissionBps(),
  commissionCentsFromLine: (_c: number, _b: number) => mocks.commissionCentsFromLine(_c, _b),
}));
vi.mock("@/lib/bookings/ticket-ref", () => ({
  allocateTicketRef: () => mocks.allocateTicketRef(),
}));
vi.mock("@/lib/bookings/seat-type", () => ({
  validateSeatTypeRequired: () => null,
  seatTypeCapacityError: () => null,
}));
vi.mock("@/lib/bookings/add-ons", () => ({
  validateAndSnapshotAddOnSelections: () => mocks.validateAddOns(),
  addOnSelectionSummary: () => [],
}));
vi.mock("@/lib/intake-forms/validate-responses", () => ({
  validateIntakeResponses: () => mocks.validateIntake(),
}));
vi.mock("@/lib/bookings/deposit", () => ({
  bookingChargeNowCents: (line: number) => line,
  normalizeBookingPaymentPreference: () => "full",
}));
vi.mock("@/lib/studio-operating-gates", () => ({
  studioCanOperateMessage: () => "Studio cannot operate",
}));
vi.mock("@/lib/monitoring", () => ({ logApiError: () => {} }));
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    checkout: {
      sessions: { create: (...a: unknown[]) => mocks.sessionCreate(...a) },
    },
  }),
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    bookingSlot: { findUnique: (...a: unknown[]) => mocks.slotFindUnique(...a) },
    stripeAccount: { findUnique: (...a: unknown[]) => mocks.stripeAccountFindUnique(...a) },
    instructorExperienceLink: { findFirst: (...a: unknown[]) => mocks.instructorLinkFindFirst(...a) },
    booking: { count: (...a: unknown[]) => mocks.bookingCount(...a) },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => mocks.transaction(fn),
  },
}));

const { POST } = await import("@/app/api/bookings/checkout/route");

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost:3000/api/bookings/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  slotId: "slot_1",
  participantCount: 1,
  customerName: "Jane",
  customerEmail: "jane@example.com",
  acceptTerms: true,
};

describe("POST /api/bookings/checkout — contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertRateLimit.mockReturnValue({ allowed: true });
    mocks.isRuntimeFlagEnabled.mockResolvedValue(true);
    mocks.getSessionUser.mockResolvedValue({ id: "u_1", role: "customer" });
    mocks.validateAddOns.mockResolvedValue({ ok: true, selections: [], totalCents: 0 });
    mocks.validateIntake.mockResolvedValue({ ok: true, responses: [] });
    mocks.resolveCommissionBps.mockResolvedValue(250);
    mocks.commissionCentsFromLine.mockReturnValue(125);
    mocks.allocateTicketRef.mockResolvedValue("TK-001");
    mocks.bookingCount.mockResolvedValue(0);

    const fakeStudio = { id: "st_1", status: "approved", tipsEnabled: false };
    const fakeExperience = {
      id: "exp_1",
      title: "Wheel 101",
      status: "active",
      visibility: "public",
      studioId: "st_1",
      studio: fakeStudio,
      priceCents: 5000,
      minimumParticipants: 1,
      maximumParticipants: 6,
      bookingDepositBps: 0,
      allowFullPaymentOption: true,
      bookingCutoffHours: 0,
      maxAdvanceBookingDays: 0,
      maxActiveBookingsPerCustomer: 0,
      cancellationPolicy: null,
      bookingApprovalRequired: false,
    };
    mocks.slotFindUnique.mockResolvedValue({
      id: "slot_1",
      status: "open",
      capacityTotal: 6,
      capacityReserved: 0,
      slotDate: new Date("2027-01-10"),
      startTime: "10:00",
      seatCapacities: null,
      experience: fakeExperience,
    });
    mocks.stripeAccountFindUnique.mockResolvedValue({
      stripeAccountId: "acct_123",
      chargesEnabled: true,
      payoutsEnabled: true,
    });
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        booking: { create: (args: unknown) => { mocks.bookingCreate(args); return { id: "bk_1" }; } },
        bookingAddOn: { createMany: mocks.bookingAddOnCreateMany },
        intakeFormResponse: { createMany: vi.fn() },
        order: { create: (args: unknown) => { mocks.orderCreate(args); return { id: "ord_1" }; } },
      }),
    );
    mocks.sessionCreate.mockResolvedValue({ url: "https://checkout.stripe.com/session_xyz", id: "cs_1" });
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(makeRequest({ slotId: "slot_1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when terms not accepted", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, acceptTerms: false }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/accept terms/i);
  });

  it("returns 429 when rate limited", async () => {
    mocks.assertRateLimit.mockReturnValue({ allowed: false });
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("returns 503 when booking checkout disabled", async () => {
    mocks.isRuntimeFlagEnabled.mockResolvedValue(false);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(503);
  });

  it("returns 404 when slot not found", async () => {
    mocks.slotFindUnique.mockResolvedValue(null);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(404);
  });

  it("returns Stripe URL on successful checkout", async () => {
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toContain("https://checkout.stripe.com");
    expect(json.orderId).toBe("ord_1");
    expect(json.bookingId).toBe("bk_1");
  });

  it("creates booking with commission from resolved BPS", async () => {
    await POST(makeRequest(VALID_BODY));
    expect(mocks.bookingCreate).toHaveBeenCalledTimes(1);
    const createArgs = mocks.bookingCreate.mock.calls[0][0];
    expect(createArgs.data.commissionAmountCents).toBe(125);
  });

  it("refuses booking when studio Stripe not enabled", async () => {
    mocks.stripeAccountFindUnique.mockResolvedValue({ chargesEnabled: false, payoutsEnabled: false });
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/cannot operate/i);
  });
});
