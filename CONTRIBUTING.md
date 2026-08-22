# Contributing to tree-sitter-salesforce

## Local Development & Testing

Before submitting a Pull Request, ensure all grammars generate cleanly and all test suites pass across Node.js and Python:

```bash
# Generate C parser sources for all grammars (apex, apex-anon, soql, sosl, formula)
npm run generate:all

# Run tree-sitter corpus tests across all grammars
npm run test:all

# Run Python binding smoke tests
python scripts/test_bindings.py

# Verify npm packaging
npm publish --dry-run --access public
```

## Adding a New Language Parser

1. Create directory: `mkdir new-language`
2. Create `new-language/package.json`: `{"name": "tree-sitter-new-language"}`
3. Create `new-language/grammar.js` (import helpers from `common/`)
4. Add entry to `tree-sitter.json` grammars array
5. Add npm scripts to root `package.json`
6. Write tests in `new-language/test/corpus/`
7. Create query files in `new-language/queries/`
8. Update `bindings/` (Node.js, Python, WASM) to export the new parser
9. Update `README.md` and `SALESFORCE_API.md`

See [docs/05-adding-new-language.md](docs/05-adding-new-language.md) for full details.

## Improving Existing Grammars

1. Write a failing test case in `<grammar>/test/corpus/`
2. Fix the grammar rule in `<grammar>/grammar.js`
3. Run `npm run generate:all && npm run test:all`
4. Submit a PR with the test and fix

## Versioning & Release Policy

This project strictly adheres to [Semantic Versioning (SemVer)](https://semver.org/):

`v<MAJOR>.<MINOR>.<PATCH>`

* **`PATCH` (`0.x.Z`)**: Bug fixes, Tree-sitter shift/reduce conflict resolutions, improved error tolerance, and test fixture updates with zero AST breaking changes.
* **`MINOR` (`0.Y.0`)**: New language parsers (e.g., new sub-grammars), support for new Salesforce Seasonal API Releases (e.g., Summer '25 / API v67.0 baseline to Winter '26), or new binding features.
* **`MAJOR` (`X.0.0`)**: Breaking changes to core AST node names or structural field definitions in `grammar.js` that affect downstream queries.

### Release Workflow
- Versioning is strictly tag-driven using `setuptools-scm` and SemVer Git tags (`vX.Y.Z`).
- Pushing a production tag `v*.*.*` automatically triggers `.github/workflows/release.yml`, which runs all test gates, builds multi-platform wheels for Python 3.12–3.14 across Linux (`x86_64`), macOS (`x86_64`, `arm64`), and Windows (`x86_64`), builds WebAssembly modules, and publishes tokenlessly to PyPI via GitHub OIDC and to npm.
- Staging releases can be tested on TestPyPI by pushing a `test_v*` tag (e.g., `test_v0.2.0-rc1`).
- See [docs/10-release-process.md](docs/10-release-process.md) for step-by-step release maintainer instructions.

## Reporting Issues

If you find Apex, SOQL, SOSL, Formula, or Debug Log code that doesn't parse correctly:
1. Open an issue with the minimal code sample
2. Include the expected parse tree if possible
3. Or submit a PR with a failing corpus test case

