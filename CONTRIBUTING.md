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

## CI/CD & Automated Releases

- **Pull Requests & Commits**: Every push to `main`/`develop` and PR against `main` runs `.github/workflows/ci.yml` across Ubuntu, macOS, and Windows runners (testing all grammars and Python versions 3.10–3.13).
- **Releases**: Pushing a version tag `v*.*.*` automatically triggers `.github/workflows/release.yml`, building multi-platform wheels via `cibuildwheel` (including Linux `aarch64` via QEMU), compiling WebAssembly modules via Emscripten, and publishing to PyPI and npm.
- See [docs/10-release-process.md](docs/10-release-process.md) for the complete release process.

## Reporting Issues

If you find Apex, SOQL, SOSL, or Formula code that doesn't parse correctly:
1. Open an issue with the minimal code sample
2. Include the expected parse tree if possible
3. Or submit a PR with a failing corpus test case

