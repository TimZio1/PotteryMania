/**
 * Central env reads for E2E. Prefer BASE_URL (PLAYWRIGHT_BASE_URL still supported in playwright.config).
 */
export function getBaseUrl(): string {
  return process.env.BASE_URL || process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
}

/** Login + vendor flows */
export function getTestCredentials():
  | { email: string; password: string }
  | null {
  const email = process.env.TEST_EMAIL?.trim();
  const password = process.env.TEST_PASSWORD?.trim();
  if (!email || !password) return null;
  return { email, password };
}

export function getVendorCredentials():
  | { email: string; password: string }
  | null {
  const vEmail = process.env.TEST_VENDOR_EMAIL?.trim();
  const vPass = process.env.TEST_VENDOR_PASSWORD?.trim();
  if (vEmail && vPass) return { email: vEmail, password: vPass };
  return getTestCredentials();
}

export function getStudioId(): string | null {
  const id = process.env.TEST_STUDIO_ID?.trim();
  return id || null;
}

export function getExperienceId(): string | null {
  const id = process.env.TEST_EXPERIENCE_ID?.trim();
  return id || null;
}

export function getProductId(): string | null {
  const id = process.env.TEST_PRODUCT_ID?.trim();
  return id || null;
}

export function getAdminCredentials():
  | { email: string; password: string }
  | null {
  const email = process.env.TEST_ADMIN_EMAIL?.trim();
  const password = process.env.TEST_ADMIN_PASSWORD?.trim();
  if (!email || !password) return null;
  return { email, password };
}

export const STRIPE_TEST_CARD =
  process.env.STRIPE_TEST_CARD?.trim() || "4242424242424242";
