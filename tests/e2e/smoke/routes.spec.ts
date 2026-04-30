import { test, expect } from "../helpers/fixtures";
import type { Page } from "@playwright/test";
import { getTestCredentials, getAdminCredentials } from "../helpers/env";
import { loginWithCredentials } from "../helpers/auth";

async function gotoWithRetry(page: Page, path: string) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: 45_000 });
      return;
    } catch (error) {
      if (attempt === 2) throw error;
      await page.waitForTimeout(750);
    }
  }
}

/** Fast route smoke: load + no immediate hard failure (console guard still runs on pass). */
test.describe("Route smoke", () => {
  test("public marketing and auth routes", async ({ page }) => {
    for (const path of ["/", "/login"]) {
      await test.step(path, async () => {
        await gotoWithRetry(page, path);
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

  test("legacy global discovery routes redirect away from ceramics catalog", async ({ page }) => {
    await page.goto("/marketplace", { waitUntil: "domcontentloaded", timeout: 45_000 });
    await expect(page.locator("html")).toBeVisible();
    await expect(page).toHaveURL(/\/$|\/early-access$|\/wear\/shop/);
    await test.step("/classes", async () => {
      await page.goto("/classes", { waitUntil: "domcontentloaded", timeout: 45_000 });
      await expect(page.locator("html")).toBeVisible();
      await expect(page).toHaveURL(/\/$|\/early-access$|\/wear\/shop/);
    });
    await test.step("/studios", async () => {
      await page.goto("/studios", { waitUntil: "domcontentloaded", timeout: 45_000 });
      await expect(page.locator("html")).toBeVisible();
      await expect(page).toHaveURL(/\/$|\/early-access$|\/wear\/shop/);
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
