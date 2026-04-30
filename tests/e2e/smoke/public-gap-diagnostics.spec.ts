import { test, expect } from "@playwright/test";

const OPTIONAL_PUBLIC_ROUTES = [
  "/studios",
  "/classes",
  "/marketplace",
  "/wear/shop",
  "/pricing",
  "/privacy",
  "/terms",
] as const;

for (const route of OPTIONAL_PUBLIC_ROUTES) {
  test(`diagnose optional public route ${route}`, async ({ page }) => {
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

test("diagnose wear PDP discovered from live shop", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await page.goto("/wear/shop", { waitUntil: "domcontentloaded", timeout: 45_000 });
  const firstProduct = page.locator('a[href^="/wear/"]').filter({ hasNot: page.locator('[href="/wear/shop"]') }).first();
  await expect(firstProduct).toBeVisible({ timeout: 20_000 });
  const href = await firstProduct.getAttribute("href");
  if (!href) throw new Error("Could not resolve a live wear PDP link from /wear/shop");

  await page.goto(href, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(2000);
  await expect(page.locator("html")).toBeVisible();

  console.log(JSON.stringify({ route: href, consoleErrors, pageErrors, finalUrl: page.url() }));
});
