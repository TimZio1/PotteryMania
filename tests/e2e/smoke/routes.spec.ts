import { test, expect } from "../helpers/fixtures";
import { getTestCredentials, getAdminCredentials } from "../helpers/env";
import { loginWithCredentials } from "../helpers/auth";

/** Fast route smoke: load + no immediate hard failure (console guard still runs on pass). */
test.describe("Route smoke", () => {
  test("public marketing and auth routes", async ({ page }) => {
    for (const path of ["/", "/login"]) {
      await test.step(path, async () => {
        await page.goto(path, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await expect(page.locator("html")).toBeVisible();
      });
    }
  });

  test("dashboard and cart require session (redirect to login)", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/cart");
    await expect(page).toHaveURL(/\/login/);
  });

  test("marketplace and classes when allowed (may redirect in prereg mode)", async ({ page }) => {
    await page.goto("/marketplace", { waitUntil: "domcontentloaded", timeout: 45_000 });
    await expect(page.locator("html")).toBeVisible();
    // Either marketplace content or redirect to home/early-access (prereg / empty catalog guards).
    await test.step("/classes", async () => {
      await page.goto("/classes", { waitUntil: "domcontentloaded", timeout: 45_000 });
      await expect(page.locator("html")).toBeVisible();
    });
  });

  test("admin route: forbidden or operations (when admin user provided)", async ({ page }) => {
    const admin = getAdminCredentials();
    if (!admin) {
      await page.goto("/admin");
      // Logged-out users hit middleware login first
      await expect(page).toHaveURL(/\/login|\/unauthorized-admin/);
      return;
    }
    await loginWithCredentials(page, admin.email, admin.password, "/admin");
    await expect(page.getByRole("heading", { name: /Hyperadmin|Admin access required/i })).toBeVisible({
      timeout: 30_000,
    });
  });

  test("authenticated dashboard loads with TEST_EMAIL", async ({ page }) => {
    const creds = getTestCredentials();
    if (!creds) {
      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/login/);
      return;
    }
    await loginWithCredentials(page, creds!.email, creds!.password, "/dashboard");
    await expect(page.locator("html")).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
