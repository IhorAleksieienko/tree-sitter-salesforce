#!/usr/bin/env node
/**
 * Helper script to build WebAssembly binaries for all grammars and prepare
 * the interactive playground in docs/playground/.
 *
 * Requirements for WASM compilation:
 *   - Emscripten (emcc) or Docker installed and on PATH.
 *
 * Usage:
 *   node scripts/build-wasm-playground.js
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const grammars = [
  { name: "apex", dir: "apex", wasmName: "tree-sitter-apex.wasm" },
  { name: "apex-anon", dir: "apex-anon", wasmName: "tree-sitter-apex_anon.wasm" },
  { name: "soql", dir: "soql", wasmName: "tree-sitter-soql.wasm" },
  { name: "sosl", dir: "sosl", wasmName: "tree-sitter-sosl.wasm" },
  { name: "formula", dir: "formula", wasmName: "tree-sitter-formula.wasm" },
];

const rootDir = path.join(__dirname, "..");
const webBindingsDir = path.join(rootDir, "bindings", "web");
const playgroundWasmDir = path.join(rootDir, "docs", "playground", "wasm");

fs.mkdirSync(webBindingsDir, { recursive: true });
fs.mkdirSync(playgroundWasmDir, { recursive: true });

console.log("=== Building Salesforce Tree-sitter WebAssembly Grammars ===\n");

let buildCount = 0;
let errors = [];

for (const g of grammars) {
  const grammarPath = path.join(rootDir, g.dir);
  const targetWebPath = path.join(webBindingsDir, g.wasmName);
  const targetPlaygroundPath = path.join(playgroundWasmDir, g.wasmName);

  console.log(`[WASM] Building ${g.name}...`);
  try {
    execSync(`npx tree-sitter build --wasm --output "${targetWebPath}"`, {
      cwd: grammarPath,
      stdio: "inherit",
    });

    // Copy to playground directory
    fs.copyFileSync(targetWebPath, targetPlaygroundPath);
    console.log(`  ✓ Built & copied: ${g.wasmName}`);
    buildCount++;
  } catch (err) {
    console.error(`  ✗ Failed to build WASM for ${g.name}`);
    errors.push(g.name);
  }
}

// Copy web-tree-sitter runtime assets if available
try {
  const webTreeSitterPkg = path.dirname(require.resolve("web-tree-sitter/package.json"));
  const webTreeSitterWasm = path.join(webTreeSitterPkg, "tree-sitter.wasm");
  const webTreeSitterJs = path.join(webTreeSitterPkg, "tree-sitter.js");

  if (fs.existsSync(webTreeSitterWasm)) {
    fs.copyFileSync(webTreeSitterWasm, path.join(playgroundWasmDir, "tree-sitter.wasm"));
    console.log("  ✓ Copied web-tree-sitter tree-sitter.wasm to playground");
  }
  if (fs.existsSync(webTreeSitterJs)) {
    fs.copyFileSync(webTreeSitterJs, path.join(playgroundWasmDir, "tree-sitter.js"));
    console.log("  ✓ Copied web-tree-sitter tree-sitter.js to playground");
  }
} catch {
  // web-tree-sitter not locally installed or loaded via CDN in browser
}

console.log(`\n=== Summary ===`);
console.log(`Successfully built: ${buildCount}/${grammars.length} grammars.`);
if (errors.length > 0) {
  console.log(`\nNote: WASM compilation requires Emscripten (emcc) or Docker.`);
  console.log(`Install Emscripten from https://emscripten.org or run inside Docker.`);
  console.log(`In CI, GitHub Actions automatically builds and publishes WASM artifacts.`);
} else {
  console.log(`Playground WASM assets ready in: ${playgroundWasmDir}`);
}
