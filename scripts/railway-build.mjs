import { spawn } from "node:child_process";

const runId =
  process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ??
  process.env.npm_lifecycle_event ??
  "local-build";

function debugLog(hypothesisId, location, message, data) {
  return fetch("http://127.0.0.1:7372/ingest/a00a34c7-2453-4ee2-aeaf-27d491e4b66c", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "8e78c0",
    },
    body: JSON.stringify({
      sessionId: "8e78c0",
      runId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}

// #region agent log
void debugLog("H_BUILD_ENTRY", "scripts/railway-build.mjs:26", "build wrapper start", {
  hasGoogleClientId: Boolean(process.env.GOOGLE_CLIENT_ID?.trim()),
  hasGoogleClientIdSecret: Boolean(process.env.GOOGLE_CLIENT_ID_SECRET?.trim()),
  hasAuthGoogleId: Boolean(process.env.AUTH_GOOGLE_ID?.trim()),
  hasAuthGoogleSecret: Boolean(process.env.AUTH_GOOGLE_SECRET?.trim()),
  hasDatabaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
  hasSentryAuthToken: Boolean(process.env.SENTRY_AUTH_TOKEN?.trim()),
  nodeEnv: process.env.NODE_ENV ?? null,
  railwayEnvironment: process.env.RAILWAY_ENVIRONMENT_NAME ?? null,
});
// #endregion

const child = spawn(process.execPath, ["./node_modules/next/dist/bin/next", "build", "--turbopack"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

child.on("error", (error) => {
  // #region agent log
  void debugLog("H_BUILD_EXIT", "scripts/railway-build.mjs:43", "build wrapper child error", {
    name: error.name,
    message: error.message,
  });
  // #endregion
  process.exit(1);
});

child.on("exit", (code, signal) => {
  // #region agent log
  void debugLog("H_BUILD_EXIT", "scripts/railway-build.mjs:53", "build wrapper child exit", {
    code,
    signal,
  });
  // #endregion
  process.exit(code ?? 1);
});
