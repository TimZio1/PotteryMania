import { test, expect } from "@playwright/test";
import { getProductId } from "../helpers/env";

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

test("diagnose public product detail route", async ({ page }) => {
  const productId = getProductId();
  test.skip(!productId, "TEST_PRODUCT_ID required for live public PDP diagnostics.");

  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(err.message));

  const route = `/marketplace/products/${productId}`;
  await page.goto(route, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(2000);
  await expect(page.locator("html")).toBeVisible();

  console.log(JSON.stringify({ route, consoleErrors, pageErrors, finalUrl: page.url() }));
});
