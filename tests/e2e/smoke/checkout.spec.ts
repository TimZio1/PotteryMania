import { test, expect } from "../helpers/fixtures";
import { getExperienceId, getTestCredentials, getVendorCredentials } from "../helpers/env";
import { loginWithCredentials } from "../helpers/auth";

/**
 * Validates checkout init through Stripe Checkout session URL.
 * Requires Stripe test keys in the app environment; we do not complete Hosted Checkout UI here.
 */
test.describe("Flow 5 — Checkout init", () => {
  test("booking line: cart summary then Continue to payment returns Stripe session URL", async ({ page }) => {
    const expId = getExperienceId();
    test.skip(!expId, "Set TEST_EXPERIENCE_ID");

    const creds = getTestCredentials() ?? getVendorCredentials();
    test.skip(!creds, "Set TEST_EMAIL / TEST_PASSWORD");

    await loginWithCredentials(page, creds!.email, creds!.password, `/classes/${expId}`);

    if (await page.getByText(/No open sessions with enough seats/i).isVisible()) {
      test.skip(true, "No slots available for checkout test.");
    }

    await test.step("Add booking to cart", async () => {
      const seatSelect = page.getByRole("combobox", { name: /Seat type/i });
      if (await seatSelect.isVisible()) {
        const opt = seatSelect.locator("option").nth(1);
        if ((await opt.count()) > 0) await seatSelect.selectOption({ index: 1 });
      }
      await Promise.all([
        page.waitForResponse((r) => r.url().includes("/api/cart") && r.request().method() === "POST"),
        page.getByRole("button", { name: /Add class to cart/i }).click(),
      ]);
    });

    await test.step("Cart shows line and totals", async () => {
      await page.goto("/cart");
      await expect(page.getByRole("heading", { name: /^Cart$/ })).toBeVisible();
      await expect(page.locator("ul").first()).not.toContainText(/empty/i);
      await expect(page.getByText(/Charged at checkout/i)).toBeVisible();
    });

    await test.step("Fill checkout details (booking-only)", async () => {
      await page.locator("#cart-name").fill("E2E Customer");
      await page.locator("#cart-email").fill("e2e-checkout@example.com");
    });

    await test.step("Continue to payment → Stripe session URL", async () => {
      const [checkoutRes] = await Promise.all([
        page.waitForResponse((r) => r.url().includes("/api/checkout") && r.request().method() === "POST"),
        page.getByRole("button", { name: /Continue to payment/i }).click(),
      ]);

      expect(checkoutRes.ok(), `checkout API HTTP ${checkoutRes.status()}`).toBeTruthy();
      const json = (await checkoutRes.json()) as { url?: string };
      expect(json.url).toMatch(/https:\/\/.+/);
    });
  });
});
