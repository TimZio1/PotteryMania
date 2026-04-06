import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    /** Playwright E2E specs live under tests/e2e — run via `npm run test:e2e`, not Vitest. */
    include: ["lib/**/*.test.ts"],
    exclude: ["node_modules", "tests/e2e/**", "**/*.spec.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
