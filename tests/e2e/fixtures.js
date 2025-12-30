/**
 * Custom Playwright fixtures for Chrome extension testing with coverage.
 * Uses persistent context to allow extensions to work.
 * Uses monocart-coverage-reports for V8 coverage collection.
 */

import fs from "node:fs";
import path from "node:path";
import { test as base, chromium } from "@playwright/test";

const EXTENSION_PATH = path.resolve("./dist");
const COVERAGE_DATA_DIR = path.resolve("./.coverage-data");

/**
 * Get the extension ID from service worker
 * @param {import('@playwright/test').BrowserContext} context
 * @returns {Promise<string>}
 */
async function getExtensionId(context) {
  let serviceWorker = context.serviceWorkers()[0];
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent("serviceworker");
  }
  return serviceWorker.url().split("/")[2];
}

/**
 * Extended test fixture that uses persistent context for extension support
 * and collects V8 coverage when COVERAGE env is set
 */
export const test = base.extend({
  // Override the context fixture to use persistent context
  // biome-ignore lint/correctness/noEmptyPattern: Playwright fixture pattern requires empty destructuring
  context: async ({}, use, testInfo) => {
    // Create a temporary user data directory with unique ID per test
    const uniqueId = `${testInfo.workerIndex}-${testInfo.testId}-${Date.now()}`;
    const userDataDir = path.join(
      process.cwd(),
      ".playwright-user-data",
      `test-${uniqueId}`
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
    } catch (_e) {
      // Ignore cleanup errors
    }
  },

  // Provide extension ID fixture
  extensionId: async ({ context }, use) => {
    const extensionId = await getExtensionId(context);
    await use(extensionId);
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
          entry.url.includes("main.js")
      );

      if (extensionCoverage.length > 0) {
        // Save coverage data to disk
        if (!fs.existsSync(COVERAGE_DATA_DIR)) {
          fs.mkdirSync(COVERAGE_DATA_DIR, { recursive: true });
        }

        const filename = `coverage-${testInfo.testId}-${Date.now()}.json`;
        fs.writeFileSync(
          path.join(COVERAGE_DATA_DIR, filename),
          JSON.stringify(extensionCoverage)
        );
      }
    }
  },
});

// Export expect
export { expect } from "@playwright/test";
