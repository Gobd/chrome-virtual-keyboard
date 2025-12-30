import { coverageConfigDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["tests/unit/**/*.test.js"],
    globals: true,
    coverage: {
      // Use vitest-monocart-coverage for raw V8 output
      provider: "custom",
      customProviderModule: "vitest-monocart-coverage",
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
