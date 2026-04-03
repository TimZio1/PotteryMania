import { test, expect } from "@playwright/test";

test("home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("PotteryMania")).toBeVisible();
});

test("early access page loads", async ({ page }) => {
  await page.goto("/early-access");
  await expect(page.getByRole("heading", { name: /register your studio/i })).toBeVisible();
});

test("marketplace page loads", async ({ page }) => {
  await page.goto("/marketplace");
  await expect(page.getByRole("heading", { name: /marketplace/i })).toBeVisible();
});
