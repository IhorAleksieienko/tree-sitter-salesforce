# Step 13: Anonymous Apex Scripting Mode

> **Agent Checkpoint — Read This First**
>
> **Status**: COMPLETE.
> **Prerequisites**: Steps 10–12 are COMPLETE.
> - `soql_expression` is balanced-bracket. SOQL corpus expanded. SOSL grammar exists.
> - All existing Apex corpus tests pass (run `npx tree-sitter test` in `apex/` to confirm).
>
> **⚠️ DESIGN FLAG — HIGH CONFLICT RISK. READ CAREFULLY BEFORE TOUCHING ANY CODE.**
>
> This is the highest-risk grammar change in the entire blueprint. Modifying the `source_file`
> rule from `repeat($.declaration)` to `choice(repeat1($.declaration), repeat1($.statement))`
> introduces a fundamental ambiguity: the parser cannot determine from the first token alone
> which branch to take. A `public class Foo` starts with `public` — which is also a valid
> modifier for a statement like `public static void run() {}`. Tree-sitter's GLR parser can
> handle limited ambiguity, but an unconstrained `choice` at the root rule will produce
> many shift/reduce conflicts and unpredictable behavior.
>
> **The blueprint's suggested syntax (`choice(repeat1($.declaration), repeat1($.statement))`)
> must NOT be implemented verbatim.** This story describes the safe alternative design.

---

## Goal

Allow `apex/grammar.js` to parse Apex files that consist entirely of top-level executable
statements — with no class or trigger wrapper. This matches the "Execute Anonymous" window
in Salesforce Developer Console, `sf apex run`, and CI integration test scripts.

**Files that must parse correctly after this step:**

```apex
// Script-style: no class wrapper
System.debug('Hello, World!');
Account a = new Account(Name = 'Test');
insert a;
System.debug(a.Id);
```

```apex
// Normal class file: must continue to parse as before
public with sharing class AccountService {
    public void run() { }
}
```

---

## The Root Conflict Problem (and Why the Blueprint's Naive Fix Breaks Things)

### Why `choice(repeat1($.declaration), repeat1($.statement))` fails

Consider these two valid Apex files:

**File A** (class declaration):
```apex
public class Foo { }
```

**File B** (anonymous script):
```apex
Foo bar = new Foo();
```

Now consider this ambiguous file:

**File C**:
```apex
public static void run() { }
```

