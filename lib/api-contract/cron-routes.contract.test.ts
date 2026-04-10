import { beforeEach, describe, expect, it, vi } from "vitest";

const cronMocks = vi.hoisted(() => ({
  isCronAuthorized: vi.fn(),
  isRuntimeFlagEnabled: vi.fn(),
  logCronRun: vi.fn(),
  runRankingScoreUpdate: vi.fn(),
  backfillOrdersToLedger: vi.fn(),
  backfillStudioActivationsToLedger: vi.fn(),
  syncStripeBalanceTransactions: vi.fn(),
  aggregateFinancialSnapshotsForDate: vi.fn(),
  runFinancialIntelligence: vi.fn(),
  sendBookingEmails: vi.fn(),
  bookingFindMany: vi.fn(),
  bookingUpdate: vi.fn(),
  wearCount: vi.fn(),
  adminNotificationFindFirst: vi.fn(),
  adminNotificationCreate: vi.fn(),
}));

vi.mock("@/lib/cron-auth", () => ({
  isCronAuthorized: cronMocks.isCronAuthorized,
}));

vi.mock("@/lib/cron-audit", () => ({
  logCronRun: cronMocks.logCronRun,
}));

vi.mock("@/lib/runtime-feature-flags", () => ({
  isRuntimeFlagEnabled: cronMocks.isRuntimeFlagEnabled,
  RUNTIME_FLAG_KEYS: {
    rankingUpdateEnabled: "ranking_update_enabled",
  },
}));

vi.mock("@/lib/ranking/score-engine", () => ({
  runRankingScoreUpdate: cronMocks.runRankingScoreUpdate,
}));

vi.mock("@/lib/finance/backfill-commerce", () => ({
  backfillOrdersToLedger: cronMocks.backfillOrdersToLedger,
  backfillStudioActivationsToLedger: cronMocks.backfillStudioActivationsToLedger,
}));

vi.mock("@/lib/finance/stripe-balance-sync", () => ({
  syncStripeBalanceTransactions: cronMocks.syncStripeBalanceTransactions,
}));

vi.mock("@/lib/finance/aggregate-daily", () => ({
  aggregateFinancialSnapshotsForDate: cronMocks.aggregateFinancialSnapshotsForDate,
}));

vi.mock("@/lib/finance/intelligence", () => ({
  runFinancialIntelligence: cronMocks.runFinancialIntelligence,
}));

vi.mock("@/lib/email/booking-notify", () => ({
  sendBookingEmails: cronMocks.sendBookingEmails,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    booking: {
      findMany: (...args: unknown[]) => cronMocks.bookingFindMany(...args),
      update: (...args: unknown[]) => cronMocks.bookingUpdate(...args),
    },
    wearAnalyticsEvent: {
      count: (...args: unknown[]) => cronMocks.wearCount(...args),
    },
    adminNotification: {
      findFirst: (...args: unknown[]) => cronMocks.adminNotificationFindFirst(...args),
      create: (...args: unknown[]) => cronMocks.adminNotificationCreate(...args),
    },
  },
}));

import { GET as getRankingUpdate } from "@/app/api/cron/ranking-update/route";
import { GET as getFinanceReconcile } from "@/app/api/cron/finance-reconcile/route";
import { GET as getBookingReminders } from "@/app/api/cron/booking-reminders/route";

