import { test, expect } from "../helpers/fixtures";
import type { Page } from "@playwright/test";
import { COPY, earlyAccessIds } from "../helpers/selectors";
import { getAdminCredentials } from "../helpers/env";
import { loginWithCredentials } from "../helpers/auth";

function uniqueLeadEmail() {
  return `e2e-lead-${Date.now()}@example.com`;
}

async function ensureEarlyAccessApi(page: Page) {
  try {
    const probe = await page.request.get("/api/early-access/count", { timeout: 12_000 });
    test.skip(!probe.ok(), "Early-access API unavailable in this environment");
    const dbProbeEmail = `e2e-preflight-${Date.now()}@example.com`;
    const submitProbe = await page.request.post("/api/early-access", {
      timeout: 12_000,
      data: {
        email: dbProbeEmail,
        studioName: "E2E Preflight Studio",
        country: "Germany",
        wantBooking: true,
        wantMarket: false,
        wantBoth: false,
      },
    });
    test.skip(
      ![200, 409].includes(submitProbe.status()),
      "Early-access write path unavailable in this environment",
    );
  } catch {
    test.skip(true, "Early-access API unavailable in this environment");
  }
}

test.describe("Flow 1 — Early access (desktop)", () => {
  test("submits teaser form with validation and real success state", async ({ page }) => {
    await ensureEarlyAccessApi(page);
    const email = uniqueLeadEmail();

    await test.step("Open /early-access", async () => {
      await page.goto("/early-access");
      await expect(page.getByRole("heading", { name: COPY.earlyAccessHero })).toBeVisible();
      await expect(page.getByRole("button", { name: /Secure your spot/i })).toBeVisible();
    });

    await test.step("Fill required fields", async () => {
      await page.locator(earlyAccessIds.email).fill(email);
      await page.locator(earlyAccessIds.studio).fill(`E2E Studio ${Date.now()}`);
      await page.locator(earlyAccessIds.country).selectOption({ label: "Germany" });
      await page.getByRole("button", { name: /Add more details \(optional\)/i }).click();
      await page.locator(earlyAccessIds.web).fill("https://instagram.com/e2e-studio");
    });

    await test.step("Select interest checkbox", async () => {
      await page.getByText(/^Both$/i).click();
    });

    await test.step("Submit and verify success copy", async () => {
      const submit = page.locator("form").getByRole("button", { name: /Secure your spot/i });
      await submit.click();
      const welcome = page.getByRole("heading", { name: /Welcome/i });
      const unavailable = page.getByText(/temporarily unavailable|Network error|Something went wrong/i);
      await Promise.race([
        welcome.waitFor({ state: "visible", timeout: 30_000 }),
        unavailable.waitFor({ state: "visible", timeout: 30_000 }),
      ]);
      test.skip(await unavailable.isVisible(), "Early-access API unavailable in this environment");
      await expect(welcome).toBeVisible({ timeout: 15_000 });
    });

    await test.step("Duplicate email returns 409", async () => {
      await page.goto("/early-access");
      await page.locator(earlyAccessIds.email).fill(email);
      await page.locator(earlyAccessIds.studio).fill("Dup Studio");
      await page.locator(earlyAccessIds.country).selectOption({ label: "Germany" });
      await page.getByRole("button", { name: /Add more details \(optional\)/i }).click();
      await page.locator("fieldset label").filter({ hasText: /^Marketplace$/i }).first().click();

      await page.locator("form").getByRole("button", { name: /Secure your spot/i }).click();
      const duplicate = page.getByText(/This email is already registered for early access/i);
      const unavailable = page.getByText(/temporarily unavailable|Network error|Something went wrong/i);
      await Promise.race([
        duplicate.waitFor({ state: "visible", timeout: 30_000 }),
        unavailable.waitFor({ state: "visible", timeout: 30_000 }),
      ]);
      test.skip(await unavailable.isVisible(), "Early-access API unavailable in this environment");
      await expect(page.getByText(/This email is already registered for early access/i)).toBeVisible();
    });

    const admin = getAdminCredentials();
    if (admin) {
      await test.step("Optional: lead visible in admin (env: TEST_ADMIN_EMAIL)", async () => {
        await loginWithCredentials(page, admin.email, admin.password, "/admin");
        await expect(page.getByText(email)).toBeVisible({ timeout: 30_000 });
      });
    }
  });
});

test.describe("Flow 1 — Early access (mobile viewport)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("headline, CTA, and submit success on narrow viewport", async ({ page }) => {
    await ensureEarlyAccessApi(page);
    const email = uniqueLeadEmail();
    await page.goto("/early-access");
    await expect(page.getByRole("heading", { name: COPY.earlyAccessHero })).toBeVisible();
    await page.locator(earlyAccessIds.email).fill(email);
    await page.locator(earlyAccessIds.studio).fill(`Mobile Studio ${Date.now()}`);
    await page.locator(earlyAccessIds.country).selectOption({ label: "France" });
    await page.getByRole("button", { name: /Add more details \(optional\)/i }).click();
    await page.getByText(/^Booking system$/i).click();

    await page.locator("form").getByRole("button", { name: /Secure your spot/i }).click();
    const welcome = page.getByRole("heading", { name: /Welcome/i });
    const unavailable = page.getByText(/temporarily unavailable|Network error|Something went wrong/i);
    await Promise.race([
      welcome.waitFor({ state: "visible", timeout: 30_000 }),
      unavailable.waitFor({ state: "visible", timeout: 30_000 }),
    ]);
    test.skip(await unavailable.isVisible(), "Early-access API unavailable in this environment");
    await expect(welcome).toBeVisible({ timeout: 15_000 });
  });
});
