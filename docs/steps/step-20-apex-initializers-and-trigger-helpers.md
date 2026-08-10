# Step 20: Apex Declarations — Static/Instance Initializers and Trigger Member Declarations

> **Agent Checkpoint — Read This First**
>
> **Status**: NOT STARTED.
> **Prerequisites**: Step 19 is COMPLETE.
> - Apex grammar has baseline P0 fixes applied.
> - All corpus tests pass in `apex/`.
>
> **Design Flag ℹ️**:
> This step introduces:
> 1. `static_initializer` (`static { ... }`) and instance initializers (bare `{ ... }`) into `_class_body_declaration`.
> 2. `_class_body_declaration` choices into `trigger_body` to allow helper fields, helper methods, and inner types inside `.trigger` files.
> Ensure that bare `{ ... }` inside classes is recognized as an instance initializer and does not conflict with method or constructor bodies.

---

## Goal

Add support for class initialization blocks and trigger top-level helper member declarations in `apex/grammar.js`:
1. Support `static { ... }` blocks (static initialization) in class bodies.
2. Support bare `{ ... }` blocks (instance initialization) in class bodies.
3. Allow field declarations, helper methods, and inner types directly within `trigger_body`.

---

## Background: Current State

1. **Initializers Missing in Classes**:
   In [`apex/grammar.js`](file:///d:/Git/tree-sitter-salesforce/apex/grammar.js#L234-L243), `_class_body_declaration` only includes:
   - `field_declaration`
   - `method_declaration`
   - `constructor_declaration`
   - `property_declaration`
   - `class_declaration`, `interface_declaration`, `enum_declaration`
   - `";"`
   
   Apex classes frequently utilize static initializer blocks (`static { configMap = loadConfig(); }`) and instance initializers (`{ items = new List<String>(); }`). Currently, both trigger a parse error in class bodies.

2. **Trigger Body Restricted to Statements**:
   In [`apex/grammar.js`](file:///d:/Git/tree-sitter-salesforce/apex/grammar.js#L366), `trigger_body` is defined as:
   `trigger_body: ($) => seq("{", repeat($.statement), "}")`.
   
   In Salesforce Apex, developers often define helper methods (e.g., `void handleBeforeInsert(...)`), static helper variables, or constants directly within the trigger body before dispatching logic. Currently, any method or field declaration in a trigger causes a syntax error.

---

## Technical Design

### 1. Static and Instance Initializers (`apex/grammar.js`)
- **Where to look**: `_class_body_declaration` rule around lines 234–243.
- **What to touch**:
  - Define a new rule `static_initializer`:
    - Sequence of `ci("static")` followed by `field("body", $.block)`.
  - Add `$.static_initializer` to `_class_body_declaration`.
  - Add bare `$.block` (or an aliased `instance_initializer` node: `alias($.block, $.instance_initializer)`) to `_class_body_declaration`.
  - This allows class bodies to contain both static and instance initialization blocks executed upon class load or instantiation.

### 2. Trigger Body Member Declarations (`apex/grammar.js`)
- **Where to look**: Rule `trigger_body` around line 366.
- **What to touch**:
  - Update `trigger_body` to accept a repetition of either `$.statement` or `$._class_body_declaration`:
    `trigger_body: ($) => seq("{", repeat(choice($.statement, $._class_body_declaration)), "}")`.
  - This allows triggers to contain local helper methods, top-level static state caches, and inner helper classes alongside procedural trigger statements.

---

## Affected Files

| File | Change Type | Description |
|---|---|---|
| `apex/grammar.js` | Modify | Add `static_initializer` rule, update `_class_body_declaration` with static/instance blocks, and update `trigger_body`. |
| `apex/test/corpus/declarations.txt` | Modify | Add corpus test cases for static initializers, instance initializers, and helper methods/fields in triggers. |

---

## Sub-Tasks

### Sub-Task 20.1: Add `static_initializer` and Instance Block to `_class_body_declaration`
- In `apex/grammar.js`, add:
  `static_initializer: ($) => seq(ci("static"), field("body", $.block))`.
- Update `_class_body_declaration` to include `$.static_initializer` and `alias($.block, $.instance_initializer)`.

### Sub-Task 20.2: Update `trigger_body`
- Locate `trigger_body` in `apex/grammar.js`.
- Modify the repetition sequence to allow `choice($.statement, $._class_body_declaration)`.

### Sub-Task 20.3: Author Test Corpus Entries
- In `apex/test/corpus/declarations.txt`, add test cases for:
  - Class with single and multiple `static { ... }` initializer blocks.
  - Class with instance initializer block `{ ... }` intermixed with fields and constructors.
  - Trigger containing top-level field declarations, helper `static void log(...)` methods, and inner helper classes alongside standard `for (...)` loops.

---

## How to Test This Step

### 1. Regenerate Apex Grammar
```cmd
cd d:\Git\tree-sitter-salesforce
npx tree-sitter generate --no-bindings apex/grammar.js
```
Confirm no unexpected shift/reduce or reduce/reduce conflicts are introduced.

### 2. Run Apex Corpus Tests
```cmd
cd d:\Git\tree-sitter-salesforce\apex
npx tree-sitter test
```
Verify that all tests in `declarations.txt` pass cleanly.

### 3. Parse Verification Snippets
Create `test_initializers.cls`:
```apex
public class ServiceManager {
    private static Map<String, Object> cache;
    private List<String> history;

    static {
        cache = new Map<String, Object>();
        System.debug('Static init executed');
    }

    {
        history = new List<String>();
    }

    public ServiceManager() {}
}
```
Create `test_trigger.trigger`:
```apex
trigger AccountTrigger on Account (before insert, after insert) {
    public static final String PREFIX = 'ACC-';
    
    private void enrich(Account acc) {
        acc.AccountNumber = PREFIX + acc.Name;
    }

    for (Account a : Trigger.new) {
        enrich(a);
    }
}
```
Run:
```cmd
npx tree-sitter parse test_initializers.cls --language apex/grammar.js
npx tree-sitter parse test_trigger.trigger --language apex/grammar.js
```
Confirm that neither file produces `(ERROR)` nodes.

---

## Success Criteria

| # | Criterion | Verification Method |
|---|---|---|
| 1 | `static { ... }` produces a `static_initializer` AST node with a `body` block | Corpus test: `declarations.txt` |
| 2 | Bare `{ ... }` in class body produces an `instance_initializer` AST node | Corpus test: `declarations.txt` |
| 3 | Methods and field declarations directly within `trigger_body` parse without errors | Corpus test: `declarations.txt` |
| 4 | Existing statement-only triggers continue to parse identically | Existing trigger corpus tests |
| 5 | Full Apex corpus test suite passes with 0 regressions | `npx tree-sitter test` in `apex/` |

---

## Regression Risk & API Contract Impact

- **Regression Risk**: Low. `static` as a modifier on methods/fields is distinguished by lookahead from `static {` (which is followed immediately by `{`).
- **API Contract Impact**:
  - Adds `static_initializer` and `instance_initializer` node types to `node-types.json`.
  - `trigger_body` children now include `field_declaration` and `method_declaration` nodes when present in the trigger source. Downstream AST walkers can now index trigger-local helper symbols.

---

## Documentation Updates Required

- [ ] `SALESFORCE_API.md`: Document support for static/instance initializer blocks and trigger helper declarations.
- [ ] `docs/03-understanding-apex.md`: Add example of static initialization and trigger helper member declarations.
- [ ] `CHANGELOG.md`: Record addition of `static_initializer`, `instance_initializer`, and trigger member support.
