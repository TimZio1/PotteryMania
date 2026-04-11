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
export async function registerAccount(page: Page, email: string, password: string) {
  await page.goto("/register");
  await page.locator(registerIds.email).fill(email);
  await page.locator(registerIds.password).fill(password);
  await page.getByRole("button", { name: /Create account/i }).click();
  await expect(page.getByText(/Account created/i)).toBeVisible({ timeout: 15_000 });
}

export async function signOutViaHeader(page: Page) {
  // Helper: waits for navigation away from a given URL href.
  // waitForURL(/\//) resolves immediately for any URL (all contain "/"), so we must
  // capture the start URL and wait for it to change.
  const makeNavAway = (fromHref: string) =>
    page.waitForURL((url) => url.href !== fromHref, { timeout: 15_000 });

  // ── Attempt 1: Sign out button already in the DOM on the current page ──────
  const startUrl1 = page.url();
  const allSignOut = page.getByRole("button", { name: /^Sign out$/i });
  try {
    await allSignOut.first().waitFor({ state: "visible", timeout: 10_000 });
    const btn = allSignOut.first();
    await btn.scrollIntoViewIfNeeded().catch(() => null);
    await Promise.all([makeNavAway(startUrl1), btn.click()]);
    return;
  } catch {
    /* session not yet hydrated or button not in this layout; try fallbacks */
  }

  // ── Attempt 2: "Account" link → sign out on that page ────────────────────
  const accountLink = page.getByRole("link", { name: /^Account$/i });
  if (await accountLink.isVisible().catch(() => false)) {
    await accountLink.click();
    const accountOut = page.getByRole("button", { name: /^Sign out$/i });
    await expect(accountOut).toBeVisible({ timeout: 10_000 });
    const startUrl2 = page.url();
    await Promise.all([makeNavAway(startUrl2), accountOut.click()]);
    return;
  }

  // ── Attempt 3: Open mobile menu, then sign out ────────────────────────────
  const menuButton = page.getByRole("button", { name: /Open menu/i });
  if (await menuButton.isVisible().catch(() => false)) {
    await menuButton.click();
    const mobileOut = page.locator("#mobile-nav").getByRole("button", { name: /^Sign out$/i });
    await expect(mobileOut).toBeVisible({ timeout: 10_000 });
    const startUrl3 = page.url();
    await Promise.all([makeNavAway(startUrl3), mobileOut.click()]);
    return;
  }

  // ── Last resort: navigate to /pricing which always renders SiteHeader with a
  //    desktop Sign out button (hidden md:flex, visible at 1280px default viewport).
  await page.goto("/pricing", { waitUntil: "domcontentloaded", timeout: 30_000 });
  const pricingSignOut = page.getByRole("button", { name: /^Sign out$/i });
  try {
    await pricingSignOut.first().waitFor({ state: "visible", timeout: 15_000 });
    await pricingSignOut.first().scrollIntoViewIfNeeded().catch(() => null);
    // page.url() is now https://…/pricing; wait for navigation away from it.
    const pricingHref = page.url();
    await Promise.all([makeNavAway(pricingHref), pricingSignOut.first().click()]);
    return;
  } catch {
    /* still not found */
  }

  throw new Error("Could not find a sign-out control in the current header or menu");
}
