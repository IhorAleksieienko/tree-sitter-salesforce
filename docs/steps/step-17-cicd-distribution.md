# Step 17: CI/CD Build Matrix & Multi-Platform Distribution

> **Agent Checkpoint — Read This First**
>
> **Status**: COMPLETE.
> **Prerequisites**: Steps 10–16 are COMPLETE.
> - All five grammars are implemented, tested, and registered.
> - Python bindings use the modern `nanobind` capsule API.
> - All corpus tests pass on the local development machine.
> - The repository has a remote on GitHub (or equivalent CI provider).
>
> **Design Flag ℹ️**: This step creates the automation infrastructure. It does not modify
> any grammar or binding code. All CI workflows, scripts, WASM bindings, and release process documentation are in place.

---

## Goal

Implement a GitHub Actions workflow that automatically:

1. **Builds** native C parsers for all five grammars on Windows, Linux, and macOS.
2. **Runs** the full corpus test suite on all platforms.
3. **Compiles** WebAssembly (WASM) binaries for all five grammars (browser/VSCode Web support).
4. **Publishes** Python wheels to PyPI and the npm package to the npm registry on version tags.

---

## Background: Why Multi-Platform Matters

Tree-sitter parsers are native C code. The compiled output (`.so`, `.dll`, `.dylib`, `.wasm`)
is platform-specific. To avoid requiring every consumer to compile from source, the release
pipeline must:

1. Build on each target platform.
2. Bundle the pre-compiled binary into the published package.
3. Publish platform-specific Python wheels (so `pip install tree-sitter-salesforce` works
   without a C compiler).

**Target matrix:**

| OS | Architecture | Output |
|---|---|---|
| `ubuntu-latest` | `x86_64` | `_binding_*.so`, Linux npm addon |
| `ubuntu-latest` (cross) | `aarch64` | `_binding_*.so` (ARM64) |
| `macos-latest` | `x86_64` + `arm64` (universal2) | `_binding_*.dylib`, macOS npm addon |
| `windows-latest` | `x64` | `_binding_*.pyd`, Windows npm addon |
| `ubuntu-latest` | WebAssembly | `tree-sitter-*.wasm` for all 5 grammars |

---

## Directory Structure to Create

```
.github/
└── workflows/
    ├── ci.yml         ← Runs on every push/PR: build + test
    └── release.yml    ← Runs on version tags: build + publish
```

---

## Sub-Task 17.1 — Create CI Workflow

### File: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  # ─────────────────────────────────────────────────────────────
  # Grammar Tests — run tree-sitter test for all grammars
  # ─────────────────────────────────────────────────────────────
  grammar-tests:
    name: Grammar Tests (${{ matrix.os }})
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Generate all grammars
        run: npm run generate:all
        # This script runs tree-sitter generate in each grammar directory

      - name: Run Apex corpus tests
        run: npx tree-sitter test
        working-directory: apex

      - name: Run SOQL corpus tests
        run: npx tree-sitter test
        working-directory: soql

      - name: Run SOSL corpus tests
        run: npx tree-sitter test
        working-directory: sosl

      - name: Run Formula corpus tests
        run: npx tree-sitter test
        working-directory: formula

      - name: Run Anonymous Apex corpus tests
        run: npx tree-sitter test
        working-directory: apex-anon

  # ─────────────────────────────────────────────────────────────
  # Python Binding Tests
  # ─────────────────────────────────────────────────────────────
  python-tests:
    name: Python Tests (Python ${{ matrix.python-version }}, ${{ matrix.os }})
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        python-version: ["3.9", "3.11", "3.12"]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}

      - uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Generate all grammars
        run: npm ci && npm run generate:all

      - name: Install Python package
        run: pip install -e . --no-build-isolation

      - name: Run Python smoke tests
        run: python scripts/test_bindings.py
        # This script tests all 5 language loaders (see Sub-Task 17.4)
```

---

## Sub-Task 17.2 — Create Release Workflow

### File: `.github/workflows/release.yml`

```yaml
name: Release

on:
  push:
    tags:
      - "v*.*.*"

