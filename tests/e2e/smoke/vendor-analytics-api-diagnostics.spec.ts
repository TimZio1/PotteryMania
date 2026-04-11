import { test, expect } from "@playwright/test";
import { getAdminCredentials } from "../helpers/env";
import { loginWithCredentials } from "../helpers/auth";

test("diagnose live vendor analytics api response", async ({ page }) => {
  const admin = getAdminCredentials();
  test.skip(!admin, "TEST_ADMIN_EMAIL + TEST_ADMIN_PASSWORD required.");

  await loginWithCredentials(page, admin!.email, admin!.password, "/admin/studios");
  await expect(page).toHaveURL(/\/admin\/studios/);

  const firstStudioLink = page.locator('a[href^="/admin/studios/"]').first();
  const studioHref = await firstStudioLink.getAttribute("href");
  const studioId = studioHref?.split("/").pop();
  if (!studioId) throw new Error("No studio id found");

  await page.goto(`/dashboard/${studioId}`, { waitUntil: "domcontentloaded", timeout: 45_000 });

  const result = await page.evaluate(async (id) => {
    const res = await fetch(`/api/studios/${id}/analytics?days=30`);
    const text = await res.text();
    return {
      status: res.status,
      ok: res.ok,
      text,
      contentType: res.headers.get("content-type"),
    };
  }, studioId);

  console.log(JSON.stringify({ studioId, result }));
});
