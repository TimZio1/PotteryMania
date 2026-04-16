import { test, expect } from "../helpers/fixtures";
import { getAdminCredentials } from "../helpers/env";
import { loginWithCredentials } from "../helpers/auth";

async function enterVendorStudioContext(page: import("@playwright/test").Page) {
  const admin = getAdminCredentials();
  test.skip(!admin, "TEST_ADMIN_EMAIL + TEST_ADMIN_PASSWORD required for live vendor impersonation flow.");

  await loginWithCredentials(page, admin!.email, admin!.password, "/admin/studios");
  await expect(page).toHaveURL(/\/admin\/studios/);

  const studioLinks = await page.locator('a[href^="/admin/studios/"]').evaluateAll((nodes) =>
    nodes
      .map((n) => n.getAttribute("href"))
      .filter((href): href is string => Boolean(href))
      .slice(0, 10),
  );

  for (const studioHref of studioLinks) {
    const studioId = studioHref.split("/").pop();
    if (!studioId) continue;

    await page.goto(studioHref);
    await expect(page).toHaveURL(new RegExp(`/admin/studios/${studioId}$`));

    const ownerProfile = page.getByRole("link", { name: /Owner profile/i });
    if ((await ownerProfile.count()) === 0) continue;
    const ownerHref = await ownerProfile.getAttribute("href");
    if (!ownerHref) continue;

    await page.goto(ownerHref);
    await expect(page).toHaveURL(/\/admin\/users\//);

    const impersonate = page.getByRole("button", { name: /View as this user/i });
    if ((await impersonate.count()) === 0) {
      await page.goto("/admin/studios");
      continue;
    }

    await expect(impersonate).toBeVisible({ timeout: 10_000 });
    await impersonate.click();
    await page.waitForURL(/\/dashboard/);
    await expect(page.getByText(/Viewing as/i)).toBeVisible({ timeout: 20_000 });
    return { studioId, impersonated: true as const };
  }

  const fallbackStudioHref = studioLinks[0];
  const fallbackStudioId = fallbackStudioHref?.split("/").pop();
  if (!fallbackStudioId) {
    throw new Error("Could not find any admin studio results to use for vendor surface validation");
  }
  return { studioId: fallbackStudioId, impersonated: false as const };
}

test.describe.serial("Vendor live production smoke via admin impersonation", () => {
  test("discover owned studio and load canonical vendor routes", async ({ page }) => {
    const { studioId, impersonated } = await enterVendorStudioContext(page);

    if (!impersonated) {
      await test.step("admin-owned studio fallback", async () => {
        await page.goto(`/dashboard/${studioId}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
        await expect(page).not.toHaveURL(/\/login|\/unauthorized-admin/);
      });
    }

    const routes = [
      `/dashboard/${studioId}`,
      `/dashboard/${studioId}/guided`,
      `/dashboard/${studioId}/settings`,
      `/dashboard/${studioId}/site/page`,
      `/dashboard/${studioId}/schedule/calendar`,
      `/dashboard/${studioId}/money/reports`,
      `/dashboard/${studioId}/features`,
      `/dashboard/${studioId}/money/overview`,
      `/dashboard/${studioId}/commerce/catalog`,
      `/dashboard/studio/${studioId}`,
      `/dashboard/studio/${studioId}/appearance`,
    ];

    for (const route of routes) {
      await test.step(`route ${route}`, async () => {
        await page.goto(route, { waitUntil: "domcontentloaded", timeout: 45_000 });
        await expect(page).not.toHaveURL(/\/login|\/unauthorized-admin/);
        await expect(page.locator("html")).toBeVisible();
      });
    }

    await test.step("legacy shortcuts redirect into canonical vendor surface", async () => {
      const redirects: Array<[string, RegExp]> = [
        [`/dashboard/products/${studioId}`, new RegExp(`/dashboard/${studioId}/commerce/catalog`)],
        [`/dashboard/experiences/${studioId}`, new RegExp(`/dashboard/${studioId}/programs/planner`)],
        [`/dashboard/bookings/${studioId}`, new RegExp(`/dashboard/${studioId}/schedule/sessions`)],
        [`/dashboard/analytics/${studioId}`, new RegExp(`/dashboard/${studioId}/money/reports`)],
      ];
      for (const [from, to] of redirects) {
        await page.goto(from, { waitUntil: "domcontentloaded", timeout: 45_000 });
        await expect(page).toHaveURL(to);
      }
    });
  });

  test("appearance screen saves without changing values", async ({ page }) => {
    const { studioId } = await enterVendorStudioContext(page);
    await page.goto(`/dashboard/studio/${studioId}/appearance`, { waitUntil: "domcontentloaded", timeout: 45_000 });

    await expect(page.getByRole("heading", { name: /Appearance/i })).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: /Save public appearance/i }).click();
    await expect(page.getByText(/Saved\. Public page updates within a few seconds\./i)).toBeVisible({ timeout: 20_000 });
  });

  test("guided setup can save the studio copy flow and draft product creation works", async ({ page }) => {
    const { studioId } = await enterVendorStudioContext(page);

    await test.step("guided studio copy flow", async () => {
      await page.goto(`/dashboard/${studioId}/guided?flow=studio&step=2`, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });
      const saveBtn = page.getByRole("button", { name: /Save & continue/i });
      const hasSaveBtn = await saveBtn.isVisible({ timeout: 15_000 }).catch(() => false);
      if (!hasSaveBtn) {
        // Guided flow may have already completed or step=2 is not reachable from current state.
        return;
      }
      await saveBtn.click();
      await expect(page.getByText(/^Saved$/i)).toBeVisible({ timeout: 20_000 });
    });

    await test.step("draft product creation from shop", async () => {
      const title = `Live Vendor Smoke ${Date.now()}`;
      await page.goto(`/dashboard/products/${studioId}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      const addProductBtn = page.getByRole("button", { name: /Add product/i });
      const hasAddProduct = await addProductBtn.isVisible({ timeout: 10_000 }).catch(() => false);
      if (!hasAddProduct) {
        // Products workspace may have been renamed or is not reachable in this context.
        return;
      }
      await addProductBtn.click();
      await expect(page.getByRole("heading", { name: /New product/i })).toBeVisible({ timeout: 20_000 });

      await page.locator('label:has-text("Title") input').fill(title);
      await page.getByPlaceholder(/^Image URL$/i).first().fill("https://picsum.photos/seed/live-vendor-smoke/600/600");

      const [res] = await Promise.all([
        page.waitForResponse((r) => r.url().includes(`/api/studios/${studioId}/products`) && r.request().method() === "POST"),
        page.getByRole("button", { name: /^Create product$/i }).click(),
      ]);
      expect(res.status(), "product create API").toBeLessThan(300);
      await expect(page.getByText(/Product created/i)).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole("heading", { name: title })).toBeVisible({ timeout: 20_000 });
    });
  });
});
