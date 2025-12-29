/**
 * Generate HTML coverage report from Istanbul coverage data using monocart-coverage-reports
 */

const fs = require("fs");
const path = require("path");
const CoverageReport = require("monocart-coverage-reports");

const COVERAGE_DIR = path.join(process.cwd(), ".coverage-data");
const REPORT_DIR = path.join(process.cwd(), "coverage");

async function generateReport() {
  // Check if coverage data exists
  if (!fs.existsSync(COVERAGE_DIR)) {
    console.log("No coverage data found. Run tests with COVERAGE=1 first.");
    console.log("Usage: pnpm run coverage");
    process.exit(1);
  }

  // Read all coverage files
  const files = fs.readdirSync(COVERAGE_DIR).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.log("No coverage data files found in", COVERAGE_DIR);
    process.exit(1);
  }

  console.log(`Found ${files.length} coverage data file(s)`);

  // Merge all Istanbul coverage data
  const mergedCoverage = {};
  for (const file of files) {
    const filepath = path.join(COVERAGE_DIR, file);
    const data = JSON.parse(fs.readFileSync(filepath, "utf8"));

    // Merge coverage data (Istanbul format is keyed by file path)
    for (const [filePath, fileCoverage] of Object.entries(data)) {
      if (!mergedCoverage[filePath]) {
        mergedCoverage[filePath] = fileCoverage;
      } else {
        // Merge statement counts
        const existing = mergedCoverage[filePath];
        for (const [key, count] of Object.entries(fileCoverage.s || {})) {
          existing.s[key] = (existing.s[key] || 0) + count;
        }
        // Merge branch counts
        for (const [key, counts] of Object.entries(fileCoverage.b || {})) {
          if (!existing.b[key]) {
            existing.b[key] = counts;
          } else {
            existing.b[key] = existing.b[key].map(
              (c, i) => c + (counts[i] || 0),
            );
          }
        }
        // Merge function counts
        for (const [key, count] of Object.entries(fileCoverage.f || {})) {
          existing.f[key] = (existing.f[key] || 0) + count;
        }
      }
    }
  }

  console.log(
    `Merged coverage for ${Object.keys(mergedCoverage).length} file(s)`,
  );

  // Create coverage report
  const coverageReport = new CoverageReport({
    name: "Chrome Virtual Keyboard Coverage",
    outputDir: REPORT_DIR,
    reports: ["html", "console-summary"],

    // Clean output directory
    cleanCache: true,
  });

  // Add Istanbul coverage data
  await coverageReport.add(mergedCoverage);

  // Generate report
  await coverageReport.generate();

  console.log(`\nCoverage report generated!`);
  console.log(`Open: ${path.join(REPORT_DIR, "index.html")}`);
}

generateReport().catch((err) => {
  console.error("Error generating coverage report:", err);
  process.exit(1);
});
