/**
 * Custom Playwright fixtures for Chrome extension testing with coverage.
 * Uses persistent context to allow extensions to work.
 * Uses monocart-coverage-reports for V8 coverage collection.
 */

import { test as base, chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

const EXTENSION_PATH = path.resolve("./dist");
const COVERAGE_DATA_DIR = path.resolve("./.coverage-data");

/**
 * Extended test fixture that uses persistent context for extension support
 * and collects V8 coverage when COVERAGE env is set
 */
export const test = base.extend({
  // Override the context fixture to use persistent context
  context: async ({}, use) => {
    // Create a temporary user data directory
    const userDataDir = path.join(
      process.cwd(),
      ".playwright-user-data",
      `test-${Date.now()}`,
    );

    // Launch with persistent context (required for extensions)
    // channel: 'chromium' allows headless mode with extensions
    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: "chromium",
      headless: true,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        "--no-sandbox",
      ],
    });

    await use(context);

    // Cleanup
    await context.close();

    // Remove temp user data dir
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  },

  // Override page to use the persistent context and collect coverage
  page: async ({ context }, use, testInfo) => {
    const page = await context.newPage();

    // Start V8 coverage if COVERAGE env is set
    if (process.env.COVERAGE) {
      await page.coverage.startJSCoverage({
        resetOnNavigation: false,
      });
    }

    await use(page);

    // Collect coverage after test
    if (process.env.COVERAGE) {
      const coverage = await page.coverage.stopJSCoverage();

      // Filter to only extension code
      const extensionCoverage = coverage.filter(
        (entry) =>
          entry.url.includes("chrome-extension://") &&
          entry.url.includes("main.js"),
      );

      if (extensionCoverage.length > 0) {
        // Save coverage data to disk
        if (!fs.existsSync(COVERAGE_DATA_DIR)) {
          fs.mkdirSync(COVERAGE_DATA_DIR, { recursive: true });
        }

        const filename = `coverage-${testInfo.testId}-${Date.now()}.json`;
        fs.writeFileSync(
          path.join(COVERAGE_DATA_DIR, filename),
          JSON.stringify(extensionCoverage),
        );
      }
    }
  },
});

// Export expect
export { expect } from "@playwright/test";
