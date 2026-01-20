// Build script for Chrome Virtual Keyboard extension
// Uses esbuild to bundle ES modules for content script

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isTest = process.argv.includes("--test");
const isFirefox = process.argv.includes("--firefox");

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

const STATIC_DIRS = ["buttons", "core"];

// ONNX Runtime WASM files needed for Transformers.js (voice input)
const WASM_FILES = [
  "ort-wasm-simd-threaded.jsep.mjs",
  "ort-wasm-simd-threaded.jsep.wasm",
];

// Additional ONNX Runtime files needed for VAD (@ricky0123/vad-web)
const VAD_ONNX_FILES = [
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.wasm",
];

// VAD (Voice Activity Detection) files for @ricky0123/vad-web
const VAD_FILES = [
  "silero_vad_v5.onnx",
  "silero_vad_legacy.onnx",
  "vad.worklet.bundle.min.js",
];

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
    // Skip background.js for Firefox (will be bundled separately)
    if (isFirefox && file === "background.js") {
      continue;
    }

    const src = path.join(SRC_DIR, file);
    const dest = path.join(DIST_DIR, file);
    if (fs.existsSync(src)) {
      // Special handling for manifest.json based on build type
      if (file === "manifest.json") {
        if (isFirefox) {
          copyManifestForFirefox(src, dest);
        } else {
          copyManifestForStore(src, dest);
        }
      } else {
        copyFile(src, dest);
      }
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

// Copy manifest for store build (MV3, no Vosk)
function copyManifestForStore(src, dest) {
  const manifest = JSON.parse(fs.readFileSync(src, "utf8"));

  // Remove unsafe-eval from CSP (Vosk not included in store build)
  if (manifest.content_security_policy?.extension_pages) {
    manifest.content_security_policy.extension_pages =
      manifest.content_security_policy.extension_pages.replace(" 'unsafe-eval'", "");
  }

  ensureDir(path.dirname(dest));
  fs.writeFileSync(dest, JSON.stringify(manifest, null, 2));
  console.log(`  Copied (store): ${src} -> ${dest}`);
}

// Convert manifest to MV2 for Firefox build (Vosk requires unsafe-eval)
function copyManifestForFirefox(src, dest) {
  const manifest = JSON.parse(fs.readFileSync(src, "utf8"));

  // Convert to MV2
  manifest.manifest_version = 2;

  // Firefox-specific settings
  manifest.browser_specific_settings = {
    gecko: {
      id: "smartkey@bkemper.dev",
      strict_min_version: "109.0"
    }
  };

  // MV2 CSP format (single string) - needs worker-src for blob workers
  manifest.content_security_policy = "script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'; object-src 'self'; worker-src 'self' blob:";

  // MV2 background format
  manifest.background = {
    scripts: ["background.js"],
    persistent: false
  };

  // MV2 browser_action instead of action
  if (manifest.action) {
    manifest.browser_action = manifest.action;
    delete manifest.action;
  }

  // MV2 web_accessible_resources is just an array
  if (manifest.web_accessible_resources) {
    manifest.web_accessible_resources = manifest.web_accessible_resources
      .flatMap(r => r.resources || []);
  }

  // Remove MV3-only fields
  delete manifest.host_permissions;

  // Add host permissions to regular permissions for MV2
  manifest.permissions = [
    ...manifest.permissions,
    "https://alphacephei.com/*",
    "https://huggingface.co/*",
    "https://cdn-lfs.huggingface.co/*",
    "https://cdn-lfs-us-1.huggingface.co/*"
  ];

  ensureDir(path.dirname(dest));
  fs.writeFileSync(dest, JSON.stringify(manifest, null, 2));
  console.log(`  Copied (Firefox MV2): ${src} -> ${dest}`);
}

// Copy ONNX Runtime WASM files for Transformers.js
function copyWasmFiles() {
  console.log("\nCopying ONNX Runtime WASM files...");
  const wasmDir = path.join(DIST_DIR, "wasm");
  ensureDir(wasmDir);

  const transformersDistDir = path.join(
    __dirname,
    "node_modules",
    "@huggingface",
    "transformers",
    "dist"
  );

  for (const file of WASM_FILES) {
    const src = path.join(transformersDistDir, file);
    const dest = path.join(wasmDir, file);
    if (fs.existsSync(src)) {
      copyFile(src, dest);
    } else {
      console.warn(`  Warning: WASM file not found: ${src}`);
    }
  }
}

// Copy VAD files for @ricky0123/vad-web
function copyVadFiles() {
  console.log("\nCopying VAD files...");
  const vadDir = path.join(DIST_DIR, "vad");
  ensureDir(vadDir);

  const vadDistDir = path.join(
    __dirname,
    "node_modules",
    "@ricky0123",
    "vad-web",
    "dist"
  );

  for (const file of VAD_FILES) {
    const src = path.join(vadDistDir, file);
    const dest = path.join(vadDir, file);
    if (fs.existsSync(src)) {
      copyFile(src, dest);
    } else {
      console.warn(`  Warning: VAD file not found: ${src}`);
    }
  }

  // Copy additional ONNX runtime files needed by VAD to wasm dir
  // pnpm uses nested node_modules, so we need to find the right path
  console.log("\nCopying VAD ONNX runtime files...");
  const wasmDir = path.join(DIST_DIR, "wasm");

  // Try different possible paths for onnxruntime-web (pnpm vs npm)
  const possibleOnnxPaths = [
    path.join(__dirname, "node_modules", "onnxruntime-web", "dist"),
    path.join(__dirname, "node_modules", "@ricky0123", "vad-web", "node_modules", "onnxruntime-web", "dist"),
  ];

  // Also search in pnpm .pnpm folder
  const pnpmPath = path.join(__dirname, "node_modules", ".pnpm");
  if (fs.existsSync(pnpmPath)) {
    const pnpmDirs = fs.readdirSync(pnpmPath);
    for (const dir of pnpmDirs) {
      if (dir.startsWith("onnxruntime-web@")) {
        possibleOnnxPaths.push(path.join(pnpmPath, dir, "node_modules", "onnxruntime-web", "dist"));
      }
    }
  }

  for (const file of VAD_ONNX_FILES) {
    let copied = false;
    for (const onnxDir of possibleOnnxPaths) {
      const src = path.join(onnxDir, file);
      if (fs.existsSync(src)) {
        const dest = path.join(wasmDir, file);
        copyFile(src, dest);
        copied = true;
        break;
      }
    }
    if (!copied) {
      console.warn(`  Warning: VAD ONNX file not found: ${file}`);
    }
  }
}

// Build configuration for main content script
const mainBuildOptions = {
  entryPoints: [path.join(SRC_DIR, "main.js")],
  bundle: true,
  outfile: path.join(DIST_DIR, "main.js"),
  format: "iife",
  target: ["chrome120"],
  minify: false, // Keep readable for debugging
  // Enable inline source maps for test builds so E2E coverage can map to source files
  sourcemap: isTest ? "inline" : false,
  logLevel: "info",
  // Build-time constants
  define: {
    __IS_FIREFOX__: isFirefox ? "true" : "false",
    ...(isTest ? { __SHADOW_MODE__: '"open"' } : {}),
  },
};

// Build configuration for options page script (needs bundling for VoiceInput imports)
const optionsBuildOptions = {
  entryPoints: [path.join(SRC_DIR, "options", "script.js")],
  bundle: true,
  outdir: path.join(DIST_DIR, "options"),
  format: "esm",
  target: [isFirefox ? "firefox109" : "chrome120"],
  minify: false,
  sourcemap: isTest ? "inline" : false,
  logLevel: "info",
  // Build-time constants
  define: {
    __IS_FIREFOX__: isFirefox ? "true" : "false",
  },
};

// Build configuration for background script (Firefox MV2 needs bundled non-module)
const backgroundBuildOptions = {
  entryPoints: [path.join(SRC_DIR, "background.js")],
  bundle: true,
  outfile: path.join(DIST_DIR, "background.js"),
  format: "iife",
  target: ["firefox109"],
  minify: false,
  sourcemap: isTest ? "inline" : false,
  logLevel: "info",
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

  // Copy WASM files for voice input
  copyWasmFiles();

  // Copy VAD files for voice activity detection
  copyVadFiles();

  // Bundle main.js
  console.log("\nBundling main.js...");
  await esbuild.build(mainBuildOptions);

  // Bundle options script
  console.log("\nBundling options/script.js...");
  await esbuild.build(optionsBuildOptions);

  // Bundle background.js for Firefox (MV2 can't use ES modules)
  if (isFirefox) {
    console.log("\nBundling background.js...");
    await esbuild.build(backgroundBuildOptions);
  }

  console.log("\nBuild complete! Output in dist/");
}

// Watch mode
async function watch() {
  console.log("Watching for changes...\n");

  // Initial build
  await build();

  // Watch for changes
  const mainCtx = await esbuild.context({
    ...mainBuildOptions,
    logLevel: "info",
  });
  const optionsCtx = await esbuild.context({
    ...optionsBuildOptions,
    logLevel: "info",
  });

  await mainCtx.watch();
  await optionsCtx.watch();

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
