#!/usr/bin/env node
/**
 * Generates parser.c for all grammars.
 * Run: node scripts/generate-all.js
 */
const { execSync } = require("child_process");
const path = require("path");

const grammars = ["apex", "apex-anon", "soql", "sosl", "formula"];

for (const grammar of grammars) {
  const dir = path.join(__dirname, "..", grammar);
  console.log(`\n=== Generating ${grammar} ===`);
  execSync("npx tree-sitter generate", {
    cwd: dir,
    stdio: "inherit",
  });
}

console.log("\n✅ All grammars generated successfully.");
