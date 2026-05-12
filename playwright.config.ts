import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright e2e covering Phases 5 (form validation) + 7 (form feedback quality)
 * of system-testing.md — the surfaces our curl-based suites can't reach.
 *
 * Run: `npm run test:e2e`
 * Server must be running separately on http://localhost:3000.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    actionTimeout: 5_000,
    navigationTimeout: 10_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
