# Contributing to tree-sitter-salesforce

## Adding a New Language Parser

1. Create directory: `mkdir new-language`
2. Create `new-language/package.json`: `{"name": "tree-sitter-new-language"}`
3. Create `new-language/grammar.js` (import helpers from `common/`)
4. Add entry to `tree-sitter.json` grammars array
5. Add npm scripts to root `package.json`
6. Write tests in `new-language/test/corpus/`
7. Create query files in `new-language/queries/`
8. Update `bindings/` to export the new parser
9. Update `README.md` and `SALESFORCE_API.md`

See [docs/05-adding-new-language.md](docs/05-adding-new-language.md) for full details.

## Improving Existing Grammars

1. Write a failing test case in `test/corpus/`
2. Fix the grammar rule in `grammar.js`
3. Run `tree-sitter generate && tree-sitter test`
4. Submit a PR with the test and fix

## Reporting Issues

If you find Apex/SOQL code that doesn't parse correctly:
1. Open an issue with the code sample
2. Include the expected parse tree if possible
3. Or submit a PR with a failing test case
