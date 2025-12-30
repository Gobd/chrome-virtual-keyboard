// Monocart coverage reporter config for unit tests
// Used by vitest-monocart-coverage

export default {
  name: "Chrome Virtual Keyboard Unit Coverage",

  // Output raw V8 data for merging with E2E coverage
  reports: ["raw", "console-summary"],

  outputDir: "./coverage-unit",

  // Source filter - paths are relative (e.g., "src/core/state.js")
  sourceFilter: (sourcePath) => {
    // Only include src files
    if (!sourcePath.startsWith("src/")) return false;
    // Exclude layouts and options
    if (sourcePath.includes("layouts/")) return false;
    if (sourcePath.includes("options/")) return false;
    return true;
  },
};
