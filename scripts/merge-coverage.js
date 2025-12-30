#!/usr/bin/env node
/**
 * Generate coverage reports from E2E and unit tests
 *
 * - E2E tests (Playwright): Output raw V8 coverage to .coverage-data/
 * - Unit tests (Vitest + MCR): Output raw V8 coverage to coverage-unit/raw/
 *
 * Generates three reports:
 * - coverage-unit/: Unit-only report
 * - coverage-e2e/: E2E-only HTML report
 * - coverage/: Combined (E2E + Unit) HTML report
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

/**
 * Load coverage files from a directory
 */
function loadCoverageFiles(coverageDir) {
  const coverageData = [];
  if (!fs.existsSync(coverageDir)) return coverageData;

  const files = fs
    .readdirSync(coverageDir)
    .filter((f) => f.endsWith(".json") && f.startsWith("coverage-"));

  for (const file of files) {
    const filePath = path.join(coverageDir, file);
    try {
      const rawData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      // Handle vitest-monocart-coverage format {id, type, data}
      const entries = Array.isArray(rawData) ? rawData : rawData.data;
      if (!entries) continue;
      const filteredData = filterV8Coverage(entries);
      if (filteredData.length > 0) {
        coverageData.push(filteredData);
      }
    } catch (_err) {
      console.warn(`Warning: Could not parse coverage ${file}`);
    }
  }
  return coverageData;
}

/**
 * Create MCR source filter function
 */
function createSourceFilter() {
  return (sourcePath) => {
    if (sourcePath.includes("node_modules")) return false;
    if (sourcePath.includes("tests/")) return false;
    return (
      sourcePath.includes("/src/") ||
      sourcePath.startsWith("src/") ||
      sourcePath.includes("main.js")
    );
  };
}

/**
 * Write coverage summary JSON
 */
function writeSummary(outputDir, results, sources) {
  const summary = {
    bytes: results.summary?.bytes?.pct || 0,
    lines: results.summary?.lines?.pct || 0,
    functions: results.summary?.functions?.pct || 0,
    statements: results.summary?.statements?.pct || 0,
    branches: results.summary?.branches?.pct || 0,
    ...sources,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(outputDir, "coverage-summary.json"),
    JSON.stringify(summary, null, 2)
  );

  return summary;
}

/**
 * Print coverage summary to console
 */
function printSummary(name, summary, outputDir) {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`${name}:`);
  console.log("=".repeat(50));
  console.log(`  Bytes:      ${Number(summary.bytes).toFixed(2)}%`);
  console.log(`  Lines:      ${Number(summary.lines).toFixed(2)}%`);
  console.log(`  Functions:  ${Number(summary.functions).toFixed(2)}%`);
  console.log(`  Branches:   ${Number(summary.branches).toFixed(2)}%`);
  console.log(`  Report:     ${outputDir}/index.html`);
}

/**
 * Generate a coverage report from in-memory data (E2E style)
 */
async function generateReport(name, outputDir, coverageDataArrays, sources) {
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });

  const mcr = new MCR({
    name: name,
    outputDir: outputDir,
    reports: ["v8", "html", "console-summary"],
    sourceFilter: createSourceFilter(),
  });

  // Add all coverage data
  for (const data of coverageDataArrays) {
    await mcr.add(data);
  }

  console.log(`\nGenerating ${name}...`);
  const results = await mcr.generate();
  const summary = writeSummary(outputDir, results, sources);
  printSummary(name, summary, outputDir);

  return summary;
}

/**
 * Generate a coverage report using inputDir (for MCR raw format with source files)
 */
async function generateReportFromDir(name, outputDir, inputDir, sources) {
  // Clean outputDir but preserve inputDir if it's a subdirectory
  if (fs.existsSync(outputDir)) {
    const inputRelative = path.relative(outputDir, inputDir);
    const isSubdir =
      !inputRelative.startsWith("..") && !path.isAbsolute(inputRelative);

    if (isSubdir) {
      // inputDir is inside outputDir, only delete other files
      for (const entry of fs.readdirSync(outputDir)) {
        const entryPath = path.join(outputDir, entry);
        if (entryPath !== inputDir && !inputDir.startsWith(entryPath + "/")) {
          fs.rmSync(entryPath, { recursive: true });
        }
      }
    } else {
      fs.rmSync(outputDir, { recursive: true });
      fs.mkdirSync(outputDir, { recursive: true });
    }
  } else {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`\nGenerating ${name}...`);

  const mcr = new MCR({
    name: name,
    outputDir: outputDir,
    inputDir: inputDir,
    reports: ["v8", "html", "console-summary"],
    sourceFilter: createSourceFilter(),
  });

  const results = await mcr.generate();
  const summary = writeSummary(outputDir, results, sources);
  printSummary(name, summary, outputDir);

  return summary;
}

