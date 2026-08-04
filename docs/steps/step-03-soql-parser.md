# Step 3: SOQL Parser

> **Agent Handoff Context**: Steps 1-2 are COMPLETE.
> - Project skeleton exists at `d:\Git\tree-sitter-salesforce\`
> - `common/common.js` provides: `ci()`, `commaJoined()`, `commaJoined1()`, `joined()`, `optionalSeq()`
> - `common/salesforce-types.js` provides: SOQL date literals, aggregate functions, etc.
> - Placeholder grammars exist and `tree-sitter generate` works for both apex/ and soql/

## Context

We build the **SOQL parser first** because:
1. SOQL is simpler than Apex (it's a query language, not a full programming language)
2. Building SOQL validates our shared infrastructure (`common/`)
3. SOQL will later be **injected into** the Apex parser via `injections.scm`
4. Having a working SOQL parser lets us test the injection system end-to-end

### What is SOQL?

SOQL (Salesforce Object Query Language) is how you retrieve data from Salesforce. It looks
like SQL but has key differences:

```sql
-- SQL                                    -- SOQL
SELECT * FROM users                       SELECT Id, Name FROM Account
SELECT COUNT(*) FROM orders               SELECT COUNT() FROM Opportunity
SELECT * FROM t1 JOIN t2 ON ...           SELECT Name, (SELECT Name FROM Contacts) FROM Account
-- No equivalent                          SELECT Id FROM Account WHERE CreatedDate > LAST_N_DAYS:7
-- No equivalent                          SELECT Id FROM Account WHERE Name = :searchTerm
```

Key SOQL-only features the parser must handle:
- **No `SELECT *`** — must list fields explicitly (or use `FIELDS(ALL)`)
- **Relationship queries** — dot notation for parents (`Account.Name`), subqueries for children
- **TYPEOF** — for polymorphic relationships
- **Bind variables** — `:apexVariable` (only valid when embedded in Apex)
- **Date literals** — `YESTERDAY`, `LAST_N_DAYS:7`, `THIS_FISCAL_QUARTER`
- **WITH clauses** — `WITH USER_MODE`, `WITH SECURITY_ENFORCED`
- **ALL ROWS** — `SELECT Id FROM Account ALL ROWS` (only valid in Apex context)

### Testing Strategy: Test-First

For EACH grammar rule, we will:
1. Write the test case FIRST (expected input + expected syntax tree)
2. Then implement the grammar rule to make the test pass
3. Run `tree-sitter test` to verify

Tree-sitter test files use this format:
```
==================
Test Name
==================

input source code here

---