jobs:
  # ─────────────────────────────────────────────────────────────
  # Build Python Wheels for all platforms
  # ─────────────────────────────────────────────────────────────
  build-wheels:
    name: Build wheels (${{ matrix.os }})
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Generate all grammars
        run: npm ci && npm run generate:all

      - name: Build wheels (cibuildwheel)
        uses: pypa/cibuildwheel@v2.17.0
        env:
          # Build for Python 3.9, 3.10, 3.11, 3.12
          CIBW_BUILD: "cp39-* cp310-* cp311-* cp312-*"
          # Skip 32-bit Windows and musl Linux
          CIBW_SKIP: "*-win32 *-musllinux*"
          # ARM64 on macOS (Apple Silicon)
          CIBW_ARCHS_MACOS: "x86_64 arm64"
          # ARM64 on Linux via QEMU emulation
          CIBW_ARCHS_LINUX: "x86_64 aarch64"

      - uses: actions/upload-artifact@v4
        with:
          name: wheels-${{ matrix.os }}
          path: wheelhouse/*.whl

  # ─────────────────────────────────────────────────────────────
  # Build WASM Binaries
  # ─────────────────────────────────────────────────────────────
  build-wasm:
    name: Build WASM binaries
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install Emscripten
        uses: mymindstorm/setup-emsdk@v14
        with:
          version: "3.1.50"

      - name: Generate all grammars
        run: npm ci && npm run generate:all

      - name: Build WASM for all grammars
        run: npm run build:wasm

      - name: Verify WASM files exist
        run: |
          ls -la bindings/web/
          for grammar in apex soql sosl formula apex_anon; do
            if [ ! -f "bindings/web/tree-sitter-${grammar}.wasm" ]; then
              echo "ERROR: Missing WASM for ${grammar}"
              exit 1
            fi
          done

      - uses: actions/upload-artifact@v4
        with:
          name: wasm-binaries
          path: bindings/web/*.wasm

  # ─────────────────────────────────────────────────────────────
  # Publish to PyPI
  # ─────────────────────────────────────────────────────────────
  publish-pypi:
    name: Publish to PyPI
    needs: [build-wheels]
    runs-on: ubuntu-latest
    environment:
      name: pypi
      url: https://pypi.org/project/tree-sitter-salesforce/

    permissions:
      id-token: write  # Required for trusted publishing (OIDC)

    steps:
      - uses: actions/download-artifact@v4
        with:
          pattern: wheels-*
          merge-multiple: true
          path: dist/

      - name: Publish to PyPI
        uses: pypa/gh-action-pypi-publish@release/v1
        # Uses OIDC trusted publishing — no API token needed

  # ─────────────────────────────────────────────────────────────
  # Publish npm package
  # ─────────────────────────────────────────────────────────────
  publish-npm:
    name: Publish to npm
    needs: [build-wheels, build-wasm]
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          registry-url: "https://registry.npmjs.org"

      - uses: actions/download-artifact@v4
        with:
          name: wasm-binaries
          path: bindings/web/

      - name: Generate all grammars
        run: npm ci && npm run generate:all

      - name: Publish to npm
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## Sub-Task 17.3 — Update `package.json` Scripts

### File: [`package.json`](file:///d:/Git/tree-sitter-salesforce/package.json)

Add the following scripts:

```json
{
  "scripts": {
    "generate:all": "node scripts/generate-all.js",
    "build:wasm": "node scripts/build-wasm.js",
    "test:all": "node scripts/test-all.js",
    "test": "node scripts/test-all.js"
  }
}
```

---

## Sub-Task 17.4 — Create Build Helper Scripts

### New file: `scripts/generate-all.js`

```javascript
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
  execSync(`npx tree-sitter generate --no-bindings`, {
    cwd: dir,
    stdio: "inherit",
  });
}

console.log("\n✅ All grammars generated successfully.");
```

### New file: `scripts/build-wasm.js`

```javascript
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
  console.log(`\n=== Building WASM for ${grammar} ===`);
  execSync(`npx tree-sitter build-wasm --output ${path.join(outputDir, outputName)}`, {
    cwd: dir,
    stdio: "inherit",
  });
}

console.log("\n✅ All WASM binaries built.");
console.log(`   Output: ${outputDir}`);
```

### New file: `scripts/test-all.js`

```javascript
#!/usr/bin/env node
/**
 * Runs tree-sitter test for all grammars and reports results.
 */
