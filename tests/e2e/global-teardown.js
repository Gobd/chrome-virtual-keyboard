/**
 * Global teardown - generates coverage report after all tests complete
 *
 * Environment variables:
 * - COVERAGE: Enable coverage collection
 * - COVERAGE_SKIP_REPORT: Skip report generation (for merging with unit tests)
 * - MIN_COVERAGE: Minimum coverage threshold (percentage)
 */

import fs from "node:fs";
import path from "node:path";
import MCR from "monocart-coverage-reports";

const COVERAGE_DATA_DIR = path.resolve("./.coverage-data");
const COVERAGE_OUTPUT_DIR = path.resolve("./coverage-e2e");
const COVERAGE_SUMMARY_FILE = path.resolve(
  "./coverage-e2e/coverage-summary.json"
);

export default async function globalTeardown() {
  if (!process.env.COVERAGE) {
    return;
  }

  // Check if coverage data exists
  if (!fs.existsSync(COVERAGE_DATA_DIR)) {
    console.log("No coverage data found");
    return;
  }

  const files = fs
    .readdirSync(COVERAGE_DATA_DIR)
    .filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.log("No coverage data files found");
    return;
  }

  // If we're doing merged coverage, keep the data for the merge script
  if (process.env.COVERAGE_SKIP_REPORT) {
    console.log(
      `\nE2E coverage data saved (${files.length} files) - will merge later`
    );
    return;
  }

  console.log(
    `\nGenerating E2E coverage report from ${files.length} file(s)...`
  );

  // Create MCR instance with JSON report for CI
  const mcr = new MCR({
    name: "Chrome Virtual Keyboard E2E Coverage",
    outputDir: COVERAGE_OUTPUT_DIR,
    reports: ["v8", "html", "console-summary", "json-summary"],
  });

  // Add all coverage data
  for (const file of files) {
    const data = JSON.parse(
      fs.readFileSync(path.join(COVERAGE_DATA_DIR, file), "utf8")
    );
    await mcr.add(data);
  }

  // Generate report
  const result = await mcr.generate();

  // Extract and save coverage summary for CI
  const summary = {
    lines: result.summary?.lines?.pct ?? 0,
    branches: result.summary?.branches?.pct ?? 0,
    functions: result.summary?.functions?.pct ?? 0,
    statements: result.summary?.statements?.pct ?? 0,
    bytes: result.summary?.bytes?.pct ?? 0,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(COVERAGE_SUMMARY_FILE, JSON.stringify(summary, null, 2));

  // Cleanup coverage data
  fs.rmSync(COVERAGE_DATA_DIR, { recursive: true, force: true });

  console.log(`E2E Coverage report: ${COVERAGE_OUTPUT_DIR}/index.html`);
  console.log(`E2E Coverage summary: ${JSON.stringify(summary)}`);

  // Check minimum coverage threshold (if set via env)
  const minCoverage = parseFloat(process.env.MIN_COVERAGE || "0");
  if (minCoverage > 0 && summary.bytes < minCoverage) {
    console.error(
      `\nE2E Coverage (${summary.bytes.toFixed(1)}%) is below minimum threshold (${minCoverage}%)!`
    );
    process.exitCode = 1;
  }
}
