import { test, expect } from "@playwright/test";
import { loginWithCredentials } from "../helpers/auth";
import { getAdminCredentials, getStudioId, getTestCredentials, getVendorCredentials } from "../helpers/env";

test.describe("UX journeys — customer top 10", () => {
  test("customer public routes are reachable", async ({ page }) => {
    test.setTimeout(240_000);
    const customerRoutes = [
      "/",
      "/wear/shop",
      "/wear/partner",
      "/register",
      "/login",
    ];

    for (const route of customerRoutes) {
      await test.step(`customer route ${route}`, async () => {
        await page.goto(route, { waitUntil: "commit", timeout: 45_000 });
        await expect(page.locator("html")).toBeVisible();
      });
    }
  });

  test("customer protected route journey", async ({ page }) => {
    const creds = getTestCredentials();
    if (!creds) {
      await page.goto("/my-orders");
      await expect(page).toHaveURL(/\/login/);
      return;
    }
    await loginWithCredentials(page, creds.email, creds.password, "/my-orders");
    await expect(page).toHaveURL(/\/my-orders/);
    await expect(page.getByRole("heading", { name: /^My orders$/i })).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("UX journeys — studio-admin top 10", () => {
  test("vendor dashboard surface reachability", async ({ page }) => {
    const creds = getVendorCredentials();
    const studioId = getStudioId();
    if (!creds || !studioId) {
      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/login/);
      return;
    }

    const routes = [
      "/dashboard",
      `/dashboard/${studioId}`,
      `/dashboard/${studioId}/commerce/wearables`,
      `/dashboard/${studioId}/commerce/orders`,
      `/dashboard/${studioId}/money/overview`,
      `/dashboard/${studioId}/settings`,
      `/dashboard/${studioId}/site/page`,
      `/dashboard/${studioId}/guided`,
    ];

    await loginWithCredentials(page, creds.email, creds.password, routes[0]);

    for (const route of routes) {
      await test.step(`vendor route ${route}`, async () => {
        await page.goto(route, { waitUntil: "domcontentloaded", timeout: 45_000 });
        await expect(page).not.toHaveURL(/\/login/);
        await expect(page.locator("html")).toBeVisible();
      });
    }
  });
});

test.describe("UX journeys — hyperadmin top 10", () => {
  test("hyperadmin operations route reachability", async ({ page }) => {
    const admin = getAdminCredentials();
    if (!admin) {
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/login|\/unauthorized-admin/);
      return;
    }

    const routes = [
      "/admin",
      "/admin/reports",
      "/admin/users",
      "/admin/studios",
      "/admin/orders",
      "/admin/wear-products",
      "/admin/finance",
      "/admin/system",
      "/admin/operations",
      "/admin/war-room",
    ];

    await loginWithCredentials(page, admin.email, admin.password, routes[0]);

    for (const route of routes) {
      await test.step(`hyperadmin route ${route}`, async () => {
        await page.goto(route, { waitUntil: "domcontentloaded", timeout: 45_000 });
        await expect(page).not.toHaveURL(/\/login|\/unauthorized-admin/);
        await expect(page.locator("html")).toBeVisible();
      });
    }
  });
});
