#!/usr/bin/env node
/**
 * Builds WASM binaries for all grammars using Emscripten.
 * Requires: emcc (Emscripten) to be on PATH.
 * Run: node scripts/build-wasm.js
 */
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const grammars = ["apex", "apex-anon", "soql", "sosl", "formula"];
const outputDir = path.join(__dirname, "..", "bindings", "web");

fs.mkdirSync(outputDir, { recursive: true });

for (const grammar of grammars) {
  const dir = path.join(__dirname, "..", grammar);
  const outputName = `tree-sitter-${grammar.replace("-", "_")}.wasm`;
  const outputPath = path.join(outputDir, outputName);
  console.log(`\n=== Building WASM for ${grammar} ===`);
  execSync(`npx tree-sitter build --wasm --output "${outputPath}"`, {
    cwd: dir,
    stdio: "inherit",
  });
}

console.log("\n✅ All WASM binaries built.");
console.log(`   Output: ${outputDir}`);
