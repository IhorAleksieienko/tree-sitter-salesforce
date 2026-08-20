# Release Process

This document describes how to cut test releases and production releases for `tree-sitter-salesforce`.

---

## 1. Release Strategy Overview

The release workflow ([`.github/workflows/release.yml`](../.github/workflows/release.yml)) uses **tag prefix routing**:

| Tag Pattern | Target Environment | Python Registry | npm Dist-Tag |
|---|---|---|---|
| `test_v*` (e.g. `test_v0.2.0-rc1`) | **Staging / Test** | **TestPyPI** (`test.pypi.org`) | `@test` |
| `v*.*.*` (e.g. `v0.2.0`) | **Production** | **PyPI** (`pypi.org`) | `@latest` (default) |

---

## 2. Prerequisites

- All grammar steps complete and merged to `main`.
- All CI checks green on `main`.
- **One-time PyPI / TestPyPI setup**:
  - TestPyPI trusted publisher linked to `testpypi` environment in GitHub.
  - PyPI trusted publisher linked to `pypi` environment in GitHub.
- **npm Token**: `NPM_TOKEN` secret set in GitHub Actions.

---

## 3. Release Checklist

### Step 1. Version Bump
Update version in both files **to match**:
```toml
# pyproject.toml
version = "0.X.Y"
```
```json
// package.json
"version": "0.X.Y"
```

### Step 2. Update CHANGELOG.md
Move items from `[Unreleased]` to a new version section:
```markdown
## [0.X.Y] — YYYY-MM-DD
```

### Step 3. Local Verification
```bash
node scripts/generate-all.js
node scripts/test-all.js
python scripts/test_bindings.py
npm publish --dry-run
```
All must exit code 0.

### Step 4. Trigger Release via Tag

#### Option A: Publish a Test Package to TestPyPI & npm (@test)
```bash
git add pyproject.toml package.json CHANGELOG.md
git commit -m "chore: test release v0.X.Y-rc1"
git tag test_v0.X.Y-rc1
git push origin main --tags
```

#### Option B: Publish a Production Release to PyPI & npm (@latest)
```bash
git add pyproject.toml package.json CHANGELOG.md
git commit -m "chore: release v0.X.Y"
git tag v0.X.Y
git push origin main --tags
```

### Step 5. Monitor GitHub Actions
Open the **Actions** tab on GitHub:
- `build-wheels`: Compiles wheels for Windows, Linux (x86_64, aarch64), and macOS.
- `build-wasm`: Compiles 5 WASM binaries.
- **If `test_v*` tag**:
  - `publish-testpypi` runs.
  - `publish-npm-test` runs (publishes with `--tag test`).
- **If `v*.*.*` tag**:
  - `publish-pypi` runs.
  - `publish-npm-prod` runs (publishes with `--tag latest`).

### Step 6. Verify Published Packages

```bash
# From TestPyPI (if using test_v* tag)
pip install --index-url https://test.pypi.org/simple/ --extra-index-url https://pypi.org/simple/ "tree-sitter-salesforce==0.X.Y"

# From Production PyPI (if using v*.*.* tag)
pip install "tree-sitter-salesforce==0.X.Y"

# From npm test tag
npm install tree-sitter-salesforce@test

# From npm production latest
npm install tree-sitter-salesforce@0.X.Y
```

### Step 7. Create GitHub Release
- Go to GitHub Releases $\rightarrow$ **Draft a new release**.
- Select the `v0.X.Y` tag.
- Paste the CHANGELOG notes and attach WASM artifacts if desired.
- Click **Publish release**.
