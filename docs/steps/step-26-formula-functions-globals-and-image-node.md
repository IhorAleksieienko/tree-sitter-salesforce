# Step 26: Formula Language Enhancements — Geo/Date Functions, Global Contexts, IMAGE Node, and Scientific Decimals

> **Agent Checkpoint — Read This First**
>
> **Status**: COMPLETE.
> **Prerequisites**: Step 15 is COMPLETE.
> - Formula grammar is functional at `formula/grammar.js`.
> - All Formula corpus tests pass.
>
> **Design Flag ℹ️**:
> This step introduces:
> 1. Missing Geo-formula functions (`GEOLOCATION`, `DISTANCE`) and Date/Time functions (`TIMENOW`, `ISOWEEK`, `ISOYEAR`, `UNIXTIMESTAMP`).
> 2. Enumerated validation and contextual AST modeling for global `$` namespaces (`$User`, `$Profile`, `$RecordType`, `$Setup`, `$Permission`, `$CustomMetadata`).
> 3. Dedicated `image_expression` AST node with named fields (`image_url`, `alt_text`, `height`, `width`).
> 4. Scientific notation numeric literals (`1.2e-5`, `3.0E+8`).

---

## Goal

Bring the Salesforce Formula Language parser up to full parity with standard platform declarative capabilities:
1. Add `GEOLOCATION`, `DISTANCE`, `TIMENOW`, `ISOWEEK`, `ISOYEAR`, and `UNIXTIMESTAMP` to `function_name`.
2. Model global context prefixes (`$RecordType`, `$Setup`, etc.) explicitly in `global_variable`.
3. Provide a dedicated `image_expression` node for `IMAGE(...)` function calls.
4. Support scientific notation in the `number` literal regex.

---

## Background: Current State

