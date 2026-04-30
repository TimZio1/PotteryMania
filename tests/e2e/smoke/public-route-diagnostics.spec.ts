import { test, expect } from "@playwright/test";

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/wear/shop",
  "/cart",
  "/robots.txt",
  "/sitemap.xml",
  "/api/ready",
] as const;

for (const route of PUBLIC_ROUTES) {
  test(`diagnose public route ${route}`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto(route, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForTimeout(2000);
    await expect(page.locator("html")).toBeVisible();

    console.log(JSON.stringify({ route, consoleErrors, pageErrors, finalUrl: page.url() }));
  });
}

test("diagnose wear shop after legacy marketplace PDP URL", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await page.goto("/marketplace/products/00000000-0000-0000-0000-000000000001", {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await page.waitForTimeout(2000);
  await expect(page.locator("html")).toBeVisible();
  await expect(page).toHaveURL(/\/wear\/shop/);

  console.log(
    JSON.stringify({
      route: "legacy marketplace PDP → wear shop",
      consoleErrors,
      pageErrors,
      finalUrl: page.url(),
    }),
  );
});
