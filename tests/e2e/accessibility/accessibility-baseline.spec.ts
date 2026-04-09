import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { loginWithCredentials } from "../helpers/auth";
import { getAdminCredentials } from "../helpers/env";

async function expectNoSeriousOrCriticalViolations(page: Page, route: string) {
  await page.goto(route, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await expect(page.locator("html")).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
  expect(
    blocking,
    `A11y serious/critical violations on ${route}: ${blocking.map((v) => `${v.id} (${v.impact})`).join(", ")}`,
  ).toEqual([]);
}

test.describe("A11y baseline (Axe)", () => {
  const publicRoutes = ["/", "/early-access", "/classes", "/marketplace", "/login"];

  for (const route of publicRoutes) {
    test(`public route ${route} has no serious/critical violations`, async ({ page }) => {
      await expectNoSeriousOrCriticalViolations(page, route);
    });
  }

  test("admin route has no serious/critical violations", async ({ page }) => {
    const admin = getAdminCredentials();
    if (admin) {
      await loginWithCredentials(page, admin.email, admin.password, "/admin");
      const results = await new AxeBuilder({ page }).analyze();
      const blocking = results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
      expect(
        blocking,
        `A11y serious/critical violations on /admin: ${blocking.map((v) => `${v.id} (${v.impact})`).join(", ")}`,
      ).toEqual([]);
      return;
    }

    // Fallback when admin creds are not available in current env.
    await expectNoSeriousOrCriticalViolations(page, "/login?callbackUrl=%2Fadmin");
  });
});