1. **Geo and Date/Time Functions Missing**:
   In [`formula/grammar.js`](file:///d:/Git/tree-sitter-salesforce/formula/grammar.js#L90-L150), `function_name` lists standard functions but omits geo-spatial functions (`GEOLOCATION`, `DISTANCE`) and newer temporal functions (`TIMENOW`, `ISOWEEK`, `ISOYEAR`, `UNIXTIMESTAMP`). Using these causes generic function matching or syntax failure.

2. **Global Variable Structure Un-enumerated**:
   In [`formula/grammar.js`](file:///d:/Git/tree-sitter-salesforce/formula/grammar.js#L177), `global_variable` is defined as a generic regex matching `$` followed by an identifier chain. It lacks structured sub-nodes indicating the global namespace (e.g. `RecordType`, `Setup`, `Permission`), hindering downstream schema validation and static analysis.

3. **`IMAGE()` Lacks Structured Fields**:
   `IMAGE` is treated as a generic `function_call`. However, formulas frequently use `IMAGE(url, alt, height, width)` to render dynamic badges. Downstream tooling (such as UI preview engines and linters) requires structured access to the image source and dimensions.

4. **Scientific Notation in Numbers**:
   In [`formula/grammar.js`](file:///d:/Git/tree-sitter-salesforce/formula/grammar.js#L190), `number` is defined as `/[0-9]+(\.[0-9]+)?/`. Scientific numbers like `1.2e-5` fail to parse as a single numeric literal.

---

## Technical Design

### 1. Function Name Whitelist Expansion (`formula/grammar.js`)
- **Where to look**: `function_name` around line 90.
- **What to touch**:
  - Add geo functions: `ci("GEOLOCATION")`, `ci("DISTANCE")`.
  - Add date/time functions: `ci("TIMENOW")`, `ci("ISOWEEK")`, `ci("ISOYEAR")`, `ci("UNIXTIMESTAMP")`.

### 2. Global Variable Context (`formula/grammar.js`)
- **Where to look**: `global_variable` around line 177.
- **What to touch**:
  - Define `global_context`:
    - Choice of: `ci("User")`, `ci("Profile")`, `ci("Organization")`, `ci("RecordType")`, `ci("Setup")`, `ci("Permission")`, `ci("CustomMetadata")`, `ci("System")`, `ci("Label")`, `ci("Api")`, `ci("Page")`, `ci("Action")`, `$.identifier`.
  - Define `global_variable`:
    - Sequence: `"$"`, `field("context", $.global_context)`, `repeat(seq(".", field("field", $.identifier)))`.

### 3. Dedicated `image_expression` Node (`formula/grammar.js`)
- **Where to look**: `_expression` choices and function call rules around lines 65–85.
- **What to touch**:
  - Define `image_expression`:
    - Sequence: `ci("IMAGE")`, `"("`, `field("image_url", $._expression)`, `","`, `field("alt_text", $._expression)`, `optional(seq(",", field("height", $._expression), optional(seq(",", field("width", $._expression)))))`, `")"`.
  - Add `$.image_expression` to `_expression` before generic `$.function_call`.

### 4. Scientific Notation in Number Regex (`formula/grammar.js`)
- **Where to look**: `number` rule around line 190.
- **What to touch**:
  - Update regex to: `token(/[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?/)`.

---

## Affected Files

| File | Change Type | Description |
|---|---|---|
| `formula/grammar.js` | Modify | Expand `function_name`, update `global_variable` with `global_context`, add `image_expression`, and update `number` regex. |
| `formula/test/corpus/functions.txt` | Modify | Add tests for `GEOLOCATION`, `DISTANCE`, `TIMENOW`, `ISOWEEK`, and `IMAGE`. |
| `formula/test/corpus/globals.txt` | Modify | Add tests for `$RecordType.Name`, `$Setup.Config__c.Key__c`, `$Permission.ManageUsers`. |
| `formula/test/corpus/literals.txt` | Modify | Add tests for scientific notation numbers. |

---

## Sub-Tasks

### Sub-Task 26.1: Add Missing Functions
- Extend `function_name` in `formula/grammar.js` with `GEOLOCATION`, `DISTANCE`, `TIMENOW`, `ISOWEEK`, `ISOYEAR`, `UNIXTIMESTAMP`.

### Sub-Task 26.2: Add Structured Global Variable Contexts
- Define `global_context` and update `global_variable` to expose named `context` and `field` nodes.

### Sub-Task 26.3: Add Dedicated `image_expression`
- Define `image_expression` with `image_url`, `alt_text`, `height`, and `width` fields.
- Integrate into `_expression`.

### Sub-Task 26.4: Update Number Regex for Scientific Notation
- Modify `number` rule to accept exponent `[eE][+-]?[0-9]+`.

### Sub-Task 26.5: Author Test Corpus Entries
- In `formula/test/corpus/functions.txt`, add:
  - `DISTANCE(GEOLOCATION(37.7749, -122.4194), Location__c, 'km')`
  - `TIMENOW() + 3600`
  - `IMAGE('/img/status.png', 'Status OK', 20, 20)`
- In `formula/test/corpus/globals.txt`, add:
  - `$RecordType.DeveloperName = 'Enterprise_Account'`
  - `$Setup.FeatureToggle__c.EnableBeta__c`
  - `$Permission.ViewAllData`
- In `formula/test/corpus/literals.txt`, add:
  - `1.2e-5`, `4.56E+12`

---

## How to Test This Step

### 1. Regenerate Formula Grammar
```cmd
cd d:\Git\tree-sitter-salesforce
npx tree-sitter generate --no-bindings formula/grammar.js
```
Verify zero conflicts.

### 2. Run Formula Corpus Tests
```cmd
cd d:\Git\tree-sitter-salesforce\formula
npx tree-sitter test
```
Verify all tests pass.

### 3. Parse Verification Formulas
Create `test_formula_adv.formula`:
```formula
IF(
    DISTANCE(GEOLOCATION(BillingLatitude, BillingLongitude), GEOLOCATION(37.77, -122.42), 'mi') < 10.5,
    IMAGE('/img/near.png', 'Nearby Customer', 16, 16),
    IMAGE('/img/far.png', 'Distant Customer')
) && ($Setup.AppConfig__c.Threshold__c > 1.25e-3)
```
Run:
```cmd
npx tree-sitter parse test_formula_adv.formula --language formula/grammar.js
```
Confirm zero `(ERROR)` nodes.

---

## Success Criteria

| # | Criterion | Verification Method |
|---|---|---|
| 1 | `GEOLOCATION` and `DISTANCE` parse into `function_call` nodes | Corpus test: `functions.txt` |
| 2 | `TIMENOW`, `ISOWEEK`, `ISOYEAR`, `UNIXTIMESTAMP` parse into `function_call` nodes | Corpus test: `functions.txt` |
| 3 | `$RecordType.Name` and `$Setup.Config__c` expose `context` and `field` AST nodes | Corpus test: `globals.txt` |
| 4 | `IMAGE(url, alt, h, w)` parses into `image_expression` with named fields | Corpus test: `functions.txt` |
| 5 | `1.2e-5` parses as a single `number` node | Corpus test: `literals.txt` |
| 6 | Zero regressions across all Formula corpus tests | `npx tree-sitter test` in `formula/` |

---

## Regression Risk & API Contract Impact

- **Regression Risk**: Low. `image_expression` matches before generic `function_call` when the identifier is `IMAGE`.
- **API Contract Impact**:
  - Adds `image_expression` and `global_context` node types to `node-types.json`.

---

## Documentation Updates Required

- [x] `SALESFORCE_API.md`: Document Formula geo functions, date/time functions, global namespaces, and `IMAGE` node.
- [x] `docs/12-understanding-formula.md`: Update function reference and global variable sections.
- [x] `CHANGELOG.md`: Record addition of Formula geo/date functions, structured global contexts, and `image_expression`.
