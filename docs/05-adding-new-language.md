# Adding a New Language Parser

This repository is a monorepo designed to house multiple Salesforce-related parsers. This guide outlines the steps to add a new parser (e.g., `sosl`, `anonymous-apex`, `sflog`) to the project.

## 1. Directory Setup
Create a new directory at the root of the project for the new language:
```bash
mkdir new-language
cd new-language
npm init -y
```
Update the generated `package.json` to have the name `tree-sitter-new-language`.

## 2. Grammar Definition
Create `new-language/grammar.js`:
```javascript
const common = require('../common/common');

module.exports = grammar({
  name: 'new_language',
  
  rules: {
    source_file: $ => repeat($._statement),
    
    _statement: $ => choice(
      // your rules here
    )
  }
});
```

## 3. Register in Manifests
Update the root `tree-sitter.json` to include the new language in the `grammars` array:
```json
{
  "grammars": [
    {
      "name": "apex",
      "camelcase": "Apex",
      "scope": "source.apex",
      "path": "apex",
      "file-types": ["cls", "trigger"]
    },
    {
      "name": "new_language",
      "camelcase": "NewLanguage",
      "scope": "source.new_language",
      "path": "new-language",
      "file-types": ["ext"]
    }
  ]
}
```

Update the root `package.json` scripts:
```json
"scripts": {
  "build-new-language": "cd new-language && npx tree-sitter generate",
  "test-new-language": "cd new-language && npx tree-sitter test"
}
```
Add these to the `build-generate` and `test` aggregates.

## 4. Write Tests
Create `new-language/test/corpus/basic.txt`:
```
==================
Basic Test
==================
// Your sample code here
---
(source_file
  (statement))
```
Run your tests: `npm run test-new-language`.

## 5. Add Queries
Create `new-language/queries/highlights.scm` to provide syntax highlighting. If applicable, add `tags.scm` and `locals.scm`.

## 6. Update Bindings
Update the Node.js, Python, and WASM bindings to export your new parser.
1. **Node (`binding.gyp`)**: Add `new-language/src/parser.c` to `sources` and `new-language/src` to `include_dirs`.
2. **Node (`bindings/node/binding.cc`)**: Add the `extern "C" const void *tree_sitter_new_language();` declaration and register it in `Init`.
3. **Node (`bindings/node/index.js` & `index.d.ts`)**: Export the new parser.
4. **Python (`bindings/python/tree_sitter_salesforce/__init__.py`)**: Add a new function returning `Language(_SHARED_LIB, "new_language")`.

## 7. Documentation & Case Studies
Update the root `README.md`, `ARCHITECTURE.md`, and `SALESFORCE_API.md` to reflect the new addition.

### Case Study: `tree-sitter-sflog` (Salesforce Debug Logs)
The `sflog` parser (`sflog/`) is an example of introducing a specialized, domain-specific execution trace grammar into the multi-grammar monorepo. It showcases:
- Parsing structured, line-oriented execution traces without requiring nested blocks.
- Specialized event payloads for `USER_DEBUG`, `SOQL_EXECUTE_BEGIN`/`END`, `DML_BEGIN`/`END`, `METHOD_ENTRY`/`EXIT`, etc., with clean fallback to `generic_event`.
- Structured governor limit metric tables (`limit_usage_section`, `limit_usage_for_ns`, `limit_metric_line`).
- Full cross-language bindings across Node.js (`tree-sitter-salesforce/sflog`), Python (`tss.sflog()`), and WebAssembly (`tree-sitter-sflog.wasm`).

