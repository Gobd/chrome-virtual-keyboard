import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  globalTeardown: "./tests/e2e/global-teardown.js",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined, // undefined = half of CPU cores
  reporter: "html",
  timeout: 30000,

  use: {
    trace: "on-first-retry",
    video: "on-first-retry",
  },

  // Run test build (open shadow DOM) and start server before tests
  webServer: {
    command:
      "pnpm run build:test && pnpm exec http-server tests/fixtures -p 3333 -c-1",
    url: "http://localhost:3333",
    reuseExistingServer: false,
    timeout: 60000,
    stdout: "inherit",
    stderr: "inherit",
  },
});
