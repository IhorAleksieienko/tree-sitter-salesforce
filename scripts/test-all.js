#!/usr/bin/env node
/**
 * Runs tree-sitter test for all grammars and reports results.
 */
const { execSync } = require("child_process");
const path = require("path");

const grammars = ["apex", "apex-anon", "soql", "sosl", "formula", "sflog"];
const results = [];

for (const grammar of grammars) {
  const dir = path.join(__dirname, "..", grammar);
  console.log(`\n=== Testing ${grammar} ===`);
  try {
    execSync("npx tree-sitter test", { cwd: dir, stdio: "inherit" });
    results.push({ grammar, status: "✅ PASS" });
  } catch (e) {
    results.push({ grammar, status: "❌ FAIL" });
  }
}

console.log("\n=== Test Summary ===");
for (const { grammar, status } of results) {
  console.log(`  ${status} ${grammar}`);
}

const failures = results.filter((r) => r.status.includes("FAIL"));
if (failures.length > 0) {
  process.exit(1);
}
