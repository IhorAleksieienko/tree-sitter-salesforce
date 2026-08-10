# Release Process & Multi-Platform Distribution

This document outlines the standard release lifecycle for `tree-sitter-salesforce`, covering multi-platform binary compilation, automated package distribution (PyPI and npm), WebAssembly bundling, and verification procedures.

---

## 1. Distribution Architecture

`tree-sitter-salesforce` ships multi-grammar parsers (Apex, Anonymous Apex, SOQL, SOSL, Formula Language) across three distribution channels:

| Channel | Target Ecosystem | Package Format | Artifact Details |
|---|---|---|---|
| **PyPI** | Python (`py-tree-sitter`) | Native binary wheels (`.whl`) & sdist | CPython 3.9–3.12 for Windows (x64), Linux (x86_64, aarch64 via QEMU), macOS (x86_64, arm64) |
| **npm** | Node.js & TypeScript | npm tarball (`.tgz`) | Pre-built N-API native addons via `node-gyp-build` and C source fallbacks |
| **WebAssembly** | Browser, VSCode Web, Edge | Standalone `.wasm` files | Emscripten-compiled WASM modules in `bindings/web/` |

---

## 2. Prerequisites & Secrets Configuration

Releases are triggered automatically via GitHub Actions upon pushing a version tag (`v*.*.*`).

### Required GitHub Repository Configuration
1. **PyPI Trusted Publishing (OIDC)**:
   - Configured in PyPI Project Settings -> "Publishing" -> "Add GitHub Actions publisher".
   - Environment Name: `pypi`.
   - Workflow: `.github/workflows/release.yml`.
   - Requires no long-lived PyPI API tokens.
2. **npm Access Token**:
   - Stored in GitHub Repository Secrets as `NPM_TOKEN`.
   - Generated with Automation / Publish permissions on `npmjs.com`.

---

## 3. Step-by-Step Release Workflow

### Step 1 — Synchronize Package Versions

Ensure the version string matches across all project manifests:
- [`package.json`](../package.json): `"version": "X.Y.Z"`
- [`pyproject.toml`](../pyproject.toml): `version = "X.Y.Z"`

### Step 2 — Update Documentation & Changelog

Update [`CHANGELOG.md`](../CHANGELOG.md):
- Add a new section `## [X.Y.Z] - YYYY-MM-DD`.
- Document all `Added`, `Changed`, `Fixed`, `Removed`, and `Deprecated` items.
- Ensure migration notes are clearly stated for any breaking changes.

### Step 3 — Local Pre-Release Verification

Run the full local verification pipeline:

```bash
# 1. Regenerate parser C source files for all five grammars
node scripts/generate-all.js

# 2. Run full corpus test suites across all five grammars
node scripts/test-all.js

# 3. Test Python native capsule bindings
python scripts/test_bindings.py

# 4. Dry-run npm package bundling
npm publish --dry-run --access public
```

All commands must exit with code `0`.

### Step 4 — Commit & Push

```bash
git add package.json pyproject.toml CHANGELOG.md
git commit -m "chore: release vX.Y.Z"
git push origin main
```

### Step 5 — Tag the Release

Create an annotated git tag and push it to trigger `.github/workflows/release.yml`:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

### Step 6 — Monitor CI/CD Execution

1. Navigate to the GitHub repository **Actions** tab.
2. Monitor the **Release** workflow:
   - `build-wheels`: Compiles native wheels for Linux (x86_64, aarch64), macOS (x86_64, arm64), and Windows (x64).
   - `build-wasm`: Compiles all 5 `.wasm` binaries using Emscripten.
   - `publish-pypi`: Uploads all generated wheels to PyPI using trusted OIDC authentication.
   - `publish-npm`: Bundles WASM binaries and source files, publishing to the npm registry.

### Step 7 — Post-Release Verification

Verify packages in clean environments:

```bash
# Test PyPI installation
pip install --upgrade tree-sitter-salesforce==X.Y.Z
python -c "import tree_sitter_salesforce as tss; from tree_sitter import Parser; p = Parser(); p.language = tss.apex(); print(p.parse(b'public class Foo {}').root_node)"

# Test npm installation
npm install tree-sitter-salesforce@X.Y.Z
node -e "const ts = require('tree-sitter-salesforce'); console.log(Object.keys(ts));"
```

### Step 8 — Create GitHub Release

1. Go to **Releases** -> **Draft a new release**.
2. Select tag `vX.Y.Z`.
3. Set Release Title: `vX.Y.Z`.
4. Copy the release notes from [`CHANGELOG.md`](../CHANGELOG.md).
5. Attach any standalone assets if desired (e.g. WASM bundle tarball).
6. Click **Publish release**.

---

## 4. Troubleshooting & Rollback Procedures

### Wheel Build Failure on aarch64 Linux
- Verify `docker/setup-qemu-action@v3` ran prior to `cibuildwheel`.
- Check if any grammar source file contains non-portable compiler flags or syntax errors.

### WASM Build Failure
- Verify Emscripten version in CI (`mymindstorm/setup-emsdk@v14`, pinned to `3.1.50`+).
- Ensure `npx tree-sitter build --wasm` syntax is used (not deprecated `build-wasm`).

### Failed Release / Corrupted Artifact
- PyPI does not permit re-uploading an existing version tag. If a released wheel is defective:
  1. Fix the underlying bug.
  2. Bump the patch version (`vX.Y.(Z+1)`).
  3. Publish the new patch release following this guide.
  4. (Optional) Yank the defective version on PyPI via the PyPI web management console.
