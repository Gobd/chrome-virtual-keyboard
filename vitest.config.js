import { defineConfig, coverageConfigDefaults } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["tests/unit/**/*.test.js"],
    globals: true,
    coverage: {
      provider: "v8",
      // Output V8 JSON for merging with E2E coverage
      reporter: ["json", "json-summary", "html", "text-summary"],
      reportsDirectory: "./coverage-unit",
      include: ["src/**/*.js"],
      exclude: [
        ...coverageConfigDefaults.exclude,
        "src/options/**", // Options page - tested manually
        "src/layouts/**", // Static layout data
      ],
      all: true,
    },
    setupFiles: ["./tests/unit/setup.js"],
  },
});
