# Step 23: SOQL Core Extensions — Formula Expressions in WHERE and ALL ROWS Clause

> **Agent Checkpoint — Read This First**
>
> **Status**: COMPLETE.
> **Prerequisites**: Step 11 is COMPLETE.
> - SOQL grammar is functional at `soql/grammar.js`.
> - All SOQL corpus tests pass.
>
> **Design Flag ℹ️**:
> This step introduces:
> 1. Summer '26 `FORMULA(...)` dynamic formula filtering in `WHERE` and `HAVING` clauses.
> 2. The `ALL ROWS` terminal clause to query soft-deleted and archived records.
> Both constructs are high-priority SOQL features; `ALL ROWS` must be placed at the end of the clause sequence in `soql_query_body`.

---

## Goal

Extend `soql/grammar.js` with:
1. The `FORMULA('expression')` function in `WHERE` conditions (Summer '26 SOQL feature).
2. The `ALL ROWS` clause at the end of SOQL queries.

---

## Background: Current State

1. **SOQL Dynamic Formula Filtering (`FORMULA(...)`)**:
   Salesforce API v67.0 / Summer '26 introduces dynamic formula evaluation directly inside SOQL query filters, for example:
   ```soql
   SELECT Id, Name FROM Contact WHERE FORMULA('Birthdate + 365') > TODAY
   ```
   Currently, `FORMULA(...)` is not defined as an aggregate or value function in `soql/grammar.js`, causing a syntax error when used in filtering conditions.

2. **Archived / Soft-Deleted Records (`ALL ROWS`)**:
   In standard SOQL, appending `ALL ROWS` to a query instructs the database to include soft-deleted records from the Recycle Bin as well as archived Task/Event activities:
   ```soql
   SELECT Id, IsDeleted FROM Opportunity WHERE IsDeleted = true ALL ROWS
   ```
   Currently, `soql_query_body` in [`soql/grammar.js`](file:///d:/Git/tree-sitter-salesforce/soql/grammar.js#L173-L185) ends with `update_clause` and has no rule for `ALL ROWS`.

---

## Technical Design

### 1. `formula_expression` (`soql/grammar.js`)
- **Where to look**: `_value_expression` and `_function_call` rules around lines 450–520.
- **What to touch**:
  - Define `formula_expression`:
    - Sequence of `ci("FORMULA")`, `"("`, `field("expression", choice($.string_literal, $._value_expression))`, `")"`.
  - Add `$.formula_expression` to `_value_expression` and `_condition_expression`.
  - This allows formula expressions to appear on the left or right side of comparison operators in `where_clause` and `having_clause`.

### 2. `all_rows_clause` (`soql/grammar.js`)
- **Where to look**: `soql_query_body` around lines 173–185.
- **What to touch**:
  - Define `all_rows_clause`:
    - Sequence: `seq(ci("ALL"), ci("ROWS"))`.
  - Add `optional(field("all_rows_clause", $.all_rows_clause))` to `soql_query_body` after `update_clause`.
  - Update `supertypes` or clause lists if needed.

---

## Affected Files

| File | Change Type | Description |
|---|---|---|
| `soql/grammar.js` | Modify | Add `formula_expression` and `all_rows_clause`, update `soql_query_body` and `_value_expression`. |
| `soql/test/corpus/where.txt` | Modify | Add test cases for `WHERE FORMULA(...)` conditions. |
| `soql/test/corpus/clauses.txt` | Modify | Add test cases for queries terminating in `ALL ROWS`. |

---

## Sub-Tasks

### Sub-Task 23.1: Add `formula_expression` Rule
- In `soql/grammar.js`, define `formula_expression` accepting string literals or sub-expressions.
- Integrate into `_value_expression`.

### Sub-Task 23.2: Add `all_rows_clause` Rule
- In `soql/grammar.js`, define `all_rows_clause: ($) => seq(ci("ALL"), ci("ROWS"))`.
- Add `optional(field("all_rows_clause", $.all_rows_clause))` to `soql_query_body`.

### Sub-Task 23.3: Author Test Corpus Entries
- In `soql/test/corpus/where.txt`, add tests for:
  - `SELECT Id FROM Contact WHERE FORMULA('Birthdate + 365') > TODAY`
  - `SELECT Id FROM Account WHERE FORMULA('BillingState') = 'CA'`
- In `soql/test/corpus/clauses.txt`, add tests for:
  - `SELECT Id, Name FROM Account ALL ROWS`
  - `SELECT Id FROM Opportunity WHERE IsDeleted = true LIMIT 50 ALL ROWS`
  - `SELECT Id FROM Task WHERE IsArchived = true ALL ROWS`

---

## How to Test This Step

### 1. Regenerate SOQL Grammar
```cmd
cd d:\Git\tree-sitter-salesforce
npx tree-sitter generate --no-bindings soql/grammar.js
```
Verify zero conflict increases.

### 2. Run SOQL Corpus Tests
```cmd
cd d:\Git\tree-sitter-salesforce\soql
npx tree-sitter test
```
All SOQL tests must pass.

### 3. Parse Verification Queries
Create `test_soql_ext.soql`:
```soql
SELECT Id, Name, IsDeleted
FROM Opportunity
WHERE FORMULA('Amount * 1.1') > 50000
ORDER BY CloseDate DESC
LIMIT 100
ALL ROWS
```
Run:
```cmd
npx tree-sitter parse test_soql_ext.soql --language soql/grammar.js
```
Confirm the CST contains `formula_expression` under `where_clause` and `all_rows_clause` at the root query level.

---

## Success Criteria

| # | Criterion | Verification Method |
|---|---|---|
| 1 | `FORMULA('...')` in `WHERE` parses into a `formula_expression` AST node | Corpus test: `where.txt` |
| 2 | `ALL ROWS` at end of query parses into `all_rows_clause` | Corpus test: `clauses.txt` |
| 3 | Queries combining `WHERE`, `ORDER BY`, `LIMIT`, and `ALL ROWS` parse in valid order | Corpus test: `clauses.txt` |
| 4 | Full SOQL corpus passes with 0 regressions | `npx tree-sitter test` in `soql/` |

---

## Regression Risk & API Contract Impact

- **Regression Risk**: Low. `ALL ROWS` is an optional terminal clause at the very end of the query body. `FORMULA` is a specific function identifier within value expressions.
- **API Contract Impact**:
  - Adds `formula_expression` and `all_rows_clause` node types to `node-types.json`.

---

## Documentation Updates Required

- [x] `SALESFORCE_API.md`: Document Summer '26 `FORMULA(...)` SOQL expressions and `ALL ROWS` clause support.
- [x] `docs/04-understanding-soql.md`: Update SOQL Clauses section with `ALL ROWS` and dynamic formula filtering.
- [x] `CHANGELOG.md`: Record addition of SOQL `FORMULA(...)` and `ALL ROWS` support.