const { execSync } = require("child_process");
const path = require("path");

const grammars = ["apex", "apex-anon", "soql", "sosl", "formula"];
const results = [];

for (const grammar of grammars) {
  const dir = path.join(__dirname, "..", grammar);
  try {
    execSync(`npx tree-sitter test`, { cwd: dir, stdio: "inherit" });
    results.push({ grammar, status: "✅ PASS" });
  } catch (e) {
    results.push({ grammar, status: "❌ FAIL" });
  }
}

console.log("\n=== Test Summary ===");
for (const { grammar, status } of results) {
  console.log(`  ${status} ${grammar}`);
}

const failures = results.filter(r => r.status.includes("FAIL"));
if (failures.length > 0) {
  process.exit(1);
}
```

### New file: `scripts/test_bindings.py`

```python
#!/usr/bin/env python3
"""
Python binding smoke tests.
Verifies all 5 language loaders work and can parse representative inputs.
Run: python scripts/test_bindings.py
"""
import sys

# Verify tree-sitter version
import tree_sitter as _ts
ver = tuple(int(x) for x in _ts.__version__.split(".")[:2])
assert ver >= (0, 22), f"tree-sitter >= 0.22 required, found {_ts.__version__}"

import tree_sitter_salesforce as tss
from tree_sitter import Language, Parser

TESTS = [
    (
        tss.apex,
        b'public with sharing class T { public void run() { List<Account> a = [SELECT Id FROM Account]; } }',
        "Apex class with SOQL"
    ),
    (
        tss.apex_anon,
        b'System.debug("Hello");\ninsert new Account(Name = "T");',
        "Anonymous Apex script"
    ),
    (
        tss.soql,
        b'SELECT Id, Name, (SELECT LastName FROM Contacts) FROM Account WHERE IsDeleted = false',
        "SOQL with subquery"
    ),
    (
        tss.sosl,
        b"FIND 'Acme*' IN ALL FIELDS RETURNING Account(Id, Name ORDER BY Name), Contact(Email)",
        "SOSL search"
    ),
    (
        tss.formula,
        b"IF(ISBLANK(Email__c), 'Required: ' & FirstName, $User.ProfileId)",
        "Formula with IF and global var"
    ),
]

parser = Parser()
all_passed = True

for loader_fn, source, description in TESTS:
    parser.language = Language(loader_fn())
    tree = parser.parse(source)
    if tree.root_node.has_error:
        print(f"❌ FAIL: {description}")
        print(f"   Source: {source.decode()[:60]}...")
        print(f"   Tree: {tree.root_node.sexp()[:200]}")
        all_passed = False
    else:
        print(f"✅ PASS: {description}")

if not all_passed:
    sys.exit(1)

print(f"\n✅ All {len(TESTS)} binding tests passed.")
```

---

## Sub-Task 17.5 — Create `bindings/web/index.js`

A convenience loader for browser and Node.js WASM consumers:

```javascript
/**
 * tree-sitter-salesforce WebAssembly loader
 *
 * Usage (in browser with tree-sitter.wasm loaded):
 *   const Parser = require('web-tree-sitter');
 *   await Parser.init();
 *   const Apex = await Parser.Language.load('/path/to/tree-sitter-apex.wasm');
 *   const parser = new Parser();
 *   parser.setLanguage(Apex);
 *   const tree = parser.parse('public class T { }');
 */

const path = require("path");

function getWasmPath(grammarName) {
  return path.join(__dirname, `tree-sitter-${grammarName}.wasm`);
}

