# Step 24: SOQL Advanced Clauses — `USING LOOKUP BIND`, `RecordVisibilityContext`, and Time Literals

> **Agent Checkpoint — Read This First**
>
> **Status**: NOT STARTED.
> **Prerequisites**: Step 23 is COMPLETE.
> - SOQL grammar includes `FORMULA` and `ALL ROWS` support.
> - All corpus tests pass in `soql/`.
>
> **Design Flag ℹ️**:
> This step introduces:
> 1. `USING LOOKUP ... BIND` search filter variant in `using_clause`.
> 2. `WITH RecordVisibilityContext(...)` multi-parameter configuration in `with_clause`.
> 3. Time field literals (`HH:mm:ss.SSSZ`) and the `convertTimezone(...)` date function.
> Ensure that `USING SCOPE` continues to parse alongside `USING LOOKUP`.

---

## Goal

Add advanced SOQL filtering, security configuration, and temporal data types in `soql/grammar.js`:
1. Support `USING LOOKUP fieldName IN ('val1', 'val2') BIND fieldName = :expr`.
2. Support `WITH RecordVisibilityContext(param = value, ...)`.
3. Support ISO time literals (`08:30:00.000Z`) and the `convertTimezone(field)` function.

---

## Background: Current State

1. **`USING` Clause Scope-Only**:
   In [`soql/grammar.js`](file:///d:/Git/tree-sitter-salesforce/soql/grammar.js#L285-L300), `using_clause` only supports `USING SCOPE Mine/Team/...`. The search filter lookup variant `USING LOOKUP ... BIND ...` is not implemented.

2. **`RecordVisibilityContext` in `WITH`**:
   In [`soql/grammar.js`](file:///d:/Git/tree-sitter-salesforce/soql/grammar.js), `soql_with_clause` supports `USER_MODE`, `SYSTEM_MODE`, `SECURITY_ENFORCED`, and `DATA CATEGORY`, but does not support `RecordVisibilityContext(key=value)`.

3. **Time Literals and Timezone Conversion**:
   Salesforce Time fields are queried using time literals (e.g. `WHERE ShiftStart = 09:00:00.000Z`). Queries on Datetime fields in different timezones also use `convertTimezone(CreatedDate)`. Currently, neither time literals nor `convertTimezone` are parsed as specialized date/time nodes.

---

## Technical Design

### 1. `USING LOOKUP ... BIND` (`soql/grammar.js`)
- **Where to look**: `using_clause` around line 285.
- **What to touch**:
  - Define `using_lookup_clause`:
    - Sequence: `ci("LOOKUP")`, `field("field", $.identifier)`, `ci("IN")`, `"("`, `commaJoined1($.string_literal)`, `")"`, `ci("BIND")`, `field("target", $.identifier)`, `"="`, `choice($.bind_variable, $._value_expression)`.
  - Update `using_clause`:
    - `using_clause: ($) => seq(ci("USING"), choice($.using_scope_clause, $.using_lookup_clause))`.

### 2. `RecordVisibilityContext` (`soql/grammar.js`)
- **Where to look**: `soql_with_clause` around line 417.
- **What to touch**:
  - Define `record_visibility_parameter`:
    - Sequence: `field("key", $.identifier)`, `"="`, `field("value", choice($.integer, $.string_literal, $.boolean))`.
  - Define `record_visibility_context_clause`:
    - Sequence: `ci("RecordVisibilityContext"), "(", commaJoined1($.record_visibility_parameter), ")"`.
  - Add `$.record_visibility_context_clause` to `_with_clause_choice`.

### 3. Time Literals & `convertTimezone` (`soql/grammar.js`)
- **Where to look**: `_literal` and date function rules around lines 600–650.
- **What to touch**:
  - Define `time_literal`:
    - Token regex: `token(/[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{3})?([zZ]|[+-][0-9]{2}:[0-9]{2})?/)`.
  - Define `convert_timezone_call`:
    - Sequence: `ci("convertTimezone"), "(", field("field", $.identifier), ")"`.
  - Add `$.time_literal` to `_literal` and `$.convert_timezone_call` to `_date_function_call` / `_value_expression`.

---

## Affected Files

| File | Change Type | Description |
|---|---|---|
| `soql/grammar.js` | Modify | Add `using_lookup_clause`, `record_visibility_context_clause`, `time_literal`, and `convert_timezone_call`. |
| `soql/test/corpus/clauses.txt` | Modify | Add tests for `USING LOOKUP` and `WITH RecordVisibilityContext`. |
| `soql/test/corpus/expressions.txt` | Modify | Add tests for Time literals and `convertTimezone` functions. |

---

## Sub-Tasks

### Sub-Task 24.1: Expand `using_clause`
- In `soql/grammar.js`, add `using_lookup_clause`.
- Update `using_clause` to choose between scope and lookup variants.

### Sub-Task 24.2: Add `RecordVisibilityContext` to `soql_with_clause`
- Define `record_visibility_parameter` and `record_visibility_context_clause`.
- Add to `soql_with_clause` choices.

### Sub-Task 24.3: Add Time Literals and `convertTimezone`
- Define `time_literal` token regex.
- Define `convert_timezone_call` function node.
- Wire into `_literal` and select/where expression rules.

### Sub-Task 24.4: Author Test Corpus Entries
- In `soql/test/corpus/clauses.txt`, add:
  - `SELECT Id FROM ServiceApp USING LOOKUP AppId IN ('v1', 'v2') BIND AppId = :boundVar`
  - `SELECT Id FROM Contact WITH RecordVisibilityContext(maxDescribeValueLength=100)`
- In `soql/test/corpus/expressions.txt`, add:
  - `SELECT Id, convertTimezone(CreatedDate) FROM Lead WHERE StartTime > 08:30:00.000Z`

---

## How to Test This Step

### 1. Regenerate SOQL Grammar
```cmd
cd d:\Git\tree-sitter-salesforce
npx tree-sitter generate --no-bindings soql/grammar.js
```
Verify zero conflict errors.

### 2. Run SOQL Corpus Tests
```cmd
cd d:\Git\tree-sitter-salesforce\soql
npx tree-sitter test
```
All tests must pass.

### 3. Parse Verification Query
Create `test_soql_adv.soql`:
```soql
SELECT Id, Name, convertTimezone(CreatedDate)
FROM ShiftSchedule
USING LOOKUP ShiftId IN ('S1', 'S2') BIND ShiftId = :targetShift
WHERE StartTime >= 08:00:00.000Z
WITH RecordVisibilityContext(maxDescribeValueLength=20)
```
Run:
```cmd
npx tree-sitter parse test_soql_adv.soql --language soql/grammar.js
```
Confirm all nodes parse without `(ERROR)`.

---

## Success Criteria

| # | Criterion | Verification Method |
|---|---|---|
| 1 | `USING LOOKUP ... BIND` parses into `using_lookup_clause` | Corpus test: `clauses.txt` |
| 2 | `WITH RecordVisibilityContext(...)` parses into `record_visibility_context_clause` | Corpus test: `clauses.txt` |
| 3 | Time literals (`08:00:00.000Z`) parse into `time_literal` | Corpus test: `expressions.txt` |
| 4 | `convertTimezone(...)` parses into `convert_timezone_call` | Corpus test: `expressions.txt` |
| 5 | Zero regressions across all SOQL corpus tests | `npx tree-sitter test` in `soql/` |

---

## Regression Risk & API Contract Impact

- **Regression Risk**: Low. Time literals have distinct colon delimiters (`08:30:00`), and lookup/visibility clauses use dedicated keywords.
- **API Contract Impact**:
  - Adds `using_lookup_clause`, `record_visibility_context_clause`, `time_literal`, and `convert_timezone_call` node types.

---

## Documentation Updates Required

- [ ] `SALESFORCE_API.md`: Document support for `USING LOOKUP`, `WITH RecordVisibilityContext`, and Time literals.
- [ ] `docs/04-understanding-soql.md`: Update Clauses and Date Functions sections with time literals and lookup scoping.
- [ ] `CHANGELOG.md`: Record addition of SOQL `USING LOOKUP`, `RecordVisibilityContext`, and Time literals.
