import { test, expect } from "../helpers/fixtures";
import { COPY, earlyAccessIds } from "../helpers/selectors";
import { getAdminCredentials } from "../helpers/env";
import { loginWithCredentials } from "../helpers/auth";

function uniqueLeadEmail() {
  return `e2e-lead-${Date.now()}@example.com`;
}

test.describe("Flow 1 — Early access (desktop)", () => {
  test("submits teaser form with validation and real success state", async ({ page }) => {
    const email = uniqueLeadEmail();

    await test.step("Open /early-access", async () => {
      await page.goto("/early-access");
      await expect(page.getByRole("heading", { name: COPY.earlyAccessHero })).toBeVisible();
      await expect(page.getByRole("heading", { name: COPY.earlyAccessRegisterHeading })).toBeVisible();
      await expect(page.getByRole("button", { name: /Register Your Studio — Free/i })).toBeVisible();
    });

    await test.step("Fill required fields", async () => {
      await page.locator(earlyAccessIds.email).fill(email);
      await page.locator(earlyAccessIds.studio).fill(`E2E Studio ${Date.now()}`);
      await page.locator(earlyAccessIds.country).selectOption({ label: "Germany" });
      await page.locator(earlyAccessIds.web).fill("https://instagram.com/e2e-studio");
    });

    await test.step("Select interest checkbox", async () => {
      await page.getByRole("checkbox", { name: /Both — the full platform/i }).check();
    });

    await test.step("Submit and verify success copy", async () => {
      const [resp] = await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes("/api/early-access") && r.request().method() === "POST",
          { timeout: 90_000 },
        ),
        page.getByRole("button", { name: /Register Your Studio — Free/i }).click(),
      ]);
      expect(resp.status(), "early-access API should return 200").toBe(200);
      await expect(page.getByRole("heading", { name: /on the list/i })).toBeVisible({
        timeout: 15_000,
      });
    });

    await test.step("Duplicate email returns 409", async () => {
      await page.goto("/early-access");
      await page.locator(earlyAccessIds.email).fill(email);
      await page.locator(earlyAccessIds.studio).fill("Dup Studio");
      await page.locator(earlyAccessIds.country).selectOption({ label: "Germany" });
      await page.getByRole("checkbox", { name: /Marketplace — sell ceramics to a global audience/i }).check();

      const [resp2] = await Promise.all([
        page.waitForResponse((r) => r.url().includes("/api/early-access") && r.request().method() === "POST"),
        page.getByRole("button", { name: /Register Your Studio — Free/i }).click(),
      ]);
      expect(resp2.status()).toBe(409);
      await expect(page.getByText(/already registered/i)).toBeVisible();
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
    const email = uniqueLeadEmail();
    await page.goto("/early-access");
    await expect(page.getByRole("heading", { name: COPY.earlyAccessHero })).toBeVisible();
    await page.locator(earlyAccessIds.email).fill(email);
    await page.locator(earlyAccessIds.studio).fill(`Mobile Studio ${Date.now()}`);
    await page.locator(earlyAccessIds.country).selectOption({ label: "France" });
    await page.getByRole("checkbox", { name: /Booking system/i }).check();

    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/early-access") && r.request().method() === "POST",
        { timeout: 90_000 },
      ),
      page.getByRole("button", { name: /Register Your Studio — Free/i }).click(),
    ]);
    expect(resp.status()).toBe(200);
    await expect(page.getByRole("heading", { name: /on the list/i })).toBeVisible({ timeout: 15_000 });
  });
});
