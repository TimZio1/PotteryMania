import { test, expect } from "../helpers/fixtures";
import type { Page } from "@playwright/test";
test.describe("Flow 1 — /early-access → studio setup", () => {
  test("redirects anonymous visitors toward studio creation (via login)", async ({ page }) => {
    await page.goto("/early-access", { waitUntil: "domcontentloaded", timeout: 45_000 });
    await expect(page).toHaveURL(/\/login/);
    const u = new URL(page.url());
    expect(u.searchParams.get("callbackUrl") || "").toContain("/dashboard/studio/new");
  });

  test("POST /api/early-access is closed (410)", async ({ page }) => {
    const res = await page.request.post("/api/early-access", {
      data: {
        email: "e2e-closed@example.com",
        studioName: "E2E Studio",
        country: "Germany",
        wantBooking: true,
      },
    });
    expect(res.status()).toBe(410);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toMatch(/Create your studio from the dashboard/i);
  });
});

test.describe("Flow 1 — Studio setup entry (mobile viewport)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("legacy /early-access URL still resolves for mobile visitors", async ({ page }: { page: Page }) => {
    await page.goto("/early-access", { waitUntil: "domcontentloaded", timeout: 45_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
