# Release Process

This document describes how to cut a new release of `tree-sitter-salesforce`.

## Prerequisites

- All grammar steps complete and merged to `main`
- All CI checks green on `main`
- `sf-rag-engine` regression tests confirmed passing

## Release Checklist

### 1. Version Bump

Update version in both files **to match**:

```sh
# pyproject.toml
version = "0.X.Y"

# package.json
"version": "0.X.Y"
```

### 2. Update CHANGELOG.md

Move items from the `[Unreleased]` section to a new version heading:
```markdown
## [0.X.Y] — YYYY-MM-DD
```

### 3. Verify Locally

```cmd
node scripts/test-all.js
python scripts/test_bindings.py
npm publish --dry-run
```

All must exit code 0.

### 4. Commit and Tag

```sh
git add pyproject.toml package.json CHANGELOG.md
git commit -m "chore: release v0.X.Y"
git tag v0.X.Y
git push origin main --tags
```

### 5. Monitor CI

Open the Actions tab. The `release.yml` workflow triggers automatically on the tag push.
Watch for:
- ✅ `build-wheels` — all 3 OS × 4 Python versions
- ✅ `build-wasm` — 5 WASM binaries
- ✅ `publish-pypi` — wheel upload
- ✅ `publish-npm` — npm publish

### 6. Verify Published Packages

```sh
# PyPI
pip install "tree-sitter-salesforce==0.X.Y"
python -c "import tree_sitter_salesforce as tss; tss.apex(); print('OK')"

# npm
npm install tree-sitter-salesforce@0.X.Y
node -e "const s = require('tree-sitter-salesforce'); console.log(Object.keys(s))"
```

### 7. Create GitHub Release

- Go to the repository Releases page
- Click "Draft a new release"
- Select the new tag
- Paste the CHANGELOG entry as the release notes
- Attach the WASM artifacts from the CI run
