#!/usr/bin/env node
/**
 * Output coverage summary for all test types
 * Used by CI to display coverage percentages
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");

function readCoverageSummary(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function formatPct(value) {
  if (value === null || value === undefined) return "N/A";
  return `${Number(value).toFixed(1)}%`;
}

// Read unit test coverage
const unitSummary = readCoverageSummary(
  path.join(rootDir, "coverage-unit/coverage-summary.json")
);

// Read E2E coverage
const e2eSummary = readCoverageSummary(
  path.join(rootDir, "coverage-e2e/coverage-summary.json")
);

// Read combined coverage
const combinedSummary = readCoverageSummary(
  path.join(rootDir, "coverage/coverage-summary.json")
);

console.log("\n" + "=".repeat(60));
console.log("Coverage Summary");
console.log("=".repeat(60));

console.log("\nUnit Tests:");
if (unitSummary?.total) {
  console.log(`  Lines:     ${formatPct(unitSummary.total.lines?.pct)}`);
  console.log(`  Functions: ${formatPct(unitSummary.total.functions?.pct)}`);
  console.log(`  Branches:  ${formatPct(unitSummary.total.branches?.pct)}`);
} else {
  console.log("  No coverage data");
}

console.log("\nE2E Tests:");
if (e2eSummary) {
  console.log(`  Lines:     ${formatPct(e2eSummary.lines)}`);
  console.log(`  Functions: ${formatPct(e2eSummary.functions)}`);
  console.log(`  Branches:  ${formatPct(e2eSummary.branches)}`);
  console.log(`  Bytes:     ${formatPct(e2eSummary.bytes)}`);
} else {
  console.log("  No coverage data");
}

console.log("\nCombined:");
if (combinedSummary) {
  console.log(`  Lines:     ${formatPct(combinedSummary.lines)}`);
  console.log(`  Functions: ${formatPct(combinedSummary.functions)}`);
  console.log(`  Branches:  ${formatPct(combinedSummary.branches)}`);
  console.log(`  Bytes:     ${formatPct(combinedSummary.bytes)}`);
} else {
  console.log("  No coverage data");
}

console.log("\n" + "=".repeat(60));

// Output for CI (GitHub Actions)
if (process.env.GITHUB_OUTPUT) {
  const output = [];

  if (unitSummary?.total) {
    output.push(`unit_lines=${unitSummary.total.lines?.pct ?? 0}`);
    output.push(`unit_functions=${unitSummary.total.functions?.pct ?? 0}`);
    output.push(`unit_branches=${unitSummary.total.branches?.pct ?? 0}`);
  }

  if (e2eSummary) {
    output.push(`e2e_lines=${e2eSummary.lines ?? 0}`);
    output.push(`e2e_functions=${e2eSummary.functions ?? 0}`);
    output.push(`e2e_branches=${e2eSummary.branches ?? 0}`);
    output.push(`e2e_bytes=${e2eSummary.bytes ?? 0}`);
  }

  if (combinedSummary) {
    output.push(`combined_lines=${combinedSummary.lines ?? 0}`);
    output.push(`combined_functions=${combinedSummary.functions ?? 0}`);
    output.push(`combined_branches=${combinedSummary.branches ?? 0}`);
    output.push(`combined_bytes=${combinedSummary.bytes ?? 0}`);
  }

  fs.appendFileSync(process.env.GITHUB_OUTPUT, output.join("\n") + "\n");
}
