# Testing Guide

## Test-First Workflow
When building or extending a Tree-Sitter grammar, always write the tests **before** modifying the grammar.
1. Add a test case with the code you want to parse in a `corpus/` file.
2. Run the tests. It will fail, showing an `(ERROR)` node in the output tree.
3. Update `grammar.js` to support the new syntax.
4. Re-run `tree-sitter generate && tree-sitter test`.
5. Once the test passes, copy the generated syntax tree from the terminal and paste it below the `---` separator in your test file to lock it in.

## Test File Format
Tests are stored in `test/corpus/*.txt`. Each test has three parts:
1. **Header:** Enclosed in `===`
2. **Source Code:** The code to parse
3. **Expected Tree:** Separated by `---`

Example:
```text
==================
Simple Variable Declaration
==================
String name = 'Acme';
---
(source_file
  (local_variable_declaration
    type: (type_identifier)
    declarator: (variable_declarator
      name: (identifier)
      value: (string_literal))))
```

## Running Tests
Run all tests from the project root:
```bash
npm test
```
Run tests for a specific language:
```bash
npm run test-apex
```
Run a specific test by name (useful for debugging):
```bash
cd apex
npx tree-sitter test -f "Simple Variable Declaration"
```

## Common Testing Pitfalls
- **Missing `---` separator:** If you forget the separator, Tree-Sitter treats your expected tree as source code.
- **Hidden Characters:** CRLF (`\r\n`) line endings in corpus files can sometimes cause tests to fail if the grammar expects strict `\n`. Set your editor to use LF for corpus files.
- **Unintended Extras:** If your tree output contains `(ERROR)` nodes, check if a comment or whitespace is breaking a rule that doesn't allow extras, though extras are usually allowed globally.