(expected_syntax_tree)
```

## Prerequisites

- Steps 1-2 complete
- `common/common.js` and `common/salesforce-types.js` are present and importable

## Objectives

After completing this step, you will have:

- [x] `soql/grammar.js` — Complete SOQL grammar with detailed comments
- [x] `soql/test/corpus/*.txt` — Comprehensive test files (written BEFORE grammar rules)
- [x] `soql/queries/highlights.scm` — Basic SOQL syntax highlighting
- [x] All tests pass: `cd soql && npx tree-sitter test`

## Detailed Instructions

### 3.1 Write Test Corpus FIRST

Write all test files before implementing the grammar. This is the test-first approach.

#### 3.1.1 Basic Queries Test

Create `d:\Git\tree-sitter-salesforce\soql\test\corpus\basic-queries.txt`:

```
==================
Simple SELECT with one field
==================

SELECT Id FROM Account

---

(source_file
  (soql_query_body
    (select_clause
      (field_identifier (identifier)))
    (from_clause
      (storage_identifier (identifier)))))

==================
SELECT with multiple fields
==================

SELECT Id, Name, Email FROM Contact

---

(source_file
  (soql_query_body
    (select_clause
      (field_identifier (identifier))
      (field_identifier (identifier))
      (field_identifier (identifier)))
    (from_clause
      (storage_identifier (identifier)))))

==================
SELECT with parent relationship field
==================

SELECT Id, Name, Account.Name FROM Contact

---

(source_file
  (soql_query_body
    (select_clause
      (field_identifier (identifier))
      (field_identifier (identifier))
      (field_identifier (dotted_identifier (identifier) (identifier))))
    (from_clause
      (storage_identifier (identifier)))))

==================
SELECT with custom relationship
==================

SELECT Id, parent1__r.Name FROM Junction__c

---

(source_file
  (soql_query_body
    (select_clause
      (field_identifier (identifier))
      (field_identifier (dotted_identifier (identifier) (identifier))))
    (from_clause
      (storage_identifier (identifier)))))

==================
Case insensitive keywords
==================

select id from account

---

(source_file
  (soql_query_body
    (select_clause
      (field_identifier (identifier)))
    (from_clause
      (storage_identifier (identifier)))))

==================
Mixed case keywords
==================

Select Id From Account

---

(source_file
  (soql_query_body
    (select_clause
      (field_identifier (identifier)))
    (from_clause
      (storage_identifier (identifier)))))

==================
COUNT expression
==================

SELECT COUNT() FROM Account

---

(source_file
  (soql_query_body
    (select_clause
      (count_expression
        (identifier)))
    (from_clause
      (storage_identifier (identifier)))))

==================
FIELDS expression
==================

SELECT FIELDS(ALL) FROM Account LIMIT 200

---

(source_file
  (soql_query_body
    (select_clause
      (fields_expression
        (fields_type)))
    (from_clause
      (storage_identifier (identifier)))
    (limit_clause
      (int))))
```

#### 3.1.2 WHERE Clause Tests

Create `d:\Git\tree-sitter-salesforce\soql\test\corpus\where-clauses.txt`:

```
==================
Simple WHERE with string comparison
==================

SELECT Name FROM Account WHERE Name = 'Test'

---

(source_file
  (soql_query_body
    (select_clause
      (field_identifier (identifier)))
    (from_clause
      (storage_identifier (identifier)))
    (where_clause
      (comparison_expression
        (field_identifier (identifier))
        (value_comparison_operator)
        (string_literal)))))

==================
WHERE with AND
==================

SELECT Name FROM Account WHERE Name = 'Test' AND Industry = 'Tech'

---

(source_file
  (soql_query_body
    (select_clause
      (field_identifier (identifier)))
    (from_clause
      (storage_identifier (identifier)))
    (where_clause
      (and_expression
        (comparison_expression
          (field_identifier (identifier))
          (value_comparison_operator)
          (string_literal))
        (comparison_expression
          (field_identifier (identifier))
          (value_comparison_operator)
          (string_literal))))))

==================
WHERE with OR
==================

SELECT Name FROM Account WHERE Industry = 'Tech' OR Industry = 'Finance'

---

(source_file
  (soql_query_body
    (select_clause
      (field_identifier (identifier)))
    (from_clause
      (storage_identifier (identifier)))
    (where_clause
      (or_expression
        (comparison_expression
          (field_identifier (identifier))
          (value_comparison_operator)
          (string_literal))
        (comparison_expression
          (field_identifier (identifier))
          (value_comparison_operator)
          (string_literal))))))

==================
WHERE with NOT
==================

SELECT Name FROM Account WHERE NOT Name = 'Test'

---

(source_file
  (soql_query_body
    (select_clause
      (field_identifier (identifier)))
    (from_clause
      (storage_identifier (identifier)))
    (where_clause
      (not_expression
        (comparison_expression
          (field_identifier (identifier))
          (value_comparison_operator)
          (string_literal))))))

==================
WHERE with IN list
==================

SELECT Name FROM Account WHERE Industry IN ('Tech', 'Finance', 'Health')

---

(source_file
  (soql_query_body
    (select_clause
      (field_identifier (identifier)))
    (from_clause
      (storage_identifier (identifier)))
    (where_clause
      (comparison_expression
        (field_identifier (identifier))
        (set_comparison_operator)
        (comparable_list
          (string_literal)
          (string_literal)
          (string_literal))))))

==================
WHERE with LIKE
==================

SELECT Name FROM Account WHERE Name LIKE '%robots%'

---

(source_file
  (soql_query_body
    (select_clause
      (field_identifier (identifier)))
    (from_clause
      (storage_identifier (identifier)))
    (where_clause
      (comparison_expression
        (field_identifier (identifier))
        (value_comparison_operator)
        (string_literal)))))

==================
WHERE with boolean
==================

SELECT Name FROM Account WHERE IsActive = TRUE

---

(source_file
  (soql_query_body
    (select_clause
      (field_identifier (identifier)))
    (from_clause
      (storage_identifier (identifier)))
    (where_clause
      (comparison_expression
        (field_identifier (identifier))
        (value_comparison_operator)
        (boolean)))))

==================
WHERE with NULL
==================

SELECT Name FROM Account WHERE ParentId = NULL

---

(source_file
  (soql_query_body
    (select_clause
      (field_identifier (identifier)))
    (from_clause
      (storage_identifier (identifier)))
    (where_clause
      (comparison_expression
        (field_identifier (identifier))
        (value_comparison_operator)
        (null_literal)))))
```

#### 3.1.3 Clauses Tests

Create `d:\Git\tree-sitter-salesforce\soql\test\corpus\clauses.txt`:

```
==================
ORDER BY single field
==================

SELECT Name FROM Account ORDER BY Name

---

(source_file
  (soql_query_body
    (select_clause
      (field_identifier (identifier)))
    (from_clause
      (storage_identifier (identifier)))
    (order_by_clause
      (order_expression
        (field_identifier (identifier))))))

==================
ORDER BY with direction
==================

SELECT Name FROM Account ORDER BY Name DESC

---

(source_file
  (soql_query_body
    (select_clause
      (field_identifier (identifier)))
    (from_clause
      (storage_identifier (identifier)))
    (order_by_clause
      (order_expression
        (field_identifier (identifier))
        (order_direction)))))

==================
ORDER BY with NULLS LAST
==================

SELECT Name FROM Account ORDER BY Name ASC NULLS LAST

---

(source_file
  (soql_query_body
    (select_clause
      (field_identifier (identifier)))
    (from_clause
      (storage_identifier (identifier)))
    (order_by_clause
      (order_expression
        (field_identifier (identifier))
        (order_direction)
        (order_null_direction)))))

==================
LIMIT clause
==================

SELECT Name FROM Account LIMIT 10

---

(source_file
  (soql_query_body
    (select_clause
      (field_identifier (identifier)))
    (from_clause
      (storage_identifier (identifier)))
    (limit_clause
      (int))))

==================
OFFSET clause
==================

SELECT Id FROM Account LIMIT 10 OFFSET 20

---

(source_file
  (soql_query_body
    (select_clause
      (field_identifier (identifier)))
    (from_clause
      (storage_identifier (identifier)))
    (limit_clause
      (int))
    (offset_clause
      (int))))

==================
GROUP BY clause
==================

SELECT StageName, COUNT(Id) FROM Opportunity GROUP BY StageName

---

(source_file
  (soql_query_body
    (select_clause
      (field_identifier (identifier))
      (alias_expression
        (function_expression
          (identifier)
          (field_identifier (identifier)))
        (identifier)))
    (from_clause
      (storage_identifier (identifier)))
    (group_by_clause
      (field_identifier (identifier)))))

==================
FOR UPDATE clause
==================

SELECT Id FROM Account FOR UPDATE

---

(source_file
  (soql_query_body
    (select_clause
      (field_identifier (identifier)))
    (from_clause
      (storage_identifier (identifier)))
    (for_clause
      (for_type))))

==================
WITH USER_MODE
==================

SELECT Name FROM Account WITH USER_MODE

---

(source_file
  (soql_query_body
    (select_clause
      (field_identifier (identifier)))
    (from_clause
      (storage_identifier (identifier)))
    (with_clause
      (with_type))))
```

#### 3.1.4 Date Literals Tests

Create `d:\Git\tree-sitter-salesforce\soql\test\corpus\date-literals.txt`:

```
==================
Simple date literal
==================

SELECT Id FROM Account WHERE CreatedDate = YESTERDAY

---

(source_file
  (soql_query_body
    (select_clause
      (field_identifier (identifier)))
    (from_clause
      (storage_identifier (identifier)))
    (where_clause
      (comparison_expression
        (field_identifier (identifier))
        (value_comparison_operator)
        (date_literal)))))

==================
Parameterized date literal
==================

SELECT Id FROM Opportunity WHERE CloseDate < NEXT_N_DAYS:30

---

(source_file
  (soql_query_body
    (select_clause
      (field_identifier (identifier)))
    (from_clause
      (storage_identifier (identifier)))
    (where_clause
      (comparison_expression
        (field_identifier (identifier))
        (value_comparison_operator)
        (date_literal_with_param
          (date_literal)
          (int))))))

==================
Date value literal
==================

SELECT Id FROM Account WHERE CreatedDate > 2024-01-15

---

(source_file
  (soql_query_body
    (select_clause
      (field_identifier (identifier)))
    (from_clause
      (storage_identifier (identifier)))
    (where_clause
      (comparison_expression
        (field_identifier (identifier))
        (value_comparison_operator)
        (date)))))

==================
DateTime value literal
==================

SELECT Id FROM Account WHERE CreatedDate > 2024-01-15T10:30:00Z

---

(source_file
  (soql_query_body
    (select_clause
      (field_identifier (identifier)))
    (from_clause
      (storage_identifier (identifier)))
    (where_clause
      (comparison_expression
        (field_identifier (identifier))
        (value_comparison_operator)
        (date_time)))))
```

#### 3.1.5 Subqueries and Relationships Tests

Create `d:\Git\tree-sitter-salesforce\soql\test\corpus\subqueries.txt`:

```
==================
Child subquery
==================

SELECT Name, (SELECT Name FROM Contacts) FROM Account

---

(source_file
  (soql_query_body
    (select_clause
      (field_identifier (identifier))
      (subquery
        (soql_query_body
          (select_clause
            (field_identifier (identifier)))
          (from_clause
            (storage_identifier (identifier))))))
    (from_clause
      (storage_identifier (identifier)))))

==================
TYPEOF expression
==================

SELECT TYPEOF Owner WHEN User THEN Username WHEN Group THEN Name END FROM Account

---

(source_file
  (soql_query_body
    (select_clause
      (type_of_clause
        (identifier)
        (when_expression (identifier) (field_list (identifier)))
        (when_expression (identifier) (field_list (identifier)))))
    (from_clause
      (storage_identifier (identifier)))))

==================
Aggregate with alias
==================

SELECT SUM(Amount) total FROM Opportunity

---

(source_file
  (soql_query_body
    (select_clause
      (alias_expression
        (function_expression
          (identifier)
          (field_identifier (identifier)))
        (identifier)))
    (from_clause
      (storage_identifier (identifier)))))

==================
WHERE with subquery
==================

SELECT Name FROM Account WHERE Id IN (SELECT AccountId FROM Contact)

---

(source_file
  (soql_query_body
    (select_clause
      (field_identifier (identifier)))
    (from_clause
      (storage_identifier (identifier)))
    (where_clause
      (comparison_expression
        (field_identifier (identifier))
        (set_comparison_operator)
        (subquery
          (soql_query_body
            (select_clause
              (field_identifier (identifier)))
            (from_clause
              (storage_identifier (identifier)))))))))
```

#### 3.1.6 Comments Test

Create `d:\Git\tree-sitter-salesforce\soql\test\corpus\comments.txt`:

```
==================
Header comment
==================

// This is a query
SELECT Id FROM Account

---

(source_file
  (header_comment)
  (soql_query_body
    (select_clause
      (field_identifier (identifier)))
    (from_clause
      (storage_identifier (identifier)))))
```

### 3.2 Implement the SOQL Grammar

Now implement the grammar to make all tests pass.

Replace `d:\Git\tree-sitter-salesforce\soql\grammar.js` with the full grammar:

```javascript
/**
 * @file SOQL (Salesforce Object Query Language) grammar for tree-sitter
 * @description
 * Parses SOQL queries used to retrieve data from Salesforce objects.
 *
 * SOQL is the primary data retrieval language on the Salesforce platform.
 * It appears in two contexts:
 *   1. STANDALONE: In .soql files or developer console query editor
 *   2. EMBEDDED: Inside Apex code as [SELECT ...] expressions
 *
 * This grammar handles the standalone context. When embedded in Apex,
 * the Apex parser defines an opaque `soql_expression` node, and
 * `injections.scm` delegates parsing to this grammar.
 *
 * Grammar structure overview:
 *   source_file
 *   └── soql_query_body
 *       ├── select_clause     (required)  SELECT field1, field2, ...
 *       ├── from_clause       (required)  FROM SObject
 *       ├── using_clause      (optional)  USING SCOPE Mine
 *       ├── where_clause      (optional)  WHERE condition
 *       ├── with_clause       (optional)  WITH USER_MODE
 *       ├── group_by_clause   (optional)  GROUP BY field HAVING condition
 *       ├── order_by_clause   (optional)  ORDER BY field ASC NULLS LAST
 *       ├── limit_clause      (optional)  LIMIT 100
 *       ├── offset_clause     (optional)  OFFSET 50
 *       ├── for_clause        (optional)  FOR UPDATE
 *       └── update_clause     (optional)  UPDATE TRACKING
 *
 * Target: Salesforce API v67 (Summer '25)
 *
 * @see https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

"use strict";

// ============================================================================
// IMPORTS
// ============================================================================
// Import shared helper functions from the common/ directory.
// See common/README.md for documentation on each function.
// ============================================================================

const {
  ci,           // Case-insensitive keyword matching
  commaJoined1, // One or more comma-separated items
  joined,       // Items separated by custom delimiter
} = require("../common/common.js");

const {
  SOQL_DATE_LITERALS,      // YESTERDAY, TODAY, TOMORROW, etc.
  SOQL_DATE_N_LITERALS,    // LAST_N_DAYS, NEXT_N_MONTHS, etc.
} = require("../common/salesforce-types.js");

// ============================================================================
// GRAMMAR DEFINITION
// ============================================================================

module.exports = grammar({
  // The grammar name. Must match the "name" field in tree-sitter.json.
  // This name is used in generated C code and in the API.
  name: "soql",

  // ---------------------------------------------------------------------------
  // EXTRAS — Tokens that can appear ANYWHERE in the language
  // ---------------------------------------------------------------------------
  // In SOQL, whitespace and formatting comments (///) can appear between any
  // tokens. Regular comments (//) are only valid at the start of a file.
  //
  // WHY formatting_comment?
  // Some SOQL editors (like the Salesforce developer console) use /// comments
  // for formatting hints. We treat these as "extras" so they can appear anywhere
  // without breaking the grammar.
  // ---------------------------------------------------------------------------
  extras: ($) => [$.formatting_comment, /\s/],

  // ---------------------------------------------------------------------------
  // CONFLICTS — Known ambiguities the parser must handle
  // ---------------------------------------------------------------------------
  // Tree-sitter uses GLR parsing, which can handle ambiguous grammars.
  // We list known conflicts here so tree-sitter doesn't error during generation.
  //
  // Currently no conflicts for standalone SOQL. When SOQL is embedded in Apex,
  // the Apex grammar handles its own conflicts.
  // ---------------------------------------------------------------------------
  conflicts: ($) => [],

  // ---------------------------------------------------------------------------
  // RULES — The actual grammar
  // ---------------------------------------------------------------------------
  // Rules are listed in a logical top-down order:
  //   1. Entry point (source_file)
  //   2. Main query structure (soql_query_body, select, from, etc.)
  //   3. WHERE clause and boolean expressions
  //   4. Operators
  //   5. Value expressions and functions
  //   6. Literals (strings, numbers, dates, etc.)
  //   7. Identifiers
  // ---------------------------------------------------------------------------
  rules: {
    // =========================================================================
    // ENTRY POINT
    // =========================================================================
    // The top-level rule. A SOQL file contains optional header comments
    // followed by a single query expression.
    //
    // Example file:
    //   // This query gets all accounts
    //   SELECT Id, Name FROM Account WHERE IsActive = TRUE
    // =========================================================================

    /**
     * The root node of any SOQL parse tree.
     * Allows optional header comments (// style) before the query.
     */
    source_file: ($) => seq(
      repeat($.header_comment),
      $._soql_query_expression
    ),

    /**
     * Header comments appear at the very start of a SOQL file.
     * They use the // syntax (single-line comments).
     *
     * Note: This is different from formatting_comment (///) which can appear
     * anywhere in the query and is treated as an "extra".
     */
    header_comment: ($) => seq("//", /.*/),

    /**
     * Formatting comments use /// (triple slash) and can appear anywhere
     * in the query. They're used by some SOQL editors for formatting hints.
     * Defined in `extras` above, so they're automatically skipped during parsing.
     */
    formatting_comment: ($) => seq("///", /.*/),

    // =========================================================================
    // QUERY STRUCTURE
    // =========================================================================

    /**
     * Internal alias — the actual query expression.
     * Underscore prefix means this rule is "hidden" in the syntax tree
     * (the node won't appear, its child is promoted up).
     */
    _soql_query_expression: ($) => $.soql_query_body,

    /**
     * A subquery is a query wrapped in parentheses, used in:
     *   - SELECT clauses: (SELECT Name FROM Contacts)
     *   - WHERE IN clauses: WHERE Id IN (SELECT AccountId FROM Contact)
     */
    subquery: ($) => seq("(", $.soql_query_body, ")"),

    /**
     * The main query body containing all clauses.
     *
     * Clause order follows the SOQL specification:
     *   SELECT → FROM → USING → WHERE → WITH → GROUP BY → ORDER BY →
     *   LIMIT → OFFSET → FOR → UPDATE
     *
     * Only SELECT and FROM are required. All other clauses are optional.
     *
     * @see https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/
     *      soql_sosl/sforce_api_calls_soql_select.htm
     */
    soql_query_body: ($) => seq(
      field("select_clause", $.select_clause),
      field("from_clause", $.from_clause),
      optional(field("using_clause", $.using_clause)),
      optional(field("where_clause", $.where_clause)),
      optional(field("with_clause", alias($.soql_with_clause, $.with_clause))),
      optional(field("group_by_clause", $.group_by_clause)),
      optional(field("order_by_clause", $.order_by_clause)),
      optional(field("limit_clause", $.limit_clause)),
      optional(field("offset_clause", $.offset_clause)),
      optional(field("for_clause", $.for_clause)),
      optional(field("update_clause", $.update_clause)),
    ),

    // =========================================================================
    // SELECT CLAUSE
    // =========================================================================

    /**
     * The SELECT clause specifies which fields to retrieve.
     *
     * Can contain:
     *   - Field names: SELECT Id, Name
     *   - Aggregate functions: SELECT COUNT(Id), SUM(Amount)
     *   - COUNT(): SELECT COUNT() (special case — no field argument)
     *   - Subqueries: SELECT (SELECT Name FROM Contacts)
     *   - TYPEOF: SELECT TYPEOF Owner WHEN User THEN ... END
     *   - FIELDS(): SELECT FIELDS(ALL)
     */
    select_clause: ($) => seq(
      ci("SELECT"),
      choice(
        // COUNT() is a special case — a standalone aggregate with no field
        $.count_expression,
        // Normal: comma-separated list of selectable expressions
        commaJoined1($._selectable_expression)
      )
    ),

    /**
     * COUNT() expression — the only aggregate that can stand alone
     * without any other fields in the SELECT clause.
     *
     * Example: SELECT COUNT() FROM Account
     */
    count_expression: ($) => seq($._function_name, "(", ")"),

    /**
     * Any expression that can appear in a SELECT clause.
     * This is a "hidden" rule (underscore prefix) — it won't appear
     * as a node in the tree; one of its children will appear instead.
     */
    _selectable_expression: ($) => choice(
      $._value_expression,      // Field or function: Name, SUM(Amount)
      $.alias_expression,       // Function with alias: SUM(Amount) total
      $.type_of_clause,         // TYPEOF Owner WHEN User THEN ...
      $.fields_expression,      // FIELDS(ALL), FIELDS(CUSTOM), FIELDS(STANDARD)
      $.subquery                // (SELECT Name FROM Contacts)
    ),

    // =========================================================================
    // FROM CLAUSE
    // =========================================================================

    /**
     * The FROM clause specifies which sObject(s) to query.
     *
     * Examples:
     *   FROM Account
     *   FROM Contact c             (with alias)
     *   FROM Contact AS c          (with explicit AS alias)
     *   FROM Account, Contact      (comma-separated, rare)
     */
    from_clause: ($) => seq(
      ci("FROM"),
      commaJoined1(choice($.storage_identifier, $.storage_alias))
    ),

    /**
     * An sObject reference — simple or dotted identifier.
     * Simple: Account, Contact, My_Custom_Object__c
     * Dotted: (rare, used in certain SOQL contexts)
     */
    storage_identifier: ($) => choice($.identifier, $.dotted_identifier),

    /**
     * An sObject with an alias for use in the rest of the query.
     * The AS keyword is optional.
     *
     * Examples:
     *   FROM Contact c         (implicit alias)
     *   FROM Contact AS c      (explicit alias)
     */
    storage_alias: ($) => seq(
      $.storage_identifier,
      optional(ci("AS")),
      $.identifier
    ),

    // =========================================================================
    // USING CLAUSE
    // =========================================================================

    /**
     * The USING clause modifies query behavior.
     *
     * Examples:
     *   USING SCOPE Mine              (filter to current user's records)
     *   USING SCOPE Team              (filter to current user's team)
     */
    using_clause: ($) => seq(
      ci("USING"),
      $.using_scope_clause
    ),

    using_scope_clause: ($) => seq(ci("SCOPE"), $.using_scope_type),

    using_scope_type: ($) => choice(
      ci("delegated"),
      ci("everything"),
      ci("mine"),
      ci("mine_and_my_groups"),
      ci("my_territory"),
      ci("my_team_territory"),
      ci("team")
    ),

    // =========================================================================
    // WHERE CLAUSE — Boolean Expressions
    // =========================================================================

    /**
     * The WHERE clause filters which records are returned.
     *
     * Examples:
     *   WHERE Name = 'Test'
     *   WHERE Name = 'Test' AND Industry = 'Tech'
     *   WHERE NOT IsDeleted = TRUE
     *   WHERE (Name = 'A' OR Name = 'B') AND Industry = 'Tech'
     */
    where_clause: ($) => seq(ci("WHERE"), $._boolean_expression),

    /**
     * A boolean expression — the building block of WHERE clauses.
     * Can be: AND, OR, NOT, or a single comparison.
     */
    _boolean_expression: ($) => choice(
      $.and_expression,
      $.or_expression,
      $.not_expression,
      $._condition_expression
    ),

    /**
     * AND expression — two or more conditions joined by AND.
     * Example: Name = 'Test' AND Industry = 'Tech' AND IsActive = TRUE
     */
    and_expression: ($) => seq(
      $._condition_expression,
      repeat1(seq(ci("AND"), $._condition_expression))
    ),

    /**
     * OR expression — two or more conditions joined by OR.
     * Example: Industry = 'Tech' OR Industry = 'Finance'
     */
    or_expression: ($) => seq(
      $._condition_expression,
      repeat1(seq(ci("OR"), $._condition_expression))
    ),

    /**
     * NOT expression — negates a condition.
     * Example: NOT Name = 'Test'
     */
    not_expression: ($) => seq(ci("NOT"), $._condition_expression),

    /**
     * A single condition — either a parenthesized boolean expression
     * or a comparison expression.
     */
    _condition_expression: ($) => choice(
      seq("(", $._boolean_expression, ")"),
      $.comparison_expression
    ),

    /**
     * A comparison — a value expression compared to another value.
     *
     * Examples:
     *   Name = 'Test'           (value comparison)
     *   Amount > 1000           (value comparison)
     *   Industry IN ('A', 'B') (set comparison)
     *   Id IN (SELECT ...)      (set comparison with subquery)
     */
    comparison_expression: ($) => seq(
      $._value_expression,
      $._comparison
    ),

    _comparison: ($) => choice($._value_comparison, $._set_comparison),

    /**
     * Value comparison: field OPERATOR value
     * Operators: =, !=, <>, <, <=, >, >=, LIKE
     */
    _value_comparison: ($) => seq(
      $.value_comparison_operator,
      $._soql_literal
    ),

    /**
     * Set comparison: field IN/NOT IN (list or subquery)
     */
    _set_comparison: ($) => seq(
      $.set_comparison_operator,
      choice($.subquery, $.comparable_list)
    ),

    /**
     * A parenthesized list of values for IN/NOT IN comparisons.
     * Example: ('Tech', 'Finance', 'Health')
     */
    comparable_list: ($) => seq(
      "(",
      commaJoined1($._soql_literal),
      ")"
    ),

    // =========================================================================
    // WITH CLAUSE
    // =========================================================================

    /**
     * WITH clause — modifies query security or behavior.
     *
     * Examples:
     *   WITH SECURITY_ENFORCED    (enforce field-level security)
     *   WITH USER_MODE            (run query as current user)
     *   WITH SYSTEM_MODE          (run query with full permissions)
     */
    soql_with_clause: ($) => seq(
      ci("WITH"),
      alias($.soql_with_type, $.with_type)
    ),

    soql_with_type: ($) => choice(
      ci("Security_Enforced"),
      ci("User_Mode"),
      ci("System_Mode"),
      $.with_data_cat_expression,
      $.with_user_id_type
    ),

    with_user_id_type: ($) => seq(ci("UserId"), "=", $.string_literal),

    /**
     * WITH DATA CATEGORY clause — filter knowledge articles by category.
     *
     * Example:
     *   WITH DATA CATEGORY Geography AT USA
     */
    with_data_cat_expression: ($) => seq(
      ci("DATA CATEGORY"),
      joined(ci("AND"), $.with_data_cat_filter)
    ),

    with_data_cat_filter: ($) => seq(
      $.identifier,
      $.with_data_cat_filter_type,
      choice($.identifier, seq("(", commaJoined1($.identifier), ")"))
    ),

    with_data_cat_filter_type: ($) => choice(
      ci("AT"), ci("ABOVE"), ci("BELOW"), ci("ABOVE_OR_BELOW")
    ),

    // =========================================================================
    // GROUP BY CLAUSE
    // =========================================================================

    /**
     * GROUP BY clause — group results for aggregate functions.
     *
     * Example:
     *   SELECT StageName, COUNT(Id) FROM Opportunity GROUP BY StageName
     */
    group_by_clause: ($) => seq(
      ci("GROUP BY"),
      $._group_by_expression,
      optional($.having_clause)
    ),

    _group_by_expression: ($) => commaJoined1(
      choice($.field_identifier, $.function_expression)
    ),

    /**
     * HAVING clause — filter on aggregate results (like SQL HAVING).
     *
     * Example:
     *   GROUP BY StageName HAVING COUNT(Id) > 5
     */
    having_clause: ($) => seq(ci("HAVING"), $._boolean_expression),

    // =========================================================================
    // ORDER BY CLAUSE
    // =========================================================================

    /**
     * ORDER BY clause — sort results.
     *
     * Examples:
     *   ORDER BY Name
     *   ORDER BY Name ASC
     *   ORDER BY Name DESC NULLS LAST
     *   ORDER BY CreatedDate DESC, Name ASC
     */
    order_by_clause: ($) => seq(
      ci("ORDER BY"),
      commaJoined1($.order_expression)
    ),

    order_expression: ($) => seq(
      $._value_expression,
      optional($.order_direction),
      optional($.order_null_direction)
    ),

    order_direction: ($) => choice(ci("ASC"), ci("DESC")),
    order_null_direction: ($) => choice(ci("NULLS FIRST"), ci("NULLS LAST")),

    // =========================================================================
    // LIMIT, OFFSET, FOR, UPDATE CLAUSES
    // =========================================================================

    /** LIMIT clause — restrict number of returned records. */
    limit_clause: ($) => seq(ci("LIMIT"), $.int),

    /** OFFSET clause — skip the first N records. */
    offset_clause: ($) => seq(ci("OFFSET"), $.int),

    /** FOR clause — lock records (FOR UPDATE) or tracking. */
    for_clause: ($) => seq(ci("FOR"), commaJoined1($.for_type)),
    for_type: ($) => choice(ci("UPDATE"), ci("REFERENCE"), ci("VIEW")),

    /** UPDATE clause — enable tracking (UPDATE TRACKING/VIEWSTAT). */
    update_clause: ($) => seq(ci("UPDATE"), commaJoined1($.update_type)),
    update_type: ($) => choice(ci("TRACKING"), ci("VIEWSTAT")),

    // =========================================================================
    // TYPEOF CLAUSE
    // =========================================================================

    /**
     * TYPEOF clause — handle polymorphic relationships.
     *
     * In Salesforce, some fields can reference different sObject types.
     * TYPEOF lets you query different fields depending on the actual type.
     *
     * Example:
     *   SELECT TYPEOF Owner
     *     WHEN User THEN Username, Email
     *     WHEN Group THEN Name
     *   END
     *   FROM Case
     */
    type_of_clause: ($) => seq(
      ci("TYPEOF"),
      choice($.identifier, $.dotted_identifier),
      repeat($.when_expression),
      optional($.else_expression),
      ci("END")
    ),

    when_expression: ($) => seq(
      ci("WHEN"), $.identifier, ci("THEN"), $.field_list
    ),

    else_expression: ($) => seq(ci("ELSE"), $.field_list),

    // =========================================================================
    // FIELDS() EXPRESSION
    // =========================================================================

    /**
     * FIELDS() function — select all/custom/standard fields.
     *
     * Examples:
     *   SELECT FIELDS(ALL) FROM Account LIMIT 200
     *   SELECT FIELDS(CUSTOM) FROM Account
     *   SELECT FIELDS(STANDARD) FROM Account
     *
     * Note: FIELDS(ALL) requires a LIMIT clause.
     */
    fields_expression: ($) => seq(ci("FIELDS"), "(", $.fields_type, ")"),
    fields_type: ($) => choice(ci("ALL"), ci("CUSTOM"), ci("STANDARD")),

    // =========================================================================
    // VALUE EXPRESSIONS AND FUNCTIONS
    // =========================================================================

    /**
     * A value expression — either a field reference or a function call.
     * Used in SELECT, WHERE, ORDER BY, and GROUP BY clauses.
     */
    _value_expression: ($) => choice($.function_expression, $.field_identifier),

    /**
     * Function call expression — aggregate and other SOQL functions.
     *
     * Examples:
     *   COUNT(Id)
     *   SUM(Amount)
     *   CALENDAR_MONTH(CreatedDate)
     *   FORMAT(Amount)
     */
    function_expression: ($) => seq(
      $._function_name,
      "(",
      commaJoined1($._value_expression),
      ")"
    ),

    /**
     * Alias expression — a value expression followed by an alias name.
     *
     * Example: SUM(Amount) total
     *          ^^^^^^^^^^^ ^^^^^ alias
     *          value expr
     */
    alias_expression: ($) => seq($._value_expression, $.identifier),

    // =========================================================================
    // IDENTIFIERS
    // =========================================================================

    /**
     * A dotted identifier — used for relationship field paths.
     *
     * Examples:
     *   Account.Name        (parent field)
     *   Owner.Profile.Name  (multi-level parent)
     *   parent1__r.Name     (custom relationship)
     */
    dotted_identifier: ($) => seq(
      $.identifier, repeat1(seq(".", $.identifier))
    ),

    /**
     * A field identifier — simple or dotted.
     */
    field_identifier: ($) => choice($.identifier, $.dotted_identifier),

    /**
     * A list of field names (used in TYPEOF WHEN...THEN clauses).
     */
    field_list: ($) => commaJoined1(choice($.identifier, $.dotted_identifier)),

    /**
     * Function name — used internally to mark the function name
     * with a field label for easy access in the syntax tree.
     */
    _function_name: ($) => field("function_name", $.identifier),

    // =========================================================================
    // OPERATORS
    // =========================================================================

    /**
     * Value comparison operators: =, !=, <>, <, <=, >, >=, LIKE
     *
     * Note: <> is an alternative to != (both mean "not equal").
     * LIKE supports % (multi-char wildcard) and _ (single-char wildcard).
     */
    value_comparison_operator: ($) => choice(
      "=", "!=", "<>", "<", "<=", ">", ">=", ci("LIKE")
    ),

    /**
     * Set comparison operators: IN, NOT IN, INCLUDES, EXCLUDES
     *
     * IN/NOT IN: Check if a value is in a set of values or subquery results
     * INCLUDES/EXCLUDES: Used with multi-select picklist fields
     */
    set_comparison_operator: ($) => choice(
      ci("IN"), ci("NOT IN"), ci("INCLUDES"), ci("EXCLUDES")
    ),

    // =========================================================================
    // LITERALS
    // =========================================================================

    /**
     * All possible SOQL literal values — used in WHERE comparisons
     * and other value contexts.
     */
    _soql_literal: ($) => choice(
      $.int,
      $.decimal,
      $.string_literal,
      $.date,
      $.date_time,
      $.boolean,
      $.date_literal,
      $.date_literal_with_param,
      $.currency_literal,
      $.null_literal
    ),

    /**
     * String literal — single-quoted string with escape sequences.
     *
     * Supported escape sequences:
     *   \n (newline), \r (carriage return), \t (tab), \b (backspace),
     *   \f (form feed), \' (single quote), \\ (backslash),
     *   \uXXXX (unicode), \" (double quote), \_ (underscore), \% (percent)
     *
     * The last two (\_ and \%) are SOQL-specific — they escape LIKE wildcards.
     */
    string_literal: ($) => /'(\\[nNrRtTbBfFuU"'_%\\]|[^\\'])*'/,

    /** Integer literal */
    int: ($) => /\d+/,

    /** Decimal literal (optional negative, optional fractional part) */
    decimal: ($) => /-?\d+(\.\d+)?/,

    /** Boolean literal — TRUE or FALSE (case-insensitive) */
    boolean: ($) => choice(ci("TRUE"), ci("FALSE")),

    /** NULL literal */
    null_literal: ($) => ci("NULL"),

    /**
     * Date literal — YYYY-MM-DD format.
     * Example: 2024-01-15
     */
    date: ($) => /[1-4][0-9]{3}-(?:0[1-9]|1[0-2])-(?:[0-2][1-9]|[1-2]0|3[0-1])/,

    /**
     * DateTime literal — ISO 8601 format.
     * Example: 2024-01-15T10:30:00Z
     * Example: 2024-01-15T10:30:00+05:00
     */
    date_time: ($) =>
      /[1-4][0-9]{3}-(?:0[1-9]|1[0-2])-(?:[0-2][1-9]|[1-2]0|3[0-1])T([0-1]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d\d?\d?)?(?:Z|[+-][0-1]\d:[0-5]\d)/,

    /** Currency literal — 3-letter code + number (e.g., USD100.50) */
    currency_literal: ($) => /\w{3}\d+(\.\d+)?/,

    /**
     * Date literal keywords — represent dynamic date values.
     *
     * These are special SOQL-only constants that evaluate to dates at runtime.
     * Example: WHERE CreatedDate > YESTERDAY
     */
    date_literal: ($) => choice(
      ...SOQL_DATE_LITERALS.map((d) => ci(d))
    ),

    /**
     * Parameterized date literals — take a numeric argument after a colon.
     *
     * Format: KEYWORD:number
     * Example: LAST_N_DAYS:7 means "the last 7 days"
     * Example: NEXT_N_MONTHS:3 means "the next 3 months"
     */
    date_literal_with_param: ($) => seq(
      alias(
        token(choice(...SOQL_DATE_N_LITERALS.map((d) => ci(d)))),
        $.date_literal
      ),
      ":",
      $.int
    ),

    // =========================================================================
    // IDENTIFIER
    // =========================================================================

    /**
     * A basic identifier — matches sObject names, field names, aliases, etc.
     *
     * Rules:
     *   - Must start with a letter (A-Z, a-z)
     *   - Can contain letters, digits, and underscores
     *   - Examples: Account, My_Field__c, customObj123
     */
    identifier: ($) => /[A-Za-z][A-Za-z\d_]*/,
  },
});
```

### 3.3 Generate and Test

```powershell
# Generate the parser from the grammar
cd d:\Git\tree-sitter-salesforce\soql
npx tree-sitter generate

