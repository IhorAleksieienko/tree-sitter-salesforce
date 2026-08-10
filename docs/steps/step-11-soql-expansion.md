# Step 11: SOQL Grammar Expansion — Date Functions, Aggregate Extensions & Corpus Completion

> **Agent Checkpoint — Read This First**
>
> **Status**: COMPLETE.
> **Prerequisites**: Step 10 is COMPLETE.
> - `soql_expression` in `apex/grammar.js` uses balanced-bracket parsing (no ERROR nodes on subqueries).
> - `injections.scm` covers all four `Database.*` methods.
> - All existing Apex and SOQL corpus tests pass.
> - `soql/grammar.js` expanded with date functions, ROLLUP/CUBE, scalar functions, and WITH DATA CATEGORY.

---

## Goal

Expand `soql/grammar.js` to cover SOQL constructs that are documented in the
[ENTERPRISE_PARSER_BLUEPRINT.md](file:///d:/Git/tree-sitter-salesforce/docs/ENTERPRISE_PARSER_BLUEPRINT.md)
but are not yet implemented: SOQL date functions (`CALENDAR_MONTH()`, `FISCAL_YEAR()`, etc.),
`GROUP BY ROLLUP/CUBE`, scalar functions (`FORMAT()`, `convertCurrency()`), and ensure all
test corpus files reflect the complete API v67 feature matrix.

---

## Background: What Is Missing

The existing `soql/grammar.js` already handles the major SOQL clauses. The gaps are:

| Missing Construct | Where It Appears | Salesforce Docs Reference |
|---|---|---|
| `CALENDAR_MONTH(dateField)` | SELECT, GROUP BY | Date/Time functions |
| `FISCAL_YEAR(dateField)` | SELECT, GROUP BY | Date/Time functions |
| `DAY_ONLY(dateTimeField)` | SELECT, GROUP BY | Date/Time functions |
| `GROUP BY ROLLUP(field1, field2)` | GROUP BY clause | Aggregate queries |
| `GROUP BY CUBE(field1, field2)` | GROUP BY clause | Aggregate queries |
| `FORMAT(amount)` | SELECT clause | Number formatting |
| `convertCurrency(amount)` | SELECT clause | Multi-currency |
| `toLabel(picklist)` | SELECT clause | Localization |
| `GROUPING(field)` | SELECT clause | Rollup/Cube grouping |
| `WITH DATA CATEGORY ... AT ...` | WHERE-equivalent clause | Data category filtering |

---

## Affected Files

| File | Change Type | Description |
|---|---|---|
| `soql/grammar.js` | Modify | Add date functions, rollup/cube, scalar functions |
| `soql/test/corpus/aggregate_queries.txt` | New | `GROUP BY ROLLUP`, `CUBE`, `HAVING`, `GROUPING()` |
| `soql/test/corpus/security_clauses.txt` | New | `WITH USER_MODE`, `WITH SYSTEM_MODE`, `WITH DATA CATEGORY` |
| `soql/test/corpus/typeof_clauses.txt` | New | `TYPEOF` polymorphic queries |
| `soql/test/corpus/date_functions.txt` | New | All date/time function variants |
| `SALESFORCE_API.md` | Modify | Mark new features as ✅ |

---

## Sub-Task 11.1 — Date Functions in SELECT and GROUP BY

### File: `soql/grammar.js`

Locate the section that defines selectable field expressions. Find where aggregate functions
(`COUNT()`, `SUM()`, etc.) are defined. Add date functions alongside them:

```javascript
// Find the existing date_function or field_function node (or create one near aggregate_function).
// Add to the select item alternatives:

date_function: ($) => seq(
  field("name", $.date_function_name),
  "(",
  field("argument", $.field_identifier),
  ")"
),

date_function_name: ($) => choice(
  ci("CALENDAR_MONTH"),
  ci("CALENDAR_QUARTER"),
  ci("CALENDAR_YEAR"),
  ci("DAY_IN_MONTH"),
  ci("DAY_IN_WEEK"),
  ci("DAY_IN_YEAR"),
  ci("DAY_ONLY"),
  ci("FISCAL_MONTH"),
  ci("FISCAL_QUARTER"),
  ci("FISCAL_YEAR"),
  ci("HOUR_IN_DAY"),
  ci("WEEK_IN_MONTH"),
  ci("WEEK_IN_YEAR"),
),
```

Add `date_function` to both the `select_item` and `group_by_field` alternatives:

```javascript
// In select_item (wherever soql_field and aggregate_function are listed):
select_item: ($) => choice(
  $.soql_field,
  $.aggregate_function,
  $.date_function,       // NEW
  $.scalar_function,     // NEW — see 11.2
  $.subquery,
  $.typeof_expression,
),

// In group_by_clause, allow date functions as grouping keys:
group_by_field: ($) => choice(
  $.soql_field,
  $.date_function,       // NEW — e.g., GROUP BY CALENDAR_MONTH(CloseDate)
),
```

---

## Sub-Task 11.2 — Scalar Functions: FORMAT, convertCurrency, toLabel, GROUPING

### File: `soql/grammar.js`

Add scalar functions that wrap a field reference:

```javascript
scalar_function: ($) => seq(
  field("name", $.scalar_function_name),
  "(",
  field("argument", choice($.soql_field, $.aggregate_function)),
  ")"
),

scalar_function_name: ($) => choice(
  ci("FORMAT"),
  ci("convertCurrency"),
  ci("toLabel"),
  ci("GROUPING"),   // Used in GROUP BY ROLLUP/CUBE queries
),
```

---

## Sub-Task 11.3 — GROUP BY ROLLUP and GROUP BY CUBE

### File: `soql/grammar.js`

Locate the `group_by_clause` rule. Extend it to support the `ROLLUP` and `CUBE` variants:

```javascript
// ─── BEFORE ─────────────────────────────────────────────────────────────────
group_by_clause: ($) => seq(
  ci("group by"),
  commaJoined1($.group_by_field),
  optional($.having_clause)
),

// ─── AFTER ──────────────────────────────────────────────────────────────────
group_by_clause: ($) => seq(
  ci("group"),
  ci("by"),
  choice(
    seq(commaJoined1($.group_by_field), optional($.having_clause)),    // standard
    seq(ci("rollup"), "(", commaJoined1($.group_by_field), ")", optional($.having_clause)),
    seq(ci("cube"), "(", commaJoined1($.group_by_field), ")", optional($.having_clause)),
  )
),
```

> **Note**: `ROLLUP` and `CUBE` are keywords in this position only; they do not conflict
> with field names because tree-sitter uses context to disambiguate.

---

## Sub-Task 11.4 — WITH DATA CATEGORY Clause

### File: `soql/grammar.js`

The existing `with_clause` rule handles `WITH USER_MODE`, `WITH SYSTEM_MODE`,
`WITH SECURITY_ENFORCED`. Extend it to also cover `WITH DATA CATEGORY`:

```javascript
// Add to the with_clause alternatives:
with_clause: ($) => seq(
  ci("with"),
  choice(
    ci("user_mode"),
    ci("system_mode"),
    ci("security_enforced"),
    seq(ci("data"), ci("category"), commaJoined1($.data_category_filter))  // NEW
  )
),

data_category_filter: ($) => seq(
  field("group", $.identifier),
  field("operator", choice(ci("at"), ci("above"), ci("below"), ci("above_or_below"))),
  field("category", $.identifier)
),
```

---

## Sub-Task 11.5 — New Corpus Files

### File: `soql/test/corpus/aggregate_queries.txt`

```
====================================
GROUP BY with aggregate and HAVING
====================================
SELECT StageName, COUNT(Id) total FROM Opportunity GROUP BY StageName HAVING COUNT(Id) > 5
---
(source_file
  (soql_query_body
    (select_clause)
    (from_clause)
    (group_by_clause
      (having_clause))))

====================================
GROUP BY ROLLUP
====================================
SELECT StageName, LeadSource, COUNT(Id) FROM Opportunity GROUP BY ROLLUP(StageName, LeadSource)
---
(source_file
  (soql_query_body
    (select_clause)
    (from_clause)
    (group_by_clause)))

====================================
GROUP BY CUBE
====================================
SELECT StageName, LeadSource, SUM(Amount) FROM Opportunity GROUP BY CUBE(StageName, LeadSource)
---
(source_file
  (soql_query_body
    (select_clause)
    (from_clause)
    (group_by_clause)))

====================================
GROUPING() scalar function in SELECT
====================================
SELECT Name, GROUPING(StageName) grp FROM Opportunity GROUP BY ROLLUP(Name, StageName)
---
(source_file
  (soql_query_body
    (select_clause)
    (from_clause)
    (group_by_clause)))
```

### File: `soql/test/corpus/date_functions.txt`

```
====================================
CALENDAR_MONTH in GROUP BY
====================================
SELECT CALENDAR_MONTH(CloseDate) cm, SUM(Amount) FROM Opportunity GROUP BY CALENDAR_MONTH(CloseDate)
---
(source_file
  (soql_query_body
    (select_clause)
    (from_clause)
    (group_by_clause)))

====================================
DAY_ONLY in SELECT
====================================
SELECT DAY_ONLY(CreatedDate) FROM Account
---
(source_file
  (soql_query_body
    (select_clause)
    (from_clause)))

====================================
FISCAL_YEAR in GROUP BY
====================================
SELECT FISCAL_YEAR(CloseDate), SUM(Amount) FROM Opportunity GROUP BY FISCAL_YEAR(CloseDate)
---
(source_file
  (soql_query_body
    (select_clause)
    (from_clause)
    (group_by_clause)))
```

### File: `soql/test/corpus/security_clauses.txt`

```
====================================
WITH USER_MODE
====================================
SELECT Id FROM Account WITH USER_MODE
---
(source_file
  (soql_query_body
    (select_clause)
    (from_clause)
    (with_clause)))

====================================
WITH SYSTEM_MODE
====================================
SELECT Id FROM Account WITH SYSTEM_MODE
---
(source_file
  (soql_query_body
    (select_clause)
    (from_clause)
    (with_clause)))

====================================
WITH DATA CATEGORY AT
====================================
SELECT Id FROM KnowledgeArticleVersion WITH DATA CATEGORY Geography__c AT USA__c
---
(source_file
  (soql_query_body
    (select_clause)
    (from_clause)
    (with_clause
      (data_category_filter))))
```

### File: `soql/test/corpus/typeof_clauses.txt`

```
====================================
TYPEOF with WHEN and ELSE
====================================
SELECT TYPEOF Owner WHEN User THEN Name, Email WHEN Group THEN Name ELSE Id END FROM Case
---
(source_file
  (soql_query_body
    (select_clause
      (typeof_expression))
    (from_clause)))
```

---

## How to Test This Step

### 1. Generate the SOQL grammar

```cmd
cd d:\Git\tree-sitter-salesforce
npx tree-sitter generate --no-bindings soql\grammar.js
```

### 2. Run the full SOQL corpus

```cmd
cd d:\Git\tree-sitter-salesforce\soql
npx tree-sitter test
```

All 6 existing corpus files plus the 4 new ones must pass. Zero ERROR or MISSING nodes.

### 3. Run the Apex corpus (regression check)

The SOQL grammar is injected into Apex. Regenerating it must not break Apex injection:

```cmd
cd d:\Git\tree-sitter-salesforce\apex
npx tree-sitter test
```

### 4. Manual parse spot check

Create `test_rollup.soql`:
```soql
SELECT StageName, COUNT(Id) total
FROM Opportunity
GROUP BY ROLLUP(StageName, LeadSource)
HAVING COUNT(Id) > 5
```

```cmd
npx tree-sitter parse test_rollup.soql --language soql\grammar.js
```

Inspect the tree. `group_by_clause` must be present with no ERROR child.

---

## Success Criteria

| # | Criterion | How to Verify |
|---|---|---|
| 1 | All existing SOQL corpus tests continue to pass | `npx tree-sitter test` in `soql/` |
| 2 | `GROUP BY ROLLUP(...)` parses without errors | Spot-check + corpus test |
| 3 | `GROUP BY CUBE(...)` parses without errors | Spot-check + corpus test |
| 4 | `CALENDAR_MONTH(field)` is valid in SELECT and GROUP BY | Corpus test in `date_functions.txt` |
| 5 | `WITH DATA CATEGORY group AT category` parses | Corpus test in `security_clauses.txt` |
| 6 | `TYPEOF ... WHEN ... THEN ... ELSE ... END` parses | Corpus test in `typeof_clauses.txt` |
| 7 | `FORMAT(field)` and `convertCurrency(field)` parse in SELECT | Corpus test |
| 8 | Zero Apex corpus regressions | `npx tree-sitter test` in `apex/` |

---

## Regression Risk

**Low.** All changes are additive — new alternatives are added to existing `choice()` rules.
The main risk is accidentally introducing a grammar conflict if a new keyword (`ROLLUP`,
`CUBE`) collides with an identifier rule. Tree-sitter will report conflicts during
`generate`. If conflicts appear: wrap the keyword in `token(ci(...))` instead of `ci()`
to give it higher priority over the identifier rule.

---

## API Contract Impact

**Additive only.** New node types (`date_function`, `scalar_function`, `data_category_filter`)
are added to `node-types.json`. No existing node types are renamed or removed. Consumers
of the SOQL parser who do not query these new node types are unaffected.

---

## Documentation Updates Required After Completion

- [x] `SALESFORCE_API.md` — mark all new SOQL features as ✅
- [x] `docs/04-understanding-soql.md` — add section on date functions and aggregate extensions
- [x] `CHANGELOG.md` — add entry for SOQL grammar expansion
- [x] `README.md` parser status table — update SOQL row
