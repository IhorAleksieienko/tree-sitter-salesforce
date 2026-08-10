# Step 25: SOSL Syntax & Clauses — Brace Delimiters, Modern `WITH` Clauses, and Return Projections

> **Agent Checkpoint — Read This First**
>
> **Status**: COMPLETE.
> **Prerequisites**: Step 12 is COMPLETE.
> - SOSL grammar is functional at `sosl/grammar.js`.
> - All SOSL corpus tests pass.
>
> **Design Flag ℹ️**:
> This step introduces:
> 1. Standalone SOSL curly brace search delimiters (`FIND {Acme*}`).
> 2. Modern `WITH` clauses: `USER_MODE`, `SYSTEM_MODE`, `METADATA`, parameterized `NETWORK IN (...)`, `SNIPPET (TARGET_LENGTH = n)`, and `:bindVariable` on `DIVISION`.
> 3. Field projection functions in `RETURNING` clauses: `toLabel(field)`, `convertCurrency(field)`, and `FORMAT(field)`.
> Ensure that `{search_term}` delimiters do not conflict with code block braces when embedded in Apex or tooling.

---

## Goal

Bring `sosl/grammar.js` up to full parity with Salesforce platform search specifications:
1. Support curly brace search term syntax: `FIND {Universal Containers*}`.
2. Support modern security, metadata, network, snippet, and bind-variable `WITH` clauses.
3. Support projection functions (`toLabel`, `convertCurrency`, `FORMAT`) in `RETURNING` field lists.

---

## Background: Current State

