import { test as base, expect } from "@playwright/test";
import { test } from "../helpers/fixtures";
import { getTestCredentials } from "../helpers/env";
import { loginWithCredentials, registerAccount, signOutViaHeader } from "../helpers/auth";
import { loginIds } from "../helpers/selectors";

test.describe("Flow 2 — Login & session", () => {
  test("login, persistence across refresh + protected routes, logout blocks /cart", async ({ page }) => {
    const seeded = getTestCredentials();
    const password = seeded?.password ?? "E2E-test-pass-99!";
    const email = seeded?.email ?? `e2e-user-${Date.now()}@example.com`;

    if (!seeded) {
      await test.step("Register vendor (no TEST_EMAIL)", async () => {
        await registerAccount(page, email, password, "vendor");
      });
    }

    await test.step("Login", async () => {
      await loginWithCredentials(page, email, password, "/dashboard");
      await expect(page.getByRole("heading", { name: /Studio dashboard|Operations|Your account/i })).toBeVisible({
        timeout: 15_000,
      });
    });

    await test.step("Session survives refresh", async () => {
      await page.reload();
      await expect(page).not.toHaveURL(/\/login/);
    });

    await test.step("Protected route stays authenticated", async () => {
      await page.goto("/my-bookings");
      await expect(page).toHaveURL(/\/my-bookings/);
      await expect(page.getByRole("heading", { name: /^My bookings$/i })).toBeVisible();
    });

    await test.step("Logout", async () => {
      await signOutViaHeader(page);
    });

    await test.step("/cart requires login after logout", async () => {
      await page.goto("/cart");
      await expect(page).toHaveURL(/\/login/);
    });
  });
});

/** No console guard: failed login can surface client/network noise we don't want to hard-fail globally. */
base.describe("Flow 2 — Login (negative)", () => {
  base("invalid credentials show error (no redirect)", async ({ page }) => {
    await page.goto("/login");
    await page.locator(loginIds.email).fill("not-a-real-user@example.com");
    await page.locator(loginIds.password).fill("wrong-password-xyz");
    await page.getByRole("button", { name: /^Sign in$/i }).click();
    await expect(page.getByText(/Invalid email or password/i)).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Flow 2 — Login (mobile viewport)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("sign-in form usable on mobile", async ({ page }) => {
    const seeded = getTestCredentials();
    test.skip(!seeded, "Set TEST_EMAIL and TEST_PASSWORD for mobile auth smoke");
    await page.goto("/login");
    await page.locator(loginIds.email).fill(seeded!.email);
    await page.locator(loginIds.password).fill(seeded!.password);
    await page.getByRole("button", { name: /^Sign in$/i }).click();
    await page.waitForURL(/\/.*/, { timeout: 30_000 });
    await expect(page).not.toHaveURL(/\/login/);
  });
});
