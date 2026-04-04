import { test, expect } from "../helpers/fixtures";
import { getStudioId, getVendorCredentials } from "../helpers/env";
import { loginWithCredentials } from "../helpers/auth";

test.describe("Flow 3 — Product creation", () => {
  test("vendor creates draft product with image URL and sees it in list", async ({ page }) => {
    const creds = getVendorCredentials();
    const studioId = getStudioId();
    test.skip(!creds || !studioId, "Set TEST_VENDOR_EMAIL, TEST_VENDOR_PASSWORD (or TEST_EMAIL/PASSWORD), and TEST_STUDIO_ID");

    const title = `E2E Product ${Date.now()}`;

    await test.step("Login as vendor", async () => {
      await loginWithCredentials(page, creds!.email, creds!.password, `/dashboard/products/${studioId}`);
    });

    await test.step("Open product editor", async () => {
      await page.getByRole("button", { name: /Add product/i }).click();
      await expect(page.getByRole("heading", { name: /New product/i })).toBeVisible();
    });

    await test.step("Fill minimum fields + public image URL", async () => {
      await page.locator('label:has-text("Title") input').fill(title);
      await page.getByPlaceholder(/^Image URL$/i).first().fill("https://picsum.photos/seed/e2e-product/600/600");
    });

    await test.step("Save (create)", async () => {
      const [res] = await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes(`/api/studios/${studioId}/products`) && r.request().method() === "POST",
        ),
        page.getByRole("button", { name: /^Create product$/i }).click(),
      ]);
      expect(res.status(), "product create API").toBeLessThan(300);
      await expect(page.getByText(/Product created/i)).toBeVisible({ timeout: 15_000 });
    });

    await test.step("Listed in dashboard", async () => {
      await expect(page.getByRole("heading", { name: title })).toBeVisible({ timeout: 15_000 });
    });

    await test.step("Persist after reload", async () => {
      await page.reload();
      await expect(page.getByRole("heading", { name: title })).toBeVisible({ timeout: 20_000 });
    });
  });
});

test.describe("Flow 3 — Product form (mobile)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Add product opens on small screen when env configured", async ({ page }) => {
    const creds = getVendorCredentials();
    const studioId = getStudioId();
    test.skip(!creds || !studioId, "Set vendor credentials and TEST_STUDIO_ID");

    await loginWithCredentials(page, creds!.email, creds!.password, `/dashboard/products/${studioId}`);
    await page.getByRole("button", { name: /Add product/i }).click();
    await expect(page.getByRole("heading", { name: /New product/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Create product$/i })).toBeVisible();
  });
});