describe("API contract: cron resilience routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cronMocks.isCronAuthorized.mockReturnValue(true);
    cronMocks.isRuntimeFlagEnabled.mockResolvedValue(true);
    cronMocks.logCronRun.mockResolvedValue(undefined);
    cronMocks.runRankingScoreUpdate.mockResolvedValue({
      ok: true,
      studiosProcessed: 2,
      scoresDeletedNonApproved: 0,
      durationMs: 120,
    });
    cronMocks.backfillOrdersToLedger.mockResolvedValue({ processed: 10 });
    cronMocks.backfillStudioActivationsToLedger.mockResolvedValue({ processed: 1 });
    cronMocks.syncStripeBalanceTransactions.mockResolvedValue({ rows: 0, error: null });
    cronMocks.aggregateFinancialSnapshotsForDate.mockResolvedValue(undefined);
    cronMocks.runFinancialIntelligence.mockResolvedValue({ alerts: 0, recommendations: 0 });
    cronMocks.wearCount.mockResolvedValue(0);
    cronMocks.adminNotificationFindFirst.mockResolvedValue(null);
    cronMocks.adminNotificationCreate.mockResolvedValue({ id: "note_1" });
    cronMocks.bookingFindMany.mockResolvedValue([]);
    cronMocks.bookingUpdate.mockResolvedValue(undefined);
    cronMocks.sendBookingEmails.mockResolvedValue(undefined);
  });

  it("returns 401 for unauthorized cron request", async () => {
    cronMocks.isCronAuthorized.mockReturnValue(false);
    const req = new Request("http://localhost:3000/api/cron/ranking-update");
    const res = await getRankingUpdate(req);
    expect(res.status).toBe(401);
  });

  it("returns 500 and logs failed ranking run when job throws", async () => {
    cronMocks.runRankingScoreUpdate.mockRejectedValueOnce(new Error("ranking engine exploded"));
    const req = new Request("http://localhost:3000/api/cron/ranking-update");
    const res = await getRankingUpdate(req);
    const json = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(500);
    expect(json.error).toBe("Ranking update failed");
    expect(cronMocks.logCronRun).toHaveBeenCalledWith(
      "ranking-update",
      expect.objectContaining({ ok: false }),
    );
  });

  it("returns 503 when ranking-update runtime flag is disabled", async () => {
    cronMocks.isRuntimeFlagEnabled.mockResolvedValueOnce(false);
    const req = new Request("http://localhost:3000/api/cron/ranking-update");
    const res = await getRankingUpdate(req);
    const json = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(503);
    expect(json.error).toBe("Ranking update is disabled");
    expect(cronMocks.runRankingScoreUpdate).not.toHaveBeenCalled();
    expect(cronMocks.logCronRun).toHaveBeenCalledWith(
      "ranking-update",
      expect.objectContaining({ ok: false, disabled: true }),
    );
  });

  it("returns 500 and logs failed finance reconcile when dependency throws", async () => {
    cronMocks.runFinancialIntelligence.mockRejectedValueOnce(new Error("intelligence failed"));
    const req = new Request("http://localhost:3000/api/cron/finance-reconcile");
    const res = await getFinanceReconcile(req);
    const json = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(500);
    expect(json.error).toBe("Finance reconcile failed");
    expect(cronMocks.logCronRun).toHaveBeenCalledWith(
      "finance-reconcile",
      expect.objectContaining({ ok: false }),
    );
  });

  it("returns 207 when reminder processing is partially successful", async () => {
    cronMocks.bookingFindMany.mockResolvedValueOnce([
      {
        id: "b1",
        customerEmail: "a@example.com",
        customerName: "A",
        studio: { email: "studio@example.com" },
        experience: { title: "Wheel" },
        slot: { slotDate: new Date("2026-04-11T00:00:00.000Z"), startTime: "10:00" },
      },
      {
        id: "b2",
        customerEmail: "b@example.com",
        customerName: "B",
        studio: { email: "studio@example.com" },
        experience: { title: "Wheel" },
        slot: { slotDate: new Date("2026-04-11T00:00:00.000Z"), startTime: "12:00" },
      },
    ]);
    cronMocks.sendBookingEmails.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("email fail"));
    const req = new Request("http://localhost:3000/api/cron/booking-reminders");
    const res = await getBookingReminders(req);
    const json = (await res.json()) as { ok: boolean; sent: number; failed: number; candidates: number };
    expect(res.status).toBe(207);
    expect(json).toMatchObject({ ok: true, sent: 1, failed: 1, candidates: 2 });
    expect(cronMocks.bookingUpdate).toHaveBeenCalledTimes(1);
    expect(cronMocks.logCronRun).toHaveBeenCalledWith(
      "booking-reminders",
      expect.objectContaining({ ok: true, failed: 1 }),
    );
  });
});
