import { test, expect } from "../helpers/fixtures";
import { getTestCredentials } from "../helpers/env";
import { loginWithCredentials } from "../helpers/auth";

test.describe("Mobile nav (authenticated)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("burger menu opens, closes, and navigates for logged-in users", async ({ page }) => {
    const seeded = getTestCredentials();
    test.skip(!seeded, "TEST credentials required for authenticated mobile nav flow.");

    // Navigate to a marketing page that includes SiteHeader (the only layout with #mobile-nav).
    await loginWithCredentials(page, seeded!.email, seeded!.password, "/pricing");
    await expect(page).toHaveURL(/\/pricing/);

    const burger = page.getByRole("button", { name: /open menu/i });
    await expect(burger).toBeVisible({ timeout: 20_000 });
    await burger.click();

    const mobileNav = page.locator("#mobile-nav nav[aria-label='Mobile primary']");
    await expect(mobileNav).toBeVisible();

    // Verify authenticated controls are visible in the mobile nav.
    await expect(page.locator("#mobile-nav").getByRole("link", { name: /^Dashboard$/i })).toBeVisible();

    // Close via the "Close" button inside the panel header (not the backdrop overlay).
    await page.locator("#mobile-nav").getByRole("button", { name: /^Close$/i }).click();
    // The mobile nav uses opacity transitions, not display:none, so Playwright's toBeVisible()
    // stays true even when hidden. Check aria-expanded on the burger instead.
    await expect(burger).toHaveAttribute("aria-expanded", "false");
  });

  test("platform header menu opens on dashboard for logged-in users", async ({ page }) => {
    const seeded = getTestCredentials();
    test.skip(!seeded, "TEST credentials required for authenticated mobile nav flow.");

    await loginWithCredentials(page, seeded!.email, seeded!.password, "/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);

    const burger = page.getByRole("button", { name: /open menu/i }).first();
    await expect(burger).toBeVisible({ timeout: 20_000 });
    await burger.click();

    const mobileNav = page.getByRole("navigation", { name: /Platform mobile nav/i });
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: /Account/i })).toBeVisible();

    await page.locator("#platform-mobile-nav").getByRole("button", { name: /^Close$/i }).click();
    await expect(burger).toHaveAttribute("aria-expanded", "false");
  });
});
