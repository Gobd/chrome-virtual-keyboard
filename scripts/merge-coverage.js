#!/usr/bin/env node
/**
 * Generate combined coverage report from E2E and unit tests
 *
 * - E2E tests (Playwright): Output raw V8 coverage to .coverage-data/
 * - Unit tests (Vitest + MCR): Output raw V8 coverage to coverage-unit/raw/
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

  // Check what coverage sources are available
  const e2eCoverageDir = path.join(rootDir, ".coverage-data");
  const unitRawDir = path.join(rootDir, "coverage-unit", "raw");

  const hasE2ECoverage =
    fs.existsSync(e2eCoverageDir) &&
    fs.readdirSync(e2eCoverageDir).some((f) => f.endsWith(".json"));
  const hasUnitCoverage =
    fs.existsSync(unitRawDir) &&
    fs.readdirSync(unitRawDir).some((f) => f.endsWith(".json"));

  // Configure MCR - use inputDir for unit coverage (MCR handles raw files automatically)
  const mcrConfig = {
    name: "Coverage Report (Combined)",
    outputDir: outputDir,
    reports: ["v8", "html", "console-summary"],
    sourceFilter: (sourcePath) => {
      // Only include src files, not test files or node_modules
      if (sourcePath.includes("node_modules")) return false;
      if (sourcePath.includes("tests/")) return false;
      // E2E paths have "/src/" or "main.js", unit paths start with "src/"
      return (
        sourcePath.includes("/src/") ||
        sourcePath.startsWith("src/") ||
        sourcePath.includes("main.js")
      );
    },
  };

  // Use inputDir for unit coverage if available (MCR reads raw files directly)
  if (hasUnitCoverage) {
    mcrConfig.inputDir = unitRawDir;
    console.log("Will load unit coverage from:", unitRawDir);
  }

  const mcr = new MCR(mcrConfig);

  // Add E2E test coverage (.coverage-data directory with V8 JSON files)
  if (hasE2ECoverage) {
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
        }
      } catch (_err) {
        console.warn(`Warning: Could not parse E2E coverage ${file}`);
      }
    }
    console.log(`Added ${addedCount} E2E coverage files`);
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
    bytes: results.summary?.bytes?.pct || 0,
    lines: results.summary?.lines?.pct || 0,
    functions: results.summary?.functions?.pct || 0,
    statements: results.summary?.statements?.pct || 0,
    branches: results.summary?.branches?.pct || 0,
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
  console.log(`  Bytes:      ${Number(summary.bytes).toFixed(2)}%`);
  console.log(`  Lines:      ${Number(summary.lines).toFixed(2)}%`);
  console.log(`  Functions:  ${Number(summary.functions).toFixed(2)}%`);
  console.log(`  Branches:   ${Number(summary.branches).toFixed(2)}%`);
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