/**
 * Generate combined report from both inputDir and in-memory data
 */
async function generateCombinedReport(
  name,
  outputDir,
  unitRawDir,
  hasUnit,
  e2eCoverageData,
  sources
) {
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });

  const mcrConfig = {
    name: name,
    outputDir: outputDir,
    reports: ["v8", "html", "console-summary"],
    sourceFilter: createSourceFilter(),
  };

  // Use inputDir for unit coverage (includes source files)
  if (hasUnit) {
    mcrConfig.inputDir = unitRawDir;
  }

  const mcr = new MCR(mcrConfig);

  // Add E2E coverage data
  for (const data of e2eCoverageData) {
    await mcr.add(data);
  }

  console.log(`\nGenerating ${name}...`);
  const results = await mcr.generate();
  const summary = writeSummary(outputDir, results, sources);
  printSummary(name, summary, outputDir);

  return summary;
}

/**
 * Copy directory recursively
 */
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function generateCoverage() {
  console.log("Generating coverage reports...\n");

  const e2eCoverageDir = path.join(rootDir, ".coverage-data");
  const unitRawDir = path.join(rootDir, "coverage-unit", "raw");

  // Load E2E coverage data into memory (plain V8 format)
  const e2eCoverageData = loadCoverageFiles(e2eCoverageDir);

  // Check if unit coverage exists (MCR format with source files)
  const hasUnitCoverage =
    fs.existsSync(unitRawDir) &&
    fs.readdirSync(unitRawDir).some((f) => f.endsWith(".json"));
  const hasE2ECoverage = e2eCoverageData.length > 0;

  if (!hasE2ECoverage && !hasUnitCoverage) {
    console.log("No coverage data found. Run tests first:");
    console.log("  pnpm run coverage:all");
    process.exit(1);
  }

  console.log("Coverage sources found:");
  if (hasUnitCoverage) console.log("  - Unit tests (coverage-unit/raw/)");
  if (hasE2ECoverage)
    console.log(`  - E2E tests (${e2eCoverageData.length} files)`);

  let combinedSummary;

  // Copy unit raw data to temp for combined report (since MCR consumes inputDir)
  const unitRawCopy = path.join(rootDir, ".coverage-unit-raw-copy");
  if (hasUnitCoverage) {
    if (fs.existsSync(unitRawCopy)) {
      fs.rmSync(unitRawCopy, { recursive: true });
    }
    copyDir(unitRawDir, unitRawCopy);
  }

  // Generate unit-only report (uses original raw dir)
  if (hasUnitCoverage) {
    await generateReportFromDir(
      "Unit Coverage Report",
      path.join(rootDir, "coverage-unit"),
      unitRawDir,
      { hasE2E: false, hasUnit: true }
    );
  }

  // Generate E2E-only report
  if (hasE2ECoverage) {
    await generateReport(
      "E2E Coverage Report",
      path.join(rootDir, "coverage-e2e"),
      e2eCoverageData,
      { hasE2E: true, hasUnit: false }
    );
  }

  // Generate combined report (uses copied unit raw + E2E data)
  combinedSummary = await generateCombinedReport(
    "Combined Coverage Report (Unit + E2E)",
    path.join(rootDir, "coverage"),
    unitRawCopy,
    hasUnitCoverage,
    e2eCoverageData,
    { hasE2E: hasE2ECoverage, hasUnit: hasUnitCoverage }
  );

  // Clean up temp copy and E2E data (keep raw for debugging)
  if (fs.existsSync(e2eCoverageDir)) {
    fs.rmSync(e2eCoverageDir, { recursive: true });
  }
  if (fs.existsSync(unitRawCopy)) {
    fs.rmSync(unitRawCopy, { recursive: true });
  }
  // Note: We don't delete unitRawDir as MCR's inputDir consumes it

  // Check minimum coverage threshold (if set via env)
  const minCoverage = Number.parseFloat(process.env.MIN_COVERAGE || "0");
  if (minCoverage > 0 && combinedSummary.bytes < minCoverage) {
    console.error(
      `\nCoverage (${combinedSummary.bytes.toFixed(1)}%) is below minimum threshold (${minCoverage}%)!`
    );
    process.exitCode = 1;
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log("All reports generated successfully!");
  console.log("=".repeat(50));
}

generateCoverage().catch((err) => {
  console.error("Error generating coverage:", err);
  process.exit(1);
});
