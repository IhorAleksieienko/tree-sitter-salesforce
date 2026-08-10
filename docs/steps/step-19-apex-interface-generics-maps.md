# Step 19: Apex Critical Fixes — Interface Declarations, Generic Inheritance, and Map Literals

> **Agent Checkpoint — Read This First**
>
> **Status**: COMPLETE.
> **Prerequisites**: Steps 10–15 are COMPLETE.
> - Apex grammar is functional at `apex/grammar.js`.
> - Existing Apex corpus test suite passes.
>
> **Design Flag ⚠️ [P0 CRITICAL SYNTAX BUGS]**:
> This step fixes three critical syntax deficiencies that cause valid, standard Apex code to fail with `(ERROR)` nodes:
> 1. `interface_body` currently only allows `field_declaration`, blocking all interface method declarations and nested types.
> 2. `superclass`, `interfaces`, and `interface_declaration` extends clauses use `$.type_identifier`, blocking all generic type parameters (e.g., `Comparable<Account>`, `Batchable<sObject>`).
> 3. Map literal syntax (`'key' => 'val'`) is completely absent, causing parse failures on map initializations.

---

## Goal

Resolve the top three P0 syntax parity blockers in `apex/grammar.js`:
1. Enable interfaces to declare methods, constants, inner classes, interfaces, and enums.
2. Support generic type arguments in `extends` and `implements` inheritance clauses across classes and interfaces.
3. Add native map literal initializers (`key => value`) to the expression grammar.

---

## Background: Current State

