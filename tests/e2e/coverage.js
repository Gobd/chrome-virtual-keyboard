/**
 * Coverage collection fixture for Playwright tests.
 * Collects Istanbul coverage data from window.__coverage__ after each test.
 */

import fs from "fs";
import path from "path";
import { test as base } from "@playwright/test";

const COVERAGE_DIR = path.join(process.cwd(), ".coverage-data");

/**
 * Extended test fixture that auto-collects Istanbul coverage data
 */
export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    await use(page);

    // Collect Istanbul coverage after test (only when COVERAGE env is set)
    if (process.env.COVERAGE) {
      try {
        // Get coverage from the page's window.__coverage__ (set by Istanbul instrumentation)
        const coverage = await page.evaluate(() => {
          return window.__coverage__ || null;
        });

        if (coverage) {
          // Ensure coverage directory exists
          if (!fs.existsSync(COVERAGE_DIR)) {
            fs.mkdirSync(COVERAGE_DIR, { recursive: true });
          }

          // Save coverage for this test
          const safeTitle = testInfo.title
            .replace(/[^a-z0-9]/gi, "_")
            .slice(0, 50);
          const filename = `coverage-${safeTitle}-${Date.now()}.json`;
          const filepath = path.join(COVERAGE_DIR, filename);
          fs.writeFileSync(filepath, JSON.stringify(coverage, null, 2));
        }
      } catch (e) {
        // Silently ignore - coverage may not be available
      }
    }
  },
});

export { expect } from "@playwright/test";
