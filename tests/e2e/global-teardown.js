/**
 * Global teardown - generates coverage report after all tests complete
 */

import fs from "fs";
import path from "path";
import MCR from "monocart-coverage-reports";

const COVERAGE_DATA_DIR = path.resolve("./.coverage-data");
const COVERAGE_OUTPUT_DIR = path.resolve("./coverage");

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

  console.log(`\nGenerating coverage report from ${files.length} file(s)...`);

  // Create MCR instance
  const mcr = new MCR({
    name: "Chrome Virtual Keyboard Coverage",
    outputDir: COVERAGE_OUTPUT_DIR,
    reports: ["v8", "html", "console-summary"],
  });

  // Add all coverage data
  for (const file of files) {
    const data = JSON.parse(
      fs.readFileSync(path.join(COVERAGE_DATA_DIR, file), "utf8"),
    );
    await mcr.add(data);
  }

  // Generate report
  await mcr.generate();

  // Cleanup coverage data
  fs.rmSync(COVERAGE_DATA_DIR, { recursive: true, force: true });

  console.log(`Coverage report: ${COVERAGE_OUTPUT_DIR}/index.html`);
}