1. **Interface Body Restriction**:
   In [`apex/grammar.js`](file:///d:/Git/tree-sitter-salesforce/apex/grammar.js#L299), `interface_body` is defined as:
   `interface_body: ($) => seq("{", repeat(choice($.field_declaration, ";")), "}")`.
   As a result, any method signature inside an interface (e.g., `void execute();`) fails to parse.

2. **Generic Inheritance Blocked**:
   In [`apex/grammar.js`](file:///d:/Git/tree-sitter-salesforce/apex/grammar.js#L214-L220), `superclass` and `interfaces` are defined as:
   `superclass: ($) => seq(ci("extends"), $.type_identifier)` and
   `interfaces: ($) => seq(ci("implements"), commaJoined1($.type_identifier))`.
   Similarly, line 295 restricts interface inheritance to `commaJoined1($.type_identifier)`. This prevents generic type arguments such as `implements Database.Batchable<sObject>`.

3. **Map Literal Initializer Absent**:
   The `=>` fat-arrow token is undefined in `apex/grammar.js`. Expressions like `new Map<String, Id>{'key' => acc.Id}` produce syntax errors because `new_expression` only handles standard argument lists and basic array initializers.

---

## Technical Design

### 1. Interface Body Structure (`apex/grammar.js`)
- **Where to look**: Rule `interface_body` around line 299.
- **What to touch**:
  - Replace the restricted choice with a comprehensive member choice list matching Apex specification:
    - `$.method_declaration` (specifically parameter signatures with trailing semicolon or empty body)
    - `$.field_declaration` (interface constant variables)
    - `$.class_declaration` (inner classes)
    - `$.interface_declaration` (inner interfaces)
    - `$.enum_declaration` (inner enums)
    - `";"` (empty statement separator)
  - Ensure that method declarations without a body (ending with `;`) parse cleanly as `method_declaration` nodes without requiring modifier adjustments.

### 2. Generic Inheritance Clauses (`apex/grammar.js`)
- **Where to look**: Rules `superclass`, `interfaces`, and `interface_declaration` around lines 214–220 and 295.
- **What to touch**:
  - In `superclass`, replace `$.type_identifier` with `$._type`.
  - In `interfaces`, replace `commaJoined1($.type_identifier)` with `commaJoined1($._type)`.
  - In `interface_declaration`, update the optional `extends` clause to use `commaJoined1($._type)`.
  - This allows `generic_type` nodes (e.g., `Batchable<sObject>`), `type_identifier` nodes, and `scoped_type_identifier` nodes (e.g., `Database.Batchable<sObject>`) to be used seamlessly in inheritance positions.

### 3. Map Literal Initializer Expressions (`apex/grammar.js`)
- **Where to look**: Rules `new_expression` and `_literal` / expressions around lines 450–520.
- **What to touch**:
  - Define a new rule `map_key_initializer`:
    - Sequence of `field("key", $.expression)`, string literal `"=>"`, and `field("value", $.expression)`.
  - Define a new rule `map_initializer`:
    - Enclosed in `"{"` and `"}"` containing `commaJoined($.map_key_initializer)` with optional trailing comma.
  - Update `new_expression` choices:
    - When `ci("new")` is followed by a type, allow an optional `$.map_initializer` alongside constructor arguments `$.argument_list` and `$.array_initializer`.
  - Ensure precedence between map initializers, set initializers (`{elem1, elem2}`), and block statements is disambiguated by requiring the leading `new <Type>` constructor context.

---

## Affected Files

| File | Change Type | Description |
|---|---|---|
| `apex/grammar.js` | Modify | Update `interface_body`, `superclass`, `interfaces`, `interface_declaration`, and add `map_key_initializer` / `map_initializer` to `new_expression`. |
| `apex/test/corpus/declarations.txt` | Modify | Add interface method/type declarations and generic class/interface inheritance test cases. |
| `apex/test/corpus/expressions.txt` | Modify | Add map literal instantiation test cases. |

---

## Sub-Tasks

### Sub-Task 19.1: Expand Interface Body Declarations
- Locate `interface_body` in `apex/grammar.js`.
- Add `$.method_declaration`, `$.class_declaration`, `$.interface_declaration`, and `$.enum_declaration` to the allowed children.
- Verify abstract method declarations ending in `;` parse without errors.

### Sub-Task 19.2: Enable Generic Inheritance Types
- Locate `superclass` and `interfaces` in `apex/grammar.js`.
- Replace `$.type_identifier` with `$._type`.
- Locate `interface_declaration` and ensure its `extends` clause uses `commaJoined1($._type)`.

### Sub-Task 19.3: Add Map Literal Syntax
- Define `map_key_initializer` as `seq(field("key", $.expression), "=>", field("value", $.expression))`.
- Define `map_initializer` as `seq("{", optional(seq(commaJoined($.map_key_initializer), optional(","))), "}")`.
- Update `new_expression` to include `field("initializer", $.map_initializer)`.

### Sub-Task 19.4: Author Test Corpus Entries
- In `apex/test/corpus/declarations.txt`, add tests for:
  - Interface containing methods with various return types and parameters.
  - Interface containing constant fields and inner enums.
  - Class extending generic superclass `BaseService<Account>`.
  - Class implementing multiple generic interfaces `Database.Batchable<sObject>`, `Database.Stateful`.
  - Interface extending another generic interface `GenericRepo<Contact>`.
- In `apex/test/corpus/expressions.txt`, add tests for:
  - Empty map literal: `new Map<String, Object>{}`.
  - Populated map literal: `new Map<Id, String>{ acc.Id => 'Active', contact.Id => 'Inactive' }`.
  - Map literal with trailing comma.

---

## How to Test This Step

### 1. Regenerate Apex Grammar
```cmd
cd d:\Git\tree-sitter-salesforce
npx tree-sitter generate --no-bindings apex/grammar.js
```
Verify compilation finishes cleanly with zero unexpected conflict increases.

### 2. Run Apex Corpus Tests
```cmd
cd d:\Git\tree-sitter-salesforce\apex
npx tree-sitter test
```
All existing tests plus new interface, generic inheritance, and map literal tests must pass with 0 failures.

### 3. Parse Real-World Verification Snippets
Create a temporary test file `test_p0.cls`:
```apex
public interface IProcessable<T> extends IBase<T> {
    void process(T record);
    Boolean isValid(T record);
}

public class AccountBatch implements Database.Batchable<sObject>, IProcessable<Account> {
    public void process(Account record) {
        Map<String, String> mapping = new Map<String, String>{
            'key1' => 'val1',
            'key2' => 'val2'
        };
    }
}
```
Run:
```cmd
npx tree-sitter parse test_p0.cls --language apex/grammar.js
```
Confirm no `(ERROR)` or `(MISSING)` nodes are produced in the parse tree.

---

## Success Criteria

| # | Criterion | Verification Method |
|---|---|---|
| 1 | Interface method signatures parse into `method_declaration` AST nodes | Corpus test: `declarations.txt` |
| 2 | Generic `implements` / `extends` parse with `generic_type` nodes under `superclass`/`interfaces` | Corpus test: `declarations.txt` |
| 3 | Map literal `new Map<K,V>{k => v}` produces `map_initializer` and `map_key_initializer` nodes | Corpus test: `expressions.txt` |
| 4 | Map key/value expressions expose named fields `key` and `value` | Parse tree node inspection |
| 5 | Trailing commas in map literals parse without error | Corpus test: `expressions.txt` |
| 6 | Zero regressions in full Apex corpus | `npx tree-sitter test` in `apex/` |

---

## Regression Risk & API Contract Impact

- **Regression Risk**: Low. `_type` is already well-tested across field and variable declarations. Expanding `superclass` and `interfaces` to `_type` is strictly a widening change.
- **API Contract Impact**:
  - Introduces `map_initializer` and `map_key_initializer` node types.
  - `superclass` and `interfaces` child nodes may now contain `generic_type` or `scoped_type_identifier` in addition to `type_identifier`.
  - Downstream consumers (e.g. `sf-rag-engine` AST extractors) gain the ability to extract type arguments from `implements` clauses for deeper dependency resolution.

---

## Documentation Updates Required

- [x] `SALESFORCE_API.md`: Document support for generic interface inheritance and Map literal initialization.
- [x] `docs/03-understanding-apex.md`: Update Declarations section with interface members and generic `implements`/`extends` examples; update Expressions section with Map literal syntax.
- [x] `CHANGELOG.md`: Record P0 grammar fixes for interfaces, generics in inheritance, and map literals.
