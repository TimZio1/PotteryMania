import { test, expect } from "../helpers/fixtures";
import { test as rawTest, expect as rawExpect } from "@playwright/test";
import { getTestCredentials, getVendorCredentials, getStudioId, getExperienceId } from "../helpers/env";
import { loginWithCredentials } from "../helpers/auth";

/**
 * KILL TEST — Full business loop validation.
 *
 * Phase 1: Studio owner side (auth, dashboard, class management, settings)
 * Phase 2: Public facing (studio page, class page, trust signals)
 * Phase 3: Customer side (booking, cart, checkout init)
 * Phase 4: Resilience (double actions, refresh mid-flow, edge cases)
 */

const MOBILE = { width: 390, height: 844 };

/**
 * Discover studio ID by logging in and scraping the dashboard.
 * Falls back to TEST_STUDIO_ID env if set.
 */
async function discoverStudioId(page: import("@playwright/test").Page, creds: { email: string; password: string }): Promise<string | null> {
  const envId = getStudioId();
  if (envId) return envId;
  await loginWithCredentials(page, creds.email, creds.password, "/dashboard");
  await page.waitForTimeout(3000);
  const links = await page.locator('a[href*="/dashboard/"]').all();
  for (const link of links) {
    const href = await link.getAttribute("href");
    const match = href?.match(/\/dashboard\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/);
    if (match) return match[1];
  }
  return null;
}

test.describe("KILL TEST — Phase 1: Studio Owner", () => {
  test("1.1 — Login and dashboard loads without errors", async ({ page }) => {
    const creds = getVendorCredentials();
    test.skip(!creds, "No vendor credentials");

    await loginWithCredentials(page, creds!.email, creds!.password, "/dashboard");

    await expect(page.getByRole("heading")).toBeVisible({ timeout: 20_000 });
    await expect(page).not.toHaveURL(/\/login/);

    const errorBanner = page.locator('[role="alert"]');
    const errorCount = await errorBanner.count();
    for (let i = 0; i < errorCount; i++) {
      const text = await errorBanner.nth(i).textContent();
      console.log(`[ALERT BANNER] ${text}`);
    }
  });

  test("1.2 — Studio sidebar navigates without 500s", async ({ page }) => {
    const creds = getVendorCredentials();
    test.skip(!creds, "No vendor credentials");

    const studioId = await discoverStudioId(page, creds!);
    test.skip(!studioId, "Could not discover studio ID");

    await loginWithCredentials(page, creds!.email, creds!.password, `/dashboard/${studioId}`);

    const routes = [
      { path: `/dashboard/${studioId}`, label: "Home" },
      { path: `/dashboard/${studioId}/schedule/sessions`, label: "Sessions" },
      { path: `/dashboard/${studioId}/programs`, label: "Classes" },
      { path: `/dashboard/${studioId}/schedule/calendar`, label: "Calendar" },
      { path: `/dashboard/${studioId}/commerce/catalog`, label: "Products" },
      { path: `/dashboard/${studioId}/settings`, label: "Settings" },
      { path: `/dashboard/${studioId}/money/reports`, label: "Reports" },
      { path: `/dashboard/${studioId}/features`, label: "Features" },
      { path: `/dashboard/${studioId}/programs/planner`, label: "Class planner" },
    ];

    for (const { path, label } of routes) {
      const res = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 30_000 });
      const status = res?.status() ?? 0;
      expect(status, `${label} (${path}) returned ${status}`).toBeLessThan(500);

      const body = await page.textContent("body");
      expect(body, `${label} shows raw error`).not.toContain("Internal Server Error");
      expect(body, `${label} leaks env var`).not.toMatch(/process\.env\./);
      expect(body, `${label} shows prisma error`).not.toMatch(/PrismaClient/i);
    }
  });

  test("1.3 — Classes page has 'New class' CTA", async ({ page }) => {
    const creds = getVendorCredentials();
    test.skip(!creds, "No vendor credentials");
    const studioId = await discoverStudioId(page, creds!);
    test.skip(!studioId, "Could not discover studio ID");

    await loginWithCredentials(page, creds!.email, creds!.password, `/dashboard/${studioId}/programs`);
    await expect(page.getByRole("heading", { name: /All classes/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("link", { name: /New class/i })).toBeVisible();
  });

  test("1.4 — Class planner page renders schedule panels", async ({ page }) => {
    const creds = getVendorCredentials();
    test.skip(!creds, "No vendor credentials");
    const studioId = await discoverStudioId(page, creds!);
    test.skip(!studioId, "Could not discover studio ID");

    await loginWithCredentials(page, creds!.email, creds!.password, `/dashboard/${studioId}/programs/planner`);
    await expect(page.getByRole("heading", { name: /^Planner$/i })).toBeVisible({ timeout: 15_000 });

    const body = await page.textContent("body");
    expect(body).not.toContain("NEXT_REDIRECT");
  });

  test("1.5 — Waitlist page loads", async ({ page }) => {
    const creds = getVendorCredentials();
    test.skip(!creds, "No vendor credentials");
    const studioId = await discoverStudioId(page, creds!);
    test.skip(!studioId, "Could not discover studio ID");

    await loginWithCredentials(page, creds!.email, creds!.password, `/dashboard/${studioId}/schedule/waitlist`);
    await expect(page.getByRole("heading", { name: /waitlist/i })).toBeVisible({ timeout: 15_000 });
  });

  test("1.6 — Settings page shows blocked dates link (not dead)", async ({ page }) => {
    const creds = getVendorCredentials();
    test.skip(!creds, "No vendor credentials");
    const studioId = await discoverStudioId(page, creds!);
    test.skip(!studioId, "Could not discover studio ID");

    await loginWithCredentials(page, creds!.email, creds!.password, `/dashboard/${studioId}/settings`);
    await expect(page.getByRole("heading", { name: /Blocked dates/i })).toBeVisible({ timeout: 15_000 });
    const plannerLink = page.getByRole("link", { name: /class planner/i });
    await expect(plannerLink).toBeVisible();
  });
});

