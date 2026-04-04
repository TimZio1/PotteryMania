import { test, expect } from "../helpers/fixtures";
import { getExperienceId, getTestCredentials, getVendorCredentials } from "../helpers/env";
import { loginWithCredentials } from "../helpers/auth";

test.describe("Flow 4 — Class booking → cart", () => {
  test("select slot, add to cart, see confirmation", async ({ page }) => {
    const expId = getExperienceId();
    test.skip(!expId, "Set TEST_EXPERIENCE_ID to a public active experience UUID");

    const creds = getTestCredentials() ?? getVendorCredentials();
    test.skip(!creds, "Set TEST_EMAIL / TEST_PASSWORD (any signed-in user; /cart requires login)");

    await test.step("Login", async () => {
      await loginWithCredentials(page, creds!.email, creds!.password, `/classes/${expId}`);
    });

    await test.step("Experience page renders", async () => {
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
    });

    const noSlots = page.getByText(/No open sessions with enough seats/i);
    if (await noSlots.isVisible()) {
      test.skip(true, "No bookable slots in the next 60 days for this experience.");
    }

    await test.step("Book form: add class to cart", async () => {
      await expect(page.getByRole("heading", { name: /^Book$/ })).toBeVisible();
      const seatSelect = page.getByRole("combobox", { name: /Seat type/i });
      if (await seatSelect.isVisible()) {
        const opt = seatSelect.locator("option").nth(1);
        if ((await opt.count()) > 0) await seatSelect.selectOption({ index: 1 });
      }

      const [addRes] = await Promise.all([
        page.waitForResponse((r) => r.url().includes("/api/cart") && r.request().method() === "POST"),
        page.getByRole("button", { name: /Add class to cart/i }).click(),
      ]);
      expect(addRes.status(), "POST /api/cart").toBeLessThan(300);
      await expect(page.getByText(/Class added to cart/i)).toBeVisible({ timeout: 15_000 });
    });
  });
});

test.describe("Flow 4 — Booking UI (mobile)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("experience page loads when TEST_EXPERIENCE_ID set", async ({ page }) => {
    const expId = getExperienceId();
    test.skip(!expId, "Set TEST_EXPERIENCE_ID");

    await page.goto(`/classes/${expId}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
  });
});
