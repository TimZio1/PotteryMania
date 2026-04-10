import { test, expect } from "../helpers/fixtures";
import type { Page } from "@playwright/test";

function isPublicCatalogRedirect(url: string): boolean {
  return /\/early-access|\/$/.test(new URL(url).pathname);
}

async function gotoCatalogPage(page: Page, path: "/marketplace" | "/classes" | "/studios") {
  await page.goto(path, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await expect(page.locator("html")).toBeVisible();
  const current = page.url();
  if (!new URL(current).pathname.startsWith(path)) {
    expect(isPublicCatalogRedirect(current)).toBe(true);
    return false;
  }
  return true;
}

test.describe("Flow 1 — Public form actions", () => {
  test("legacy public catalog routes redirect to current studio-focused entry pages", async ({ page }) => {
    const onMarketplace = await gotoCatalogPage(page, "/marketplace");
    expect(onMarketplace).toBe(false);

    const onClasses = await gotoCatalogPage(page, "/classes");
    expect(onClasses).toBe(false);

    const onStudios = await gotoCatalogPage(page, "/studios");
    expect(onStudios).toBe(false);
  });
});