Is this a top-level method declaration (which Apex doesn't normally allow outside a class)
or a statement? Tree-sitter would need to evaluate both branches simultaneously — and with
no context, it cannot commit. This creates exponential parse time (GLR explosion) or
incorrect trees.

Additionally: `public`, `private`, `protected`, `global`, `static`, `final`, `abstract`,
`virtual`, `override`, `transient` are all valid modifiers for **both** class members
(declarations) and some statement-level constructs. The parser cannot know which path to
take from the modifier alone.

### The Safe Design: Dedicated `anonymous_script` Rule with Structural Guard

The solution is to **not make the root rule ambiguous**. Instead:

1. Keep the default `source_file: $ => repeat($.declaration)` for normal Apex files.
2. Introduce a **separate entry point** for anonymous scripts.
3. Let the consumer (editor, parser tool) **choose the grammar variant** based on file
   context (`.cls`/`.trigger` → declaration mode, anonymous execution context → script mode).

Tree-sitter supports this via a **second grammar definition** or an optional wrapping rule
with a **disambiguating sentinel token**.

The recommended approach for this project: **wrap the anonymous script mode in a separate
grammar definition**, stored as `apex-anon/grammar.js`, that extends the same rules but
has a different entry point. This avoids any conflict in the primary `apex/grammar.js`.

---

## Architecture Decision Record (ADR)

| Option | Pros | Cons | Decision |
|---|---|---|---|
| `choice(repeat1($.declaration), repeat1($.statement))` at root | Simple | Causes exponential GLR conflicts; blueprint-suggested but unsound | ❌ Rejected |
| `anonymous_script` wrapper node with sentinel token | One grammar file | Requires a sentinel that doesn't exist in Apex syntax | ❌ Rejected |
| Separate `apex-anon/grammar.js` extending shared rules | No conflicts; clean separation | Two grammar builds | ✅ **Chosen** |
| Dynamic grammar selection in bindings (pass a flag) | Flexible | Complex binding code | ⏳ Future option |

---

## Affected Files

| File | Change Type | Description |
|---|---|---|
| `apex-anon/grammar.js` | **New** | Anonymous Apex grammar with `source_file → repeat($.statement)` |
| `apex-anon/package.json` | **New** | Grammar package config |
| `apex-anon/src/parser.c` | **Generated** | Native C parser |
| `apex-anon/queries/highlights.scm` | **New** | Symlink or copy from `apex/queries/` |
| `apex-anon/test/corpus/anonymous_scripts.txt` | **New** | Corpus for anonymous scripts |
| `tree-sitter.json` | Modify | Register `apex-anon` grammar for file type `.apex` (anonymous) |
| `bindings/python/__init__.py` | Modify | Add `apex_anon()` loader |
| `bindings/node/index.js` | Modify | Add `apexAnon` export |
| `binding.gyp` | Modify | Include `apex-anon/src/parser.c` |
| `apex/grammar.js` | **No change** | The primary Apex grammar is NOT modified |

---

## Sub-Task 13.1 — Create `apex-anon/grammar.js`

The anonymous grammar **reuses all rules from `apex/grammar.js`** but has a different
entry point and no `declaration`-level alternatives at the root.

```javascript
/**
 * @file Anonymous Apex grammar for tree-sitter
 * @description
 * Parses "anonymous Apex" scripts — top-level executable statements without a
 * class or trigger wrapper. Used by:
 *   - Salesforce Developer Console "Execute Anonymous"
 *   - `sf apex run` / `sfdx force:apex:execute`
 *   - CI test scripts and data migration scripts
 *
 * This grammar shares all rules with apex/grammar.js except for the entry point.
 * The entry point here is repeat1($.statement) instead of repeat($.declaration).
 *
 * WHY A SEPARATE GRAMMAR?
 * Merging both modes into one grammar at the source_file level introduces
 * fundamental GLR conflicts that cause unpredictable parse behavior.
 * A separate grammar with a clear entry point is the correct tree-sitter pattern.
 *
 * Target: Salesforce API v67 (Summer '25)
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

"use strict";

// Import the Apex grammar rules as a base.
// We extend/override only the entry point.
const apexGrammar = require("../apex/grammar.js");
const { ci, commaJoined, commaJoined1 } = require("../common/common.js");

module.exports = grammar(apexGrammar, {
  name: "apex_anon",

  rules: {
    /**
     * Anonymous Apex entry point — one or more top-level statements.
     *
     * This overrides apex/grammar.js's source_file rule which requires declarations.
     * All other rules (statement, expression, type, etc.) are inherited unchanged.
     *
     * Examples of valid anonymous scripts:
     *   System.debug('Hello');
     *   Account a = new Account(Name = 'Test');
     *   insert a;
     */
    source_file: ($) => repeat1($.statement),
  },
});
```

> **Note on `grammar(base, override)` syntax**: This is the tree-sitter grammar extension
> pattern. It inherits all rules from `apexGrammar` and overrides only `source_file`.
> Check the installed `tree-sitter-cli` version supports this syntax — it was introduced
> in tree-sitter 0.20. Run `npx tree-sitter --version` to verify.

**Fallback if grammar extension is not supported**: Copy `apex/grammar.js` entirely into
`apex-anon/grammar.js` and change only the `source_file` rule and the `name` field.

---

## Sub-Task 13.2 — Create `apex-anon/package.json`

```json
{
  "name": "tree-sitter-apex-anon",
  "version": "0.1.0"
}
```

---

## Sub-Task 13.3 — Create Corpus File

### `apex-anon/test/corpus/anonymous_scripts.txt`

```
====================================
Simple debug statement
====================================
System.debug('Hello, World!');
---
(source_file
  (expression_statement
    (method_invocation
      object: (identifier)
      name: (identifier)
      arguments: (argument_list
        (string_literal)))))

====================================
Variable declaration and DML
====================================
Account a = new Account(Name = 'Test');
insert a;
---
(source_file
  (local_variable_declaration
    type: (type_identifier)
    (variable_declarator
      name: (identifier)
      value: (new_expression)))
  (dml_statement
    (dml_type)
    (identifier)))

====================================
For loop with SOQL query
====================================
for (Account a : [SELECT Id FROM Account]) {
    System.debug(a.Id);
}
---
(source_file
  (enhanced_for_statement
    type: (type_identifier)
    name: (identifier)
    value: (soql_expression)
    body: (block
      (expression_statement
        (method_invocation)))))

====================================
Try-catch block
====================================
try {
    Database.insert(new Account(Name = 'T'), false);
} catch (DmlException e) {
    System.debug(e.getMessage());
}
---
(source_file
  (try_statement
    body: (block)
    (catch_clause)))

====================================
Switch on string
====================================
String env = 'prod';
switch on env {
    when 'prod' { System.debug('production'); }
    when else   { System.debug('other'); }
}
---
(source_file
  (local_variable_declaration)
  (switch_statement
    (when_clause)
    (when_else_clause)))
```

---

## Sub-Task 13.4 — Register in `tree-sitter.json`

```json
{
  "name": "apex_anon",
  "camelcase": "ApexAnon",
  "scope": "source.apex.anon",
  "path": "apex-anon",
  "file-types": ["apex"],
  "highlights": [
    "apex/queries/highlights.scm"
  ],
  "injections": [
    "apex/queries/injections.scm"
  ]
}
```

> **Note**: The `.apex` file extension is currently unassigned. `.cls` and `.trigger` map
> to the primary Apex grammar. Anonymous scripts commonly use `.apex` by convention in
> SFDX projects. If your project uses a different extension, adjust `file-types` here.

---

## Sub-Task 13.5 — Expose in Python Bindings

### File: `bindings/python/tree_sitter_salesforce/__init__.py`

```python
def apex_anon():
    """
    Returns the Anonymous Apex language object for tree-sitter.

    Use this to parse Apex scripts executed via Developer Console or sf apex run.
    Unlike apex(), this grammar expects top-level statements, not class declarations.

    Example:
        lang = Language(tree_sitter_salesforce.apex_anon())
        parser = Parser()
        parser.language = lang
        tree = parser.parse(b"System.debug('Hello');")
    """
    from tree_sitter import Language
    return Language(_SHARED_LIB, "apex_anon")
```

---

## How to Test This Step

### 1. Verify `tree-sitter-cli` supports grammar extension

```cmd
npx tree-sitter --version
```

Required: `0.20.0` or higher for `grammar(base, override)` syntax.
If lower: use the copy-and-modify fallback described in Sub-Task 13.1.

### 2. Generate the anonymous grammar

```cmd
cd d:\Git\tree-sitter-salesforce
npx tree-sitter generate --no-bindings apex-anon\grammar.js
```

Must produce `apex-anon/src/parser.c` with zero conflicts.

### 3. Run the anonymous corpus

```cmd
cd d:\Git\tree-sitter-salesforce\apex-anon
npx tree-sitter test
```

All 5 corpus tests must pass.

### 4. Regression check — primary Apex corpus must be unaffected

```cmd
cd d:\Git\tree-sitter-salesforce\apex
npx tree-sitter test
```

**Zero changes allowed to existing test results.**

### 5. Parse an actual anonymous script file

Create `hello.apex`:
```apex
String msg = 'Hello ' + UserInfo.getName();
System.debug(msg);
```

```cmd
npx tree-sitter parse hello.apex --language apex-anon\grammar.js
```

Must produce a `source_file` containing two `statement` children with no ERROR nodes.

### 6. Confirm `.cls` file still uses primary Apex grammar

```cmd
npx tree-sitter parse apex\test\corpus\declarations.txt --language apex\grammar.js
```

Must produce `class_declaration` nodes (not anonymous script nodes).

### 7. Python smoke test

```python
import tree_sitter_salesforce as tss
from tree_sitter import Language, Parser

parser = Parser()
parser.language = Language(tss.apex_anon())
tree = parser.parse(b"System.debug('Hello');\ninsert new Account(Name = 'T');")
assert not tree.root_node.has_error
print(f"Root type: {tree.root_node.type}")  # Must print: source_file
```

---

## Success Criteria

| # | Criterion | How to Verify |
|---|---|---|
| 1 | `apex-anon/src/parser.c` generated with zero conflicts | `tree-sitter generate` output |
| 2 | All anonymous script corpus tests pass | `tree-sitter test` in `apex-anon/` |
| 3 | `System.debug(...);` at top level parses without ERROR | Manual spot check |
| 4 | SOQL `for` loops work in anonymous context | Corpus test: "For loop with SOQL query" |
| 5 | DML statements (`insert a;`) work at top level | Corpus test: "Variable declaration and DML" |
| 6 | Try-catch blocks work at top level | Corpus test: "Try-catch block" |
| 7 | Primary `apex/grammar.js` is UNCHANGED | Diff shows zero changes to that file |
| 8 | Primary Apex corpus tests: zero regressions | `tree-sitter test` in `apex/` |
| 9 | `tss.apex_anon()` returns a valid Language object | Python smoke test |

---

## Regression Risk

**Low for primary Apex grammar** (it is not modified at all).

**Medium for `apex-anon` grammar** if the grammar extension pattern is not supported by
the installed tree-sitter version. In that case, the fallback (copy-and-modify) must be
used and any future changes to `apex/grammar.js` must be manually synced to `apex-anon/grammar.js`.

**Synchronization debt**: If the copy-and-modify fallback is used, document it explicitly
in `apex-anon/grammar.js` with a comment:
```javascript
// NOTE: This file is a copy of apex/grammar.js with source_file overridden.
// When apex/grammar.js changes, those changes must be manually applied here too.
// See: docs/steps/step-13-anonymous-apex.md for the full rationale.
```

---

## API Contract Impact

**Additive.** New grammar `apex_anon` registered in `tree-sitter.json`.
New Python export `tss.apex_anon()`. New Node.js export `apexAnon`.
No existing exports are changed.

The `.apex` file-type association is new; if any existing tool was treating `.apex` files
as the primary `apex` grammar, this registration changes that. Adjust `file-types` as needed.

---

## Documentation Updates Required After Completion

- [x] `README.md` — Add Anonymous Apex to the Features section and parser status table
- [x] `README.md` — Add `apex_anon` to the Quick Start Python and Node.js examples
- [x] `SALESFORCE_API.md` — Add "Anonymous Apex Execution Mode" row
- [x] `CHANGELOG.md` — Add entry for anonymous Apex grammar
- [x] Create `docs/03b-understanding-anonymous-apex.md`
