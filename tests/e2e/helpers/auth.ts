import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { loginIds, registerIds } from "./selectors";

export async function loginWithCredentials(page: Page, email: string, password: string, callbackUrl = "/dashboard") {
  await page.goto(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await page.locator(loginIds.email).fill(email);
  await page.locator(loginIds.password).fill(password);
  await page.getByRole("button", { name: /^Sign in$/i }).click();
  await page.waitForURL(`**${callbackUrl.split("?")[0]}**`, { timeout: 30_000 });
}

/** Register a new account; does not sign in. */
export async function registerAccount(page: Page, email: string, password: string, role: "customer" | "vendor") {
  await page.goto("/register");
  await page.getByLabel(/Account type/i).selectOption(role);
  await page.locator(registerIds.email).fill(email);
  await page.locator(registerIds.password).fill(password);
  await page.getByRole("button", { name: /Create account/i }).click();
  await expect(page.getByText(/Account created/i)).toBeVisible({ timeout: 15_000 });
}

export async function signOutViaHeader(page: Page) {
  const out = page.getByRole("button", { name: /Sign out/i });
  await expect(out).toBeVisible({ timeout: 10_000 });
  await out.click();
  await page.waitForURL(/\//, { timeout: 15_000 });
}