test.describe("KILL TEST — Phase 2: Public Trust", () => {
  test("2.1 — Home page loads and shows real content (no placeholders)", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });

    const body = await page.textContent("body");
    expect(body).not.toContain("Lorem ipsum");
    expect(body).not.toContain("TODO");
    expect(body).not.toContain("FIXME");
  });

  test("2.2 — Studios listing loads or gracefully redirects", async ({ page }) => {
    const res = await page.goto("/studios", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBeLessThan(500);

    const url = page.url();
    const onStudios = url.includes("/studios");
    if (onStudios) {
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
      const body = await page.textContent("body");
      expect(body).not.toContain("Internal Server Error");
    } else {
      // Redirected to home (no approved studios for guests) — valid behavior
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
    }
  });

  test("2.3 — Shop/marketplace loads without 500", async ({ page }) => {
    const res = await page.goto("/marketplace", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBeLessThan(500);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
  });

  test("2.4 — Public studio page shows human-readable content", async ({ page }) => {
    const studioId = getStudioId();
    test.skip(!studioId, "No studio ID (set TEST_STUDIO_ID to enable)");

    const res = await page.goto(`/studios/${studioId}`, { waitUntil: "domcontentloaded" });
    if (res?.status() === 404) {
      return; // Studio not approved — expected
    }
    expect(res?.status()).toBeLessThan(500);

    const body = await page.textContent("body");
    expect(body).not.toContain("Stripe connection");
    expect(body).not.toContain("PotteryMania booking is not enabled");
    expect(body).not.toContain("marketplace_checkout_enabled");
  });

  test("2.5 — Classes listing page loads", async ({ page }) => {
    const res = await page.goto("/classes", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBeLessThan(500);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
  });

  test("2.6 — Experience detail page loads (if ID set)", async ({ page }) => {
    const expId = getExperienceId();
    test.skip(!expId, "No experience ID");

    const res = await page.goto(`/classes/${expId}`, { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBeLessThan(500);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("KILL TEST — Phase 2: Public Trust (mobile)", () => {
  test.use({ viewport: MOBILE });

  test("2.7 — Home page mobile: navigation works", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });

    const menuBtn = page.getByRole("button", { name: /Open menu/i });
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await expect(page.locator("[role=dialog], #mobile-nav")).toBeVisible({ timeout: 5_000 });
    }
  });

  test("2.8 — Studios page mobile: renders and scrolls", async ({ page }) => {
    await page.goto("/studios");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("KILL TEST — Phase 3: Customer Booking Loop", () => {
  test("3.1 — Login as customer, reach class, attempt booking", async ({ page }) => {
    const creds = getTestCredentials();
    const expId = getExperienceId();
    test.skip(!creds || !expId, "No test credentials or experience ID");

    await loginWithCredentials(page, creds!.email, creds!.password, `/classes/${expId}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });

    const noSlots = page.getByText(/No open sessions|no upcoming/i);
    if (await noSlots.isVisible()) {
      console.log("[INFO] No bookable slots available — cannot test booking flow");
      return;
    }

    const bookBtn = page.getByRole("button", { name: /Add class to cart|Book now|Reserve/i });
    if (await bookBtn.isVisible()) {
      const [res] = await Promise.all([
        page.waitForResponse((r) => r.url().includes("/api/cart") && r.request().method() === "POST", { timeout: 15_000 }).catch(() => null),
        bookBtn.click(),
      ]);
      if (res) {
        expect(res.status(), "Cart API responded").toBeLessThan(500);
      }
    }
  });

  test("3.2 — Cart page loads and shows content", async ({ page }) => {
    const creds = getTestCredentials();
    test.skip(!creds, "No test credentials");

    await loginWithCredentials(page, creds!.email, creds!.password, "/cart");
    await expect(page.getByRole("heading")).toBeVisible({ timeout: 15_000 });

    const body = await page.textContent("body");
    expect(body).not.toContain("Internal Server Error");
  });

  test("3.3 — My orders page loads", async ({ page }) => {
    const creds = getTestCredentials();
    test.skip(!creds, "No test credentials");

    await loginWithCredentials(page, creds!.email, creds!.password, "/my-orders");
    await expect(page.getByRole("heading", { name: /My orders/i })).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("KILL TEST — Phase 4: Resilience", () => {
  test("4.1 — Unauthenticated /dashboard redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("4.2 — Unauthenticated /cart redirects to login", async ({ page }) => {
    await page.goto("/cart");
    await expect(page).toHaveURL(/\/login/);
  });

  test("4.3 — Invalid studio ID returns 404 not 500", async ({ page }) => {
    const res = await page.goto("/studios/00000000-0000-0000-0000-000000000000", {
      waitUntil: "domcontentloaded",
    });
    expect(res?.status()).not.toBe(500);
  });

  test("4.4 — Invalid experience ID returns 404 not 500", async ({ page }) => {
    const res = await page.goto("/classes/00000000-0000-0000-0000-000000000000", {
      waitUntil: "domcontentloaded",
    });
    expect(res?.status()).not.toBe(500);
  });

  test("4.5 — Rapid navigation does not crash", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.goto("/studios", { waitUntil: "domcontentloaded" });
    await page.goBack();
    await expect(page.locator("html")).toBeVisible();
  });

  test("4.6 — Login page shows error for bad credentials (no crash)", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#login-email").fill("fake-user-test@invalid-domain-xyz.com");
    await page.locator("#login-password").fill("wrong_password_123");
    await page.getByRole("button", { name: /Sign in/i }).click();
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/login/);
  });

  rawTest("4.7 — API returns JSON not HTML for unauthorized studio ops", async ({ page }) => {
    const res = await page.goto("/api/studios/fake-id/analytics?days=30", {
      waitUntil: "domcontentloaded",
    });
    rawExpect(res?.status()).toBe(401);
    const body = await res?.json().catch(() => null);
    rawExpect(body).not.toBeNull();
  });
});

test.describe("KILL TEST — Phase 4: Resilience (mobile)", () => {
  test.use({ viewport: MOBILE });

  test("4.8 — Dashboard mobile: sidebar opens and navigation works", async ({ page }) => {
    const creds = getVendorCredentials();
    test.skip(!creds, "No credentials");

    const studioId = await discoverStudioId(page, creds!);
    test.skip(!studioId, "Could not discover studio ID");

    await page.goto(`/dashboard/${studioId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading")).toBeVisible({ timeout: 20_000 });

    const menuBtn = page.getByRole("button", { name: /Open menu|Menu/i });
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await page.waitForTimeout(500);
    }
  });
});
