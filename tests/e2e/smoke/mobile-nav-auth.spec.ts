import { test, expect } from "../helpers/fixtures";
import { getTestCredentials } from "../helpers/env";
import { loginWithCredentials } from "../helpers/auth";

test.describe("Mobile nav (authenticated)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("burger menu opens, closes, and navigates for logged-in users", async ({ page }) => {
    const seeded = getTestCredentials();
    test.skip(!seeded, "TEST credentials required for authenticated mobile nav flow.");

    await loginWithCredentials(page, seeded!.email, seeded!.password, "/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);

    const burger = page.getByRole("button", { name: /open menu/i });
    await expect(burger).toBeVisible();
    await burger.click();

    const mobileNav = page.locator("#mobile-nav nav[aria-label='Mobile primary']");
    await expect(mobileNav).toBeVisible();

    await page.getByRole("link", { name: /^Account$/i }).click();
    await expect(page).toHaveURL(/\/account/);

    const burgerOnAccount = page.getByRole("button", { name: /open menu/i });
    await expect(burgerOnAccount).toBeVisible();
    await burgerOnAccount.click();
    await expect(mobileNav).toBeVisible();

    await page.locator("#mobile-nav button[aria-label='Close menu']").click();
    await expect(mobileNav).not.toBeVisible();
  });
});
