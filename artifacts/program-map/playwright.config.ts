import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for program-map e2e tests.
 * The dev server is already running via the managed workflow; we point at it.
 * BASE_URL can be overridden in CI; defaults to the local proxy port.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  retries: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:80",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
