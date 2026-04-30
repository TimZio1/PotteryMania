import { test, expect } from "@playwright/test";
import { getAdminCredentials } from "../helpers/env";
import { loginWithCredentials } from "../helpers/auth";

const ADMIN_ROUTES = [
  "/admin",
  "/admin/war-room",
  "/admin/notifications",
  "/admin/audit",
  "/admin/users",
  "/admin/studios",
  "/admin/revenue",
  "/admin/features",
  "/admin/ai-insights",
  "/admin/coupons",
  "/admin/wear-products",
  "/admin/wear-orders",
  "/admin/wear-analytics",
  "/admin/orders",
  "/admin/operations",
  "/admin/content",
  "/admin/platform-features",
  "/admin/feature-bundles",
  "/admin/business-templates",
  "/admin/categories",
  "/admin/experiments",
  "/admin/reports",
  "/admin/system",
  "/admin/settings",
  "/admin/finance",
] as const;

test("admin deep link requires auth when logged out", async ({ page }) => {
  await page.goto("/admin/users", { waitUntil: "domcontentloaded", timeout: 45_000 });
  await expect(page).toHaveURL(/\/login|\/unauthorized-admin/);
});

test("admin mobile nav opens and vendor view link works", async ({ page }) => {
  const admin = getAdminCredentials();
  test.skip(!admin, "TEST_ADMIN_EMAIL + TEST_ADMIN_PASSWORD required.");

  await loginWithCredentials(page, admin!.email, admin!.password, "/admin");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin", { waitUntil: "domcontentloaded", timeout: 45_000 });

  const menu = page.getByRole("button", { name: /Open admin menu/i });
  await expect(menu).toBeVisible({ timeout: 20_000 });
  await menu.click();
  const nav = page.getByRole("navigation", { name: /Admin mobile nav/i });
  await expect(nav).toBeVisible({ timeout: 20_000 });
  await page.getByRole("link", { name: /Vendor view/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

for (const route of ADMIN_ROUTES) {
  test(`diagnose admin route ${route}`, async ({ page }) => {
    const admin = getAdminCredentials();
    test.skip(!admin, "TEST_ADMIN_EMAIL + TEST_ADMIN_PASSWORD required.");

    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await loginWithCredentials(page, admin!.email, admin!.password, route);
    await page.goto(route, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForTimeout(1500);
    await expect(page.locator("html")).toBeVisible();

    console.log(JSON.stringify({ route, consoleErrors, pageErrors, finalUrl: page.url() }));
  });
}

test("diagnose first admin user and studio detail pages", async ({ page }) => {
  const admin = getAdminCredentials();
  test.skip(!admin, "TEST_ADMIN_EMAIL + TEST_ADMIN_PASSWORD required.");

  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await loginWithCredentials(page, admin!.email, admin!.password, "/admin/users");

  await page.goto("/admin/users", { waitUntil: "domcontentloaded", timeout: 45_000 });
  const firstUser = page.locator('a[href^="/admin/users/"]').first();
  await expect(firstUser).toBeVisible({ timeout: 20_000 });
  const userHref = await firstUser.getAttribute("href");
  if (!userHref) throw new Error("Could not resolve an admin user detail link");
  await page.goto(userHref, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await expect(page.locator("html")).toBeVisible();

  await page.goto("/admin/studios", { waitUntil: "domcontentloaded", timeout: 45_000 });
  const firstStudio = page.locator('a[href^="/admin/studios/"]').first();
  await expect(firstStudio).toBeVisible({ timeout: 20_000 });
  const studioHref = await firstStudio.getAttribute("href");
  if (!studioHref) throw new Error("Could not resolve an admin studio detail link");
  await page.goto(studioHref, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await expect(page.locator("html")).toBeVisible();

  console.log(JSON.stringify({ route: "admin-detail-pages", consoleErrors, pageErrors, finalUrl: page.url() }));
});
