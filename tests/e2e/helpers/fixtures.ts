import { test as base, expect } from "@playwright/test";
import { attachConsoleGuard } from "./console";

/**
 * Wraps page with console/pageerror guard; failed runs get diagnostics attached.
 * Passed tests fail if `console.error` or `pageerror` occurred (see BENIGN list in console.ts).
 */
export const test = base.extend({
  page: async ({ page }, providePage, testInfo) => {
    const guard = attachConsoleGuard(page);
    await providePage(page);
    guard.stop();
    await guard.finalize(testInfo);
  },
});

export { expect };