1. **Search Term Delimiters**:
   In [`sosl/grammar.js`](file:///d:/Git/tree-sitter-salesforce/sosl/grammar.js#L69-L78), `_search_term` only accepts `$.sosl_string` (single-quoted strings `'...'`) and `$.bind_variable` (`:term`). In standard Salesforce search (and developer console SOSL), search terms are typically enclosed in curly braces (`FIND {Acme OR Tech}`). Currently, brace syntax causes a parse failure.

2. **`WITH` Clause Gaps**:
   In [`sosl/grammar.js`](file:///d:/Git/tree-sitter-salesforce/sosl/grammar.js#L179), `with_clause` supports basic forms (`highlight`, `snippet`, `division = 'str'`), but is missing:
   - `WITH USER_MODE` / `WITH SYSTEM_MODE` (Salesforce security modes)
   - `WITH METADATA = '...'`
   - `WITH NETWORK IN ('Net1', 'Net2')` (list form)
   - `WITH SNIPPET (TARGET_LENGTH = 150)` (parameterized snippet length)
   - `WITH DIVISION = :bindVar` (bind variable on division)

3. **`RETURNING` Clause Projections**:
   In [`sosl/grammar.js`](file:///d:/Git/tree-sitter-salesforce/sosl/grammar.js#L98), `returning_clause` only allows plain `$.field_path`. Projections like `RETURNING Account(toLabel(Type), convertCurrency(AnnualRevenue))` fail to parse.

---

## Technical Design

### 1. Curly Brace Search Terms (`sosl/grammar.js`)
- **Where to look**: `_search_term` and `sosl_string` around lines 69–78.
- **What to touch**:
  - Define `sosl_brace_string`:
    - Token regex: `token(seq("{", repeat(/[^}]/), "}"))`.
  - Update `_search_term`:
    - `_search_term: ($) => choice($.sosl_string, $.sosl_brace_string, $.bind_variable)`.

### 2. Modern SOSL `WITH` Clause Expansions (`sosl/grammar.js`)
- **Where to look**: `with_clause` and sub-rules around lines 179–210.
- **What to touch**:
  - Add `with_security_clause`: `choice(ci("USER_MODE"), ci("SYSTEM_MODE"))`.
  - Add `with_metadata_clause`: `seq(ci("METADATA"), "=", choice($.sosl_string, $.bind_variable))`.
  - Add `with_network_clause`: `seq(ci("NETWORK"), choice(seq("=", choice($.sosl_string, $.bind_variable)), seq(ci("IN"), "(", commaJoined1(choice($.sosl_string, $.bind_variable)), ")")))`.
  - Add `with_snippet_clause`: `seq(ci("SNIPPET"), optional(seq("(", ci("TARGET_LENGTH"), "=", $.integer, ")")))`.
  - Update `with_division_clause` to accept `:bind_variable` as well as string literals.
  - Wire all new variants into `with_clause`.

### 3. Projections in `RETURNING` (`sosl/grammar.js`)
- **Where to look**: `returning_clause` around line 98.
- **What to touch**:
  - Define `projection_function_call`:
    - Sequence of `choice(ci("toLabel"), ci("convertCurrency"), ci("FORMAT"))`, `"("`, `field("field", $.field_path)`, `")"`.
  - Define `_returning_field`:
    - `choice($.field_path, $.projection_function_call)`.
  - Update `returning_clause` to use `commaJoined1($._returning_field)`.

---

## Affected Files

| File | Change Type | Description |
|---|---|---|
| `sosl/grammar.js` | Modify | Add `sosl_brace_string`, expand `with_clause` variants, and add `projection_function_call` to `returning_clause`. |
| `sosl/test/corpus/find.txt` | Modify | Add tests for `{brace}` search terms. |
| `sosl/test/corpus/with.txt` | Modify | Add tests for `WITH USER_MODE`, `WITH METADATA`, `WITH NETWORK IN`, and `WITH SNIPPET (TARGET_LENGTH=n)`. |
| `sosl/test/corpus/returning.txt` | Modify | Add tests for `toLabel()`, `convertCurrency()`, and `FORMAT()` in `RETURNING`. |

---

## Sub-Tasks

### Sub-Task 25.1: Add `sosl_brace_string` Rule
- In `sosl/grammar.js`, define `sosl_brace_string: ($) => token(seq("{", repeat(/[^}]/), "}"))`.
- Add to `_search_term`.

### Sub-Task 25.2: Expand `with_clause` Rules
- Implement `with_security_clause`, `with_metadata_clause`, list-based `with_network_clause`, parameterized `with_snippet_clause`, and bind-variable division.
- Add all to `with_clause` choices.

### Sub-Task 25.3: Add Projection Functions to `RETURNING`
- Define `projection_function_call` for `toLabel`, `convertCurrency`, `FORMAT`.
- Update `returning_clause` fields sequence.

### Sub-Task 25.4: Author Test Corpus Entries
- In `sosl/test/corpus/find.txt`, add:
  - `FIND {Universal Containers}`
  - `FIND {Acme* OR "Tech Corp"}`
- In `sosl/test/corpus/with.txt`, add:
  - `FIND 'Acme' WITH USER_MODE`
  - `FIND 'Acme' WITH METADATA = 'CustomSearch'`
  - `FIND 'Acme' WITH NETWORK IN ('Net1', 'Net2')`
  - `FIND 'Acme' WITH SNIPPET (TARGET_LENGTH = 200)`
  - `FIND 'Acme' WITH DIVISION = :divVar`
- In `sosl/test/corpus/returning.txt`, add:
  - `FIND 'Acme' RETURNING Account(Id, toLabel(Type), convertCurrency(AnnualRevenue), FORMAT(CreatedDate))`

---

## How to Test This Step

### 1. Regenerate SOSL Grammar
```cmd
cd d:\Git\tree-sitter-salesforce
npx tree-sitter generate --no-bindings sosl/grammar.js
```
Verify zero conflict errors.

### 2. Run SOSL Corpus Tests
```cmd
cd d:\Git\tree-sitter-salesforce\sosl
npx tree-sitter test
```
Verify all SOSL corpus tests pass.

### 3. Parse Verification SOSL Query
Create `test_sosl_adv.sosl`:
```sosl
FIND {Cloud Computing*}
IN ALL FIELDS
RETURNING Account(Id, Name, toLabel(Industry), convertCurrency(AnnualRevenue)),
          Contact(Id, FirstName, LastName, FORMAT(CreatedDate))
WITH USER_MODE
WITH NETWORK IN ('CommunityA', 'CommunityB')
WITH SNIPPET (TARGET_LENGTH = 120)
LIMIT 50
```
Run:
```cmd
npx tree-sitter parse test_sosl_adv.sosl --language sosl/grammar.js
```
Confirm all nodes parse without `(ERROR)`.

---

## Success Criteria

| # | Criterion | Verification Method |
|---|---|---|
| 1 | `FIND {term}` parses into `sosl_brace_string` | Corpus test: `find.txt` |
| 2 | `WITH USER_MODE` and `WITH SYSTEM_MODE` parse into `with_security_clause` | Corpus test: `with.txt` |
| 3 | `WITH NETWORK IN ('a', 'b')` parses with network list arguments | Corpus test: `with.txt` |
| 4 | `WITH SNIPPET (TARGET_LENGTH = n)` parses target length parameter | Corpus test: `with.txt` |
| 5 | `toLabel()`, `convertCurrency()`, `FORMAT()` parse into `projection_function_call` nodes | Corpus test: `returning.txt` |
| 6 | Zero regressions across all SOSL corpus tests | `npx tree-sitter test` in `sosl/` |

---

## Regression Risk & API Contract Impact

- **Regression Risk**: Low. Curly braces in SOSL are strictly delimited within the `FIND` search term position.
- **API Contract Impact**:
  - Adds `sosl_brace_string`, `projection_function_call`, and new `with_*` node types.

---

## Documentation Updates Required

- [x] `SALESFORCE_API.md`: Document SOSL brace syntax, modern `WITH` clauses, and projection functions.
- [x] `docs/11-understanding-sosl.md`: Update SOSL overview with `{term}`, `WITH USER_MODE`, and `RETURNING` projections.
- [x] `CHANGELOG.md`: Record addition of SOSL brace delimiters, modern `WITH` clauses, and return projections.