# Run all tests
npx tree-sitter test
```

> **IMPORTANT**: Some tests may fail on the first run. This is expected with test-first
> development. If a test fails:
> 1. Read the error message — it shows the expected vs. actual syntax tree
> 2. Adjust the grammar rule OR the expected test output
> 3. Re-run `npx tree-sitter generate && npx tree-sitter test`
>
> Common issues:
> - **Conflict errors during `generate`**: Two rules match the same input. Add the conflicting
>   rules to the `conflicts` array in the grammar.
> - **Wrong tree structure**: The test expected a different nesting. Update the test to match
>   the actual (correct) tree, or fix the grammar rule.
>
> You can also run `npx tree-sitter test -u` to auto-update expected outputs in test files
> (but review the changes to make sure they're correct).

### 3.4 Test with Real SOQL Queries

Create a test file with real-world queries from the apex-recipes project:

```powershell
cd d:\Git\tree-sitter-salesforce\soql

# Create a sample .soql file
echo "SELECT Name, ShippingStreet, ShippingCity FROM Account" > test-real.soql

# Parse it
npx tree-sitter parse test-real.soql

# Try a more complex query
echo "SELECT Id, Name, Account.Name FROM Contact WHERE Account.ShippingState = 'KS'" > test-real.soql
npx tree-sitter parse test-real.soql

