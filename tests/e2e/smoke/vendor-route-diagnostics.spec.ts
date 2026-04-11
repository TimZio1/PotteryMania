import { test, expect } from "@playwright/test";
import { getAdminCredentials } from "../helpers/env";
import { loginWithCredentials } from "../helpers/auth";

async function resolveStudioId(page: import("@playwright/test").Page) {
  const admin = getAdminCredentials();
  test.skip(!admin, "TEST_ADMIN_EMAIL + TEST_ADMIN_PASSWORD required.");
  await loginWithCredentials(page, admin!.email, admin!.password, "/admin/studios");
  await expect(page).toHaveURL(/\/admin\/studios/);
  const firstStudioLink = page.locator('a[href^="/admin/studios/"]').first();
  await expect(firstStudioLink).toBeVisible({ timeout: 20_000 });
  const studioHref = await firstStudioLink.getAttribute("href");
  const studioId = studioHref?.split("/").pop();
  if (!studioId) throw new Error("No studio id found");
  return studioId;
}

for (const pathSuffix of [
  "",
  "/guided",
  "/settings",
  "/template",
  "/calendar",
  "/analytics",
  "/features",
  "/payments",
  "/shop",
]) {
  test(`diagnose vendor route ${pathSuffix || "/home"}`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => pageErrors.push(err.message));

    const studioId = await resolveStudioId(page);
    const route = `/dashboard/${studioId}${pathSuffix}`;
    await page.goto(route, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForTimeout(3000);
    await expect(page.locator("html")).toBeVisible();

    console.log(JSON.stringify({ route, consoleErrors, pageErrors }));
  });
}
