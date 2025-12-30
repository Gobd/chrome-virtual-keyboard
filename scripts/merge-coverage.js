#!/usr/bin/env node
/**
 * Generate combined coverage report from E2E and unit tests
 *
 * - E2E tests (Playwright): Output raw V8 coverage to .coverage-data/
 * - Unit tests (Vitest): Output V8 JSON format to coverage-unit/coverage-final.json
 *
 * Monocart-coverage-reports merges both V8 formats into a single report.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import MCR from "monocart-coverage-reports";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");

/**
 * Filter V8 coverage data to only include JS source files
 */
function filterV8Coverage(data) {
  if (!Array.isArray(data)) return data;

  return data.filter((entry) => {
    const url = entry.url || "";
    // Skip if no URL
    if (!url) return false;
    // Only include JS files
    if (!url.endsWith(".js")) return false;
    // Skip node_modules and test files
    if (url.includes("node_modules")) return false;
    if (url.includes("tests/")) return false;
    // Must be from our extension (chrome-extension:// URLs have main.js)
    return url.includes("main.js") || url.includes("/src/");
  });
}

async function generateCoverage() {
  console.log("Generating combined coverage report...\n");

  // Ensure output directory exists
  const outputDir = path.join(rootDir, "coverage");
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });

  const mcr = new MCR({
    name: "Coverage Report (Combined)",
    outputDir: outputDir,
    reports: ["v8", "html", "console-summary"],
    sourceFilter: (sourcePath) => {
      // Only include src files, not test files or node_modules
      if (sourcePath.includes("node_modules")) return false;
      if (sourcePath.includes("tests/")) return false;
      return sourcePath.includes("/src/") || sourcePath.includes("main.js");
    },
  });

  let hasE2ECoverage = false;
  let hasUnitCoverage = false;

  // Add E2E test coverage (.coverage-data directory with V8 JSON files)
  const e2eCoverageDir = path.join(rootDir, ".coverage-data");
  if (fs.existsSync(e2eCoverageDir)) {
    const files = fs
      .readdirSync(e2eCoverageDir)
      .filter((f) => f.endsWith(".json"));
    let addedCount = 0;
    for (const file of files) {
      const filePath = path.join(e2eCoverageDir, file);
      try {
        const rawData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        // Filter to only JS source files before adding
        const filteredData = filterV8Coverage(rawData);
        if (filteredData.length > 0) {
          await mcr.add(filteredData);
          addedCount++;
          hasE2ECoverage = true;
        }
      } catch (_err) {
        console.warn(`Warning: Could not parse E2E coverage ${file}`);
      }
    }
    if (hasE2ECoverage) {
      console.log(`Added ${addedCount} E2E coverage files`);
    }
  }

  // Add unit test coverage (V8 JSON format from Vitest)
  const unitCoverageDir = path.join(rootDir, "coverage-unit");
  const unitJsonFile = path.join(unitCoverageDir, "coverage-final.json");
  if (fs.existsSync(unitJsonFile)) {
    try {
      const rawData = JSON.parse(fs.readFileSync(unitJsonFile, "utf-8"));
      // Vitest V8 JSON format is an object keyed by file path
      // Convert to array format for MCR
      const coverageArray = Object.values(rawData);
      if (coverageArray.length > 0) {
        await mcr.add(coverageArray);
        hasUnitCoverage = true;
        console.log(`Added unit test coverage (${coverageArray.length} files)`);
      }
    } catch (err) {
      console.warn(`Warning: Could not parse unit coverage: ${err.message}`);
    }
  }

  if (!hasE2ECoverage && !hasUnitCoverage) {
    console.log("No coverage data found. Run tests first:");
    console.log("  pnpm run coverage:all");
    process.exit(1);
  }

  // Generate the report
  console.log("\nGenerating coverage report...");
  const results = await mcr.generate();

  // Create summary JSON for CI
  const summary = {
    bytes: results.summary?.bytes?.pct ?? 0,
    lines: results.summary?.lines?.pct ?? 0,
    functions: results.summary?.functions?.pct ?? 0,
    statements: results.summary?.statements?.pct ?? 0,
    branches: results.summary?.branches?.pct ?? 0,
    hasE2E: hasE2ECoverage,
    hasUnit: hasUnitCoverage,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(outputDir, "coverage-summary.json"),
    JSON.stringify(summary, null, 2)
  );

  console.log(`\n${"=".repeat(50)}`);
  console.log("Combined Coverage Summary:");
  console.log("=".repeat(50));
  console.log(
    `  Sources:    ${[hasE2ECoverage && "E2E", hasUnitCoverage && "Unit"].filter(Boolean).join(" + ")}`
  );
  console.log(`  Bytes:      ${summary.bytes.toFixed(2)}%`);
  console.log(`  Lines:      ${summary.lines.toFixed(2)}%`);
  console.log(`  Functions:  ${summary.functions.toFixed(2)}%`);
  console.log(`  Branches:   ${summary.branches.toFixed(2)}%`);
  console.log("=".repeat(50));
  console.log(`Full report: ${outputDir}/index.html`);

  // Clean up .coverage-data after generating report
  if (fs.existsSync(e2eCoverageDir)) {
    fs.rmSync(e2eCoverageDir, { recursive: true });
  }

  // Check minimum coverage threshold (if set via env)
  const minCoverage = parseFloat(process.env.MIN_COVERAGE || "0");
  if (minCoverage > 0 && summary.bytes < minCoverage) {
    console.error(
      `\nCoverage (${summary.bytes.toFixed(1)}%) is below minimum threshold (${minCoverage}%)!`
    );
    process.exitCode = 1;
  }
}

generateCoverage().catch((err) => {
  console.error("Error generating coverage:", err);
  process.exit(1);
});
