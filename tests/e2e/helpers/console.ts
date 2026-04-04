import type { ConsoleMessage, Page, Response, TestInfo } from "@playwright/test";

/** Console text fragments treated as non-fatal noise. */
const BENIGN_SUBSTRINGS = [
  "Download the React DevTools",
  "React DevTools",
  "[Fast Refresh]",
];

export type ConsoleReport = {
  pageUrl: string;
  consoleErrors: { type: string; text: string }[];
  pageErrors: string[];
  apiFailures: { url: string; status: number; method: string }[];
};

function isBenignConsole(text: string): boolean {
  return BENIGN_SUBSTRINGS.some((s) => text.includes(s));
}

/**
 * Collects browser console errors, uncaught page errors, and 4xx/5xx API responses (for debugging).
 * Call stop() before navigation teardown if you replace page.
 */
export function attachConsoleGuard(page: Page) {
  const consoleEntries: { type: string; text: string }[] = [];
  const pageErrors: string[] = [];
  const apiFailures: { url: string; status: number; method: string }[] = [];

  const onConsole = (msg: ConsoleMessage) => {
    consoleEntries.push({ type: msg.type(), text: msg.text() });
  };
  const onPageError = (err: Error) => pageErrors.push(err.message);
  const onResponse = (res: Response) => {
    const url = res.url();
    if (!/\/api\//.test(url)) return;
    if (res.status() < 400) return;
    apiFailures.push({ url, status: res.status(), method: res.request().method() });
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("response", onResponse);

  function buildReport(): ConsoleReport {
    const consoleErrors = consoleEntries.filter(
      (m) => m.type === "error" && !isBenignConsole(m.text),
    );
    return {
      pageUrl: page.url(),
      consoleErrors,
      pageErrors: [...pageErrors],
      apiFailures: [...apiFailures],
    };
  }

  return {
    buildReport,
    stop() {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
      page.off("response", onResponse);
    },
    /** After test completes: attach JSON on any outcome; throw if passed/skipped but browser errors exist. */
    async finalize(testInfo: TestInfo) {
      const report = buildReport();
      const status = testInfo.status;
      if (status === "failed" || status === "timedOut" || status === "interrupted") {
        await testInfo.attach("failure-diagnostics.json", {
          body: JSON.stringify(report, null, 2),
          contentType: "application/json",
        });
        return;
      }
      if (status === "skipped") return;

      const unexpectedConsole = report.consoleErrors;
      const unexpectedPage = report.pageErrors;
      if (unexpectedConsole.length > 0 || unexpectedPage.length > 0) {
        await testInfo.attach("unexpected-console.json", {
          body: JSON.stringify(report, null, 2),
          contentType: "application/json",
        });
        throw new Error(
          `Unexpected browser errors on ${report.pageUrl}: console=${JSON.stringify(unexpectedConsole)} page=${JSON.stringify(unexpectedPage)}`,
        );
      }
    },
  };
}
