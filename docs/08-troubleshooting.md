# Troubleshooting Grammar Development

When building Tree-Sitter grammars, you will inevitably run into cryptic error messages or parsing behaviors. Here is a guide to solving the most common issues.

## 1. Unresolved Conflicts
**Error during `tree-sitter generate`:**
```
Unresolved conflict for symbol sequence:
  ...
```

**Cause:** The parser has reached a state where the next token could validly apply to two or more different rules, and it doesn't know which one to choose.

**Solution:**
1. Determine if the conflict is a genuine ambiguity in the language. (e.g., in Apex, `Map<String, String>` could be parsed as a type, or as `Map < String , String >` using less-than/greater-than operators).
2. If it's a real ambiguity, add the conflicting rules to the `conflicts` array in `grammar.js`:
   ```javascript
   conflicts: $ => [
     [$.type_identifier, $.expression],
   ],
   ```
   This enables GLR parsing, allowing Tree-Sitter to parse both branches simultaneously and discard the one that eventually fails.
3. If it's NOT a real ambiguity, try using `prec.left`, `prec.right`, or `prec.dynamic` to tell Tree-Sitter which rule has higher priority.

## 2. Unnecessary Conflicts
**Warning during `tree-sitter generate`:**
```
Warning: unnecessary conflicts
  `type_identifier`, `expression`
```

**Cause:** You added a conflict to the `conflicts` array, but Tree-Sitter determined that it could resolve the ambiguity using standard LR(1) lookahead without needing GLR parsing.

**Solution:** Simply remove the mentioned rules from the `conflicts` array.

## 3. Keywords as Identifiers
**Issue:** You defined a keyword like `'select'`, but now variables named `select` fail to parse.

**Cause:** By default, string literals in the grammar take precedence over regex rules (like your `identifier` rule). So Tree-Sitter sees the variable `select` and forces it to be the `SELECT` keyword, which breaks the variable declaration.

**Solution:** Use the `word` property or add the keyword to a `choice` within your identifier rule, but be careful. In Salesforce languages, use the `ci()` helper to define case-insensitive keywords and ensure your `identifier` rule has lower precedence or isn't masked by keyword rules inappropriately.

## 4. `(ERROR)` Nodes in Output
**Issue:** `tree-sitter test` fails and shows `(ERROR)` in the tree.

**Cause:** The source code violates the grammar rules you've defined.

**Solution:**
1. Look at the exact location of the `(ERROR)` node in the tree. The tokens immediately preceding it parsed successfully. The tokens inside or immediately following the `(ERROR)` node are the ones that caused the failure.
2. Verify that your rules account for optional commas, semicolons, or modifiers that might be present in the test code.
3. Run `tree-sitter parse path/to/file.txt --debug` to see exactly which states the parser transitioned through before failing.

## 5. Infinite Loops during Generation
**Issue:** `tree-sitter generate` hangs forever or consumes all memory.

**Cause:** You have created an empty repetition. For example, `repeat(optional($.rule))` or `repeat(repeat($.rule))`.

**Solution:** Ensure that any `repeat` or `repeat1` block consumes at least one token. Avoid nesting `repeat` inside another `repeat`.
