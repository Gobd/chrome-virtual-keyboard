// Build script for Chrome Virtual Keyboard extension
// Uses esbuild to bundle ES modules for content script

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isTest = process.argv.includes("--test");

const SRC_DIR = path.join(__dirname, "src");
const DIST_DIR = path.join(__dirname, "dist");

// Files to copy without bundling
const STATIC_FILES = [
  "manifest.json",
  "style.css",
  "options.html",
  "background.js",
  "LICENSE",
  "ARCHITECTURE.md",
];

const STATIC_DIRS = ["options", "buttons", "core"];

// Ensure dist directory exists
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Copy a file
function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  console.log(`  Copied: ${src} -> ${dest}`);
}

// Copy a directory recursively
function copyDir(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

// Copy static files
function copyStatic() {
  console.log("Copying static files...");

  for (const file of STATIC_FILES) {
    const src = path.join(SRC_DIR, file);
    const dest = path.join(DIST_DIR, file);
    if (fs.existsSync(src)) {
      copyFile(src, dest);
    }
  }

  for (const dir of STATIC_DIRS) {
    const src = path.join(SRC_DIR, dir);
    const dest = path.join(DIST_DIR, dir);
    if (fs.existsSync(src)) {
      copyDir(src, dest);
    }
  }
}

// Build configuration
const buildOptions = {
  entryPoints: [path.join(SRC_DIR, "main.js")],
  bundle: true,
  outfile: path.join(DIST_DIR, "main.js"),
  format: "iife",
  target: ["chrome120"],
  minify: false, // Keep readable for debugging
  sourcemap: false,
  logLevel: "info",
  // For test builds, use open shadow DOM so tests can access elements
  define: isTest ? { __SHADOW_MODE__: '"open"' } : {},
};

// Main build function
async function build() {
  console.log("Building Chrome Virtual Keyboard...");
  if (isTest) {
    console.log("  (test mode: open shadow DOM)");
  }
  console.log("");

  // Clean dist
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true });
  }
  ensureDir(DIST_DIR);

  // Copy static files
  copyStatic();

  // Bundle main.js
  console.log("\nBundling main.js...");
  await esbuild.build(buildOptions);

  console.log("\nBuild complete! Output in dist/");
}

// Watch mode
async function watch() {
  console.log("Watching for changes...\n");

  // Initial build
  await build();

  // Watch for changes
  const ctx = await esbuild.context({
    ...buildOptions,
    logLevel: "info",
  });

  await ctx.watch();

  // Also watch static files
  const staticWatcher = (_eventType, filename) => {
    if (filename && !filename.startsWith(".")) {
      console.log(`\nStatic file changed: ${filename}`);
      copyStatic();
    }
  };

  fs.watch(SRC_DIR, { recursive: true }, (eventType, filename) => {
    // esbuild handles JS files, we handle static files
    if (filename && !filename.endsWith(".js")) {
      staticWatcher(eventType, filename);
    }
  });

  console.log("\nWatching for changes. Press Ctrl+C to stop.");
}

// Run
const isWatch = process.argv.includes("--watch");

if (isWatch) {
  watch().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  build().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