# Clean up
del test-real.soql
```

### 3.5 Git Commit

```powershell
cd d:\Git\tree-sitter-salesforce
git add soql/
git commit -m "feat(soql): complete SOQL grammar with tests

- Full SOQL grammar supporting all standard clauses
- SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT, OFFSET
- Aggregate functions, TYPEOF, FIELDS(), subqueries
- Date literals (YESTERDAY, LAST_N_DAYS:n, etc.)
- Boolean expressions (AND, OR, NOT, parenthesized)
- WITH clause (USER_MODE, SECURITY_ENFORCED, etc.)
- Comprehensive test corpus with 25+ test cases
- All functions heavily documented with JSDoc comments"
```

## Verification Checklist

- [ ] `soql/grammar.js` contains the full SOQL grammar (~500 lines)
- [ ] `soql/test/corpus/` contains 6 test files with 25+ test cases
- [ ] `cd soql && npx tree-sitter generate` succeeds without errors
- [ ] `cd soql && npx tree-sitter test` — all tests pass
- [ ] `npx tree-sitter parse` works on sample .soql files
- [ ] Git commit exists for this step

## Checkpoint State

After completing this step:

```
soql/
├── grammar.js              ✅ Full SOQL grammar (heavily commented)
├── package.json             ✅ Minimal
├── src/                     ✅ Re-generated with full parser
│   ├── parser.c             ✅ Generated C parser
│   ├── grammar.json         ✅ Machine-readable grammar
│   ├── node-types.json      ✅ AST node type definitions
│   └── tree_sitter/
│       └── parser.h         ✅ Parser header
├── test/
│   └── corpus/
│       ├── basic-queries.txt   ✅ 8 tests
│       ├── where-clauses.txt   ✅ 8 tests
│       ├── clauses.txt         ✅ 8 tests
│       ├── date-literals.txt   ✅ 4 tests
│       ├── subqueries.txt      ✅ 4 tests
│       └── comments.txt        ✅ 1 test
└── queries/
    ├── highlights.scm       📝 Still placeholder (populated in Step 7)
    └── highlights-distinct.scm  📝 Still placeholder
```

**Next step:** Step 4 — Apex Parser Core Structure