module.exports = {
  apexWasm: getWasmPath("apex"),
  apexAnonWasm: getWasmPath("apex_anon"),
  soqlWasm: getWasmPath("soql"),
  soslWasm: getWasmPath("sosl"),
  formulaWasm: getWasmPath("formula"),
};
```

---

## How to Test This Step

### 1. Test the npm scripts locally

```cmd
cd d:\Git\tree-sitter-salesforce
node scripts/generate-all.js
node scripts/test-all.js
```

Both must exit with code 0.

### 2. Test the Python binding script locally

```cmd
pip install -e . --no-build-isolation
python scripts/test_bindings.py
```

All 5 tests must print ✅.

### 3. Test the WASM build (requires Emscripten)

If Emscripten is installed:
```cmd
node scripts/build-wasm.js
dir bindings\web\*.wasm
```

Must list 5 `.wasm` files.

If Emscripten is NOT installed locally, this is acceptable — WASM build is verified by CI.

### 4. Simulate CI locally with act (optional)

```cmd
npm install -g @nektos/act
act push --job grammar-tests
```

### 5. Trigger the actual CI

Push to a branch and open a PR against `main`. The `ci.yml` workflow must:
- Run on all 3 OS variants.
- Pass all grammar test jobs.
- Pass all Python test jobs on all 3 Python versions.

### 6. Test the release workflow (dry run)

```cmd
# Dry-run publish to npm (does not actually publish)
npm publish --dry-run --access public
```

---

## Success Criteria

| # | Criterion | How to Verify |
|---|---|---|
| 1 | `node scripts/generate-all.js` exits with code 0 | Run locally |
| 2 | `node scripts/test-all.js` shows ✅ for all 5 grammars | Run locally |
| 3 | `python scripts/test_bindings.py` shows ✅ for all 5 loaders | Run locally |
| 4 | CI `ci.yml` passes on ubuntu, macos, windows | Open a PR and check Actions tab |
| 5 | CI runs Python tests on Python 3.9, 3.11, 3.12 | Check CI matrix in Actions tab |
| 6 | WASM build produces 5 `.wasm` files | CI artifact download or local build |
| 7 | `npm publish --dry-run` succeeds without error | Run locally |
| 8 | `release.yml` triggers correctly on a `v*.*.*` tag | Create a test tag `v0.2.0-rc1` |

---

## Regression Risk

**Low** for grammar and binding code. This step only adds CI infrastructure.

**Potential issues:**
- `cibuildwheel` may fail on aarch64 Linux if QEMU is not configured — check the
  `cibuildwheel` docs for the required `setup-qemu-action` step.
- MSVC build on Windows may require specific versions of the Visual Studio Build Tools —
  the `windows-latest` runner includes these, but cross-compilation to `win32` is skipped.
- Emscripten version in CI must match the version used to build the tree-sitter WASM
  runtime that consumers will load. Pin the Emscripten version to `3.1.50` or later.

---

## API Contract Impact

**None.** This step is pure CI/CD infrastructure. No grammar, binding, or API changes.

---

## Documentation Updates Required After Completion

- [x] `README.md` — Add CI badge (copy the badge URL from GitHub Actions)
- [x] `README.md` — Add WASM usage instructions to Quick Start
- [x] `CONTRIBUTING.md` — Explain the CI workflow and how to trigger releases
- [x] `CHANGELOG.md` — Add entry for CI/CD and WASM distribution
- [x] Create `docs/10-release-process.md` explaining how to cut a release (bump version, tag, verify CI)

---

## Release Checklist (For Future Use)

When ready to cut a new release after completing all steps:

1. [ ] Update version in `pyproject.toml` and `package.json`
2. [ ] Update `CHANGELOG.md` with all changes since last release
3. [ ] Run `node scripts/test-all.js` locally — all pass
4. [ ] Run `python scripts/test_bindings.py` locally — all pass
5. [ ] Commit and push: `git commit -m "chore: release v0.2.0"`
6. [ ] Tag the release: `git tag v0.2.0 && git push origin v0.2.0`
7. [ ] GitHub Actions `release.yml` triggers automatically
8. [ ] Verify wheels appear on PyPI: `pip install tree-sitter-salesforce==0.2.0`
9. [ ] Verify npm package: `npm install tree-sitter-salesforce@0.2.0`
10. [ ] Create GitHub Release with the changelog notes
