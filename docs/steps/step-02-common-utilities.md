# Step 2: Common Utilities & Shared Infrastructure

> **Agent Handoff Context**: Step 1 (Environment Setup) is COMPLETE.
> The project skeleton exists at `d:\Git\tree-sitter-salesforce\` with placeholder grammars,
> `package.json`, `tree-sitter.json`, and all tooling verified working.
> Both `apex/` and `soql/` have placeholder `grammar.js` files that generate valid parsers.

## Context

This step creates the **shared utility layer** — the `common/` directory that contains
reusable helper functions and constants used by ALL grammar definitions in the mono-repo.

### Why Do We Need Shared Utilities?

> [!TIP]
> **DRY (Don't Repeat Yourself)**: Both Apex and SOQL share a lot of syntax characteristics. Centralizing logic in `common/` prevents bugs when updating case-insensitivity rules or Salesforce keywords across multiple grammars.

Salesforce languages have characteristics that come up repeatedly in grammar definitions:

1. **Case-insensitivity**: Apex and SOQL are case-insensitive languages. `SELECT`, `Select`,
   and `select` are all identical. Tree-sitter grammars use regex, so we need a helper to
   generate case-insensitive patterns like `[sS][eE][lL][eE][cC][tT]`.

2. **Comma-separated lists**: Both Apex and SOQL use comma-separated lists extensively
   (field lists in SELECT, parameter lists in methods, argument lists in function calls).

3. **Common types**: Both languages reference Salesforce primitive types (`String`, `Integer`,
   `Boolean`, `Date`, `Datetime`, etc.) and sObject types.

By putting these helpers in `common/`, we:
- Avoid code duplication across `apex/grammar.js` and `soql/grammar.js`
- Ensure consistent behavior (e.g., case-insensitivity works the same way everywhere)
- Make it easy to add new languages — just `require('../common/common.js')`

## Prerequisites

- Step 1 complete (project skeleton exists, `npm install` done)
- `tree-sitter` CLI is available

## Objectives

After completing this step, you will have:

- [x] `common/common.js` — Heavily documented helper functions for grammar DSL
- [x] `common/salesforce-types.js` — Shared Salesforce type constants
- [x] `common/README.md` — Documentation for the common module

## Detailed Instructions

### 2.1 Create `common/common.js`

This is the most important shared module. Every grammar will import it.

Create `d:\Git\tree-sitter-salesforce\common\common.js`:

```javascript
/**
 * @file Shared utility functions for tree-sitter-salesforce grammars
 * @description
 * This module provides reusable helper functions that are shared across ALL
 * grammar definitions in the tree-sitter-salesforce mono-repo (Apex, SOQL,
 * and future languages).
 *
 * WHY THIS FILE EXISTS:
 * Salesforce languages (Apex, SOQL, SOSL) share common characteristics:
 *   1. They are case-insensitive (SELECT = select = Select)
 *   2. They use comma-separated lists extensively
 *   3. They share common type names and keywords
 *
 * Rather than duplicating this logic in each grammar.js, we centralize it here.
 *
 * HOW TO USE:
 * In any grammar.js file, import the helpers you need:
 *
 *   const { ci, commaJoined, commaJoined1, joined } = require('../common/common.js');
 *
 * Then use them in your grammar rules:
 *
 *   select_clause: $ => seq(ci('SELECT'), commaJoined1($.field_identifier))
 *
 * @license MIT
 */

"use strict";

// ============================================================================
// CASE-INSENSITIVE KEYWORD HELPERS
// ============================================================================
//
// PROBLEM:
// Tree-sitter's grammar DSL treats string literals as exact matches.
// If you write: 'SELECT', it will ONLY match "SELECT", not "select" or "Select".
// But Apex and SOQL are case-insensitive languages!
//
// SOLUTION:
// We convert each letter into a regex character class that matches both cases.
// "SELECT" becomes /[sS][eE][lL][eE][cC][tT]/
//
// WHY NOT JUST USE /select/i?
// Tree-sitter's regex engine does NOT support the /i flag (case-insensitive).
// It generates its own regex matching logic in C, and only supports a subset
// of regex features. We must manually create the case-insensitive pattern.
// ============================================================================

/**
 * Creates a regex that matches a single word case-insensitively.
 *
 * @param {string} word - The word to make case-insensitive
 * @returns {RegExp} A regex matching the word in any case combination
 *
 * @example
 *   createCaseInsensitiveRegex('SELECT')
 *   // Returns: /[sS][eE][lL][eE][cC][tT]/
 *
 * @example
 *   createCaseInsensitiveRegex('from')
 *   // Returns: /[fF][rR][oO][mM]/
 */
function createCaseInsensitiveRegex(word) {
  return new RegExp(
    word
      // Split "SELECT" into ["S", "E", "L", "E", "C", "T"]
      .split("")
      // Map each letter to a character class: "S" -> "[sS]"
      .map((letter) => `[${letter.toLowerCase()}${letter.toUpperCase()}]`)
      // Join back: "[sS][eE][lL][eE][cC][tT]"
      .join("")
  );
}

/**
 * Creates a case-insensitive keyword rule for the tree-sitter grammar.
 *
 * This is the PRIMARY helper you'll use in grammar definitions. It handles:
 *   - Single keywords: ci('SELECT') → matches SELECT/select/Select/etc.
 *   - Multi-word keywords: ci('ORDER BY') → matches "ORDER BY" with flexible
 *     whitespace between words (spaces, tabs, newlines)
 *
 * The result is wrapped in `alias()` so that in the syntax tree, the node
 * appears with a clean name (e.g., "SELECT") rather than the ugly regex.
 *
 * @param {string} keyword - The keyword to match (case-insensitive)
 * @returns {AliasRule} A tree-sitter rule matching the keyword in any case
 *
 * @example
 *   // In grammar.js:
 *   select_clause: $ => seq(
 *     ci('SELECT'),          // matches "SELECT", "select", "Select", etc.
 *     commaJoined1($.field)
 *   )
 *
 * @example
 *   // Multi-word keywords:
 *   group_by_clause: $ => seq(
 *     ci('GROUP BY'),        // matches "GROUP BY", "group by", "Group By", etc.
 *     commaJoined1($.field)  // with any amount of whitespace between GROUP and BY
 *   )
 */
function ci(keyword) {
  // Split "ORDER BY" into ["ORDER", "BY"]
  const words = keyword.split(" ");

  // Create case-insensitive regex for each word
  // Then interleave with whitespace patterns [\s\n]+ between words
  const regExps = words
    .map(createCaseInsensitiveRegex)
    .flatMap((value, index, array) =>
      // For every word except the last, add a whitespace separator after it
      array.length - 1 !== index
        ? [value, /[\s\n]+/]  // One or more whitespace characters between words
        : value               // Last word — no trailing whitespace
    );

  // If single word: alias(token(/[sS][eE][lL][eE][cC][tT]/), "SELECT")
  // If multi-word:  alias(token(seq(...regExps)), "ORDER_BY")
  return regExps.length == 1
    ? alias(token(regExps[0]), keyword)
    : alias(token(seq(...regExps)), words.join("_"));
}

// ============================================================================
// LIST HELPERS
// ============================================================================
//
// Many language constructs involve comma-separated lists:
//   SELECT Id, Name, Email FROM Contact     ← field list
//   public void doSomething(String a, Integer b)  ← parameter list
//   new List<String>{'a', 'b', 'c'}         ← initializer list
//
// These helpers create grammar rules for such patterns.
// ============================================================================

/**
 * Creates a rule matching ZERO or more comma-separated occurrences of an expression.
 *
 * This is used when the list can be empty. For example, an argument list in a
 * method call can have zero arguments: `doSomething()`
 *
 * @param {Rule} expression - The grammar rule for each list item
 * @returns {Rule} A rule matching "", "expr", "expr, expr", "expr, expr, expr", etc.
 *
 * @example
 *   // Matches: (), (a), (a, b), (a, b, c)
 *   argument_list: $ => seq('(', commaJoined($.expression), ')')
 */
function commaJoined(expression) {
  return optional(commaJoined1(expression));
}

/**
 * Creates a rule matching ONE or more comma-separated occurrences of an expression.
 *
 * This is used when the list must have at least one item. For example, a SELECT
 * clause must have at least one field: `SELECT Id` (not just `SELECT`).
 *
 * @param {Rule} expression - The grammar rule for each list item
 * @returns {Rule} A rule matching "expr", "expr, expr", "expr, expr, expr", etc.
 *
 * @example
 *   // SELECT must have at least one field:
 *   select_clause: $ => seq(ci('SELECT'), commaJoined1($.field_identifier))
 */
function commaJoined1(expression) {
  return joined(",", expression);
}

/**
 * Creates a rule matching one or more occurrences of an expression, separated
 * by a given delimiter.
 *
 * This is the general-purpose separator helper. `commaJoined1` is a specialization
 * that uses "," as the separator.
 *
 * @param {string} joinedBy - The separator token (e.g., ",", ".", "|")
 * @param {Rule} expression - The grammar rule for each list item
 * @returns {Rule} A rule matching "expr", "expr sep expr", "expr sep expr sep expr", etc.
 *
 * @example
 *   // Dot-separated identifiers: com.salesforce.apex
 *   qualified_name: $ => joined('.', $.identifier)
 *
 * @example
 *   // Pipe-separated alternatives in SOSL:
 *   search_group: $ => joined('|', $.search_term)
 */
function joined(joinedBy, expression) {
  // Pattern: expression (separator expression)*
  // This matches: "A" or "A,B" or "A,B,C" etc.
  return seq(expression, repeat(seq(joinedBy, expression)));
}

// ============================================================================
// ADDITIONAL HELPERS
// ============================================================================

/**
 * Creates a rule matching a sequence where all elements after the first are
 * optional. Useful for statements that have a required prefix and optional clauses.
 *
 * @param  {...Rule} rules - Grammar rules. First is required, rest are optional.
 * @returns {Rule} A sequence with optional trailing elements
 *
 * @example
 *   // SOQL query: SELECT is required, WHERE/ORDER BY/LIMIT are optional
 *   _query: $ => optionalSeq(
 *     $.select_clause,
 *     $.from_clause,      // optional
 *     $.where_clause,     // optional
 *     $.order_by_clause,  // optional
 *     $.limit_clause      // optional
 *   )
 */
function optionalSeq(...rules) {
  if (rules.length === 0) return blank();
  if (rules.length === 1) return rules[0];
  const [first, ...rest] = rules;
  return seq(first, ...rest.map(r => optional(r)));
}

/**
 * Dialect identifiers used to distinguish between language contexts.
 * Used internally when a grammar rule needs to know which language it's being
 * used in (e.g., SOQL rules behave slightly differently when embedded in Apex
 * vs. used standalone).
 *
 * @type {Object.<string, string>}
 */
const dialects = {
  SOQL: "soql",
  APEX: "apex",
};

// ============================================================================
// EXPORTS
// ============================================================================
// Every function/constant exported here becomes available to any grammar.js
// that does: const { ci, commaJoined, ... } = require('../common/common.js');
// ============================================================================

module.exports = {
  ci,
  commaJoined,
  commaJoined1,
  joined,
  optionalSeq,
  dialects,
};
```

### 2.2 Create `common/salesforce-types.js`

This module defines type constants shared across Salesforce languages.

Create `d:\Git\tree-sitter-salesforce\common\salesforce-types.js`:

```javascript
/**
 * @file Shared Salesforce type definitions for tree-sitter-salesforce grammars
 * @description
 * This module defines the type names that are common across Salesforce languages.
 * Both Apex and SOQL need to recognize Salesforce primitive types and sObject types.
 *
 * WHY THIS FILE EXISTS:
 * When writing grammar rules for types like `String`, `Integer`, `Boolean`, etc.,
 * we need consistent lists across both the Apex parser (for variable declarations)
 * and the SOQL parser (for TYPEOF clauses and functions). Centralizing them here
 * ensures consistency and makes it easy to add new types.
 *
 * HOW TO USE:
 * In any grammar.js file:
 *
 *   const { PRIMITIVE_TYPES, COLLECTION_TYPES } = require('../common/salesforce-types.js');
 *
 * Then use in grammar rules:
 *
 *   primitive_type: $ => choice(...PRIMITIVE_TYPES.map(t => ci(t)))
 *
 * @license MIT
 */

"use strict";

// ============================================================================
// APEX PRIMITIVE TYPES
// ============================================================================
// These are the built-in primitive types in Apex. They are NOT objects — they
// are value types handled specially by the Apex runtime.
//
// Reference: https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/
//            apexcode/langCon_apex_primitives.htm
// ============================================================================

/**
 * All primitive types recognized by the Apex language.
 * These are case-insensitive in Apex (String == string == STRING).
 *
 * @type {string[]}
 */
const PRIMITIVE_TYPES = [
  "Blob",        // Binary data (e.g., file attachments)
  "Boolean",     // true or false
  "Date",        // Date without time (e.g., 2025-01-15)
  "Datetime",    // Date with time (e.g., 2025-01-15T10:30:00Z)
  "Decimal",     // Arbitrary-precision number (used for currency)
  "Double",      // 64-bit floating point number
  "Id",          // 15 or 18 character Salesforce record ID
  "Integer",     // 32-bit signed integer
  "Long",        // 64-bit signed integer
  "Object",      // Generic object type (similar to Java's Object)
  "String",      // Text string
  "Time",        // Time without date (e.g., 10:30:00.000Z)
];

// ============================================================================
// APEX COLLECTION TYPES
// ============================================================================
// Apex has three built-in collection types. They are generic (parameterized)
// types, meaning they take type arguments: List<String>, Map<Id, Account>, etc.
//
// These are syntactically important because the parser needs to handle the
// angle bracket syntax: List<String>, Map<String, List<Account>>, Set<Id>
// ============================================================================

/**
 * Built-in collection types in Apex.
 * These always take type parameters in angle brackets.
 *
 * @type {string[]}
 */
const COLLECTION_TYPES = [
  "List",        // Ordered collection: List<Account>, List<String>
  "Set",         // Unordered unique collection: Set<Id>, Set<String>
  "Map",         // Key-value pairs: Map<Id, Account>, Map<String, List<String>>
];

// ============================================================================
// VOID TYPE
// ============================================================================
// Used as a return type for methods that don't return a value.
// In Apex: public void doSomething() { }
// ============================================================================

const VOID_TYPE = "void";

// ============================================================================
// SOQL-SPECIFIC TYPES
// ============================================================================
// SOQL has some type concepts that don't exist in Apex proper.
// These are used in SOQL functions and clauses.
// ============================================================================

/**
 * Date literal constants used in SOQL WHERE clauses.
 * These are special keywords that represent dynamic date values.
 *
 * Example: SELECT Id FROM Account WHERE CreatedDate = YESTERDAY
 * Example: SELECT Id FROM Account WHERE CreatedDate > LAST_N_DAYS:7
 *
 * @type {string[]}
 */
const SOQL_DATE_LITERALS = [
  "YESTERDAY",
  "TODAY",
  "TOMORROW",
  "LAST_WEEK",
  "THIS_WEEK",
  "NEXT_WEEK",
  "LAST_MONTH",
  "THIS_MONTH",
  "NEXT_MONTH",
  "LAST_90_DAYS",
  "NEXT_90_DAYS",
  "THIS_QUARTER",
  "LAST_QUARTER",
  "NEXT_QUARTER",
  "THIS_YEAR",
  "LAST_YEAR",
  "NEXT_YEAR",
  "THIS_FISCAL_QUARTER",
  "LAST_FISCAL_QUARTER",
  "NEXT_FISCAL_QUARTER",
  "THIS_FISCAL_YEAR",
  "LAST_FISCAL_YEAR",
  "NEXT_FISCAL_YEAR",
];

/**
 * Parameterized date literals that take a numeric argument.
 * Format: KEYWORD:n (e.g., LAST_N_DAYS:7, NEXT_N_MONTHS:3)
 *
 * Example: SELECT Id FROM Opportunity WHERE CloseDate < NEXT_N_DAYS:30
 *
 * @type {string[]}
 */
const SOQL_DATE_N_LITERALS = [
  "LAST_N_DAYS",
  "NEXT_N_DAYS",
  "LAST_N_WEEKS",
  "NEXT_N_WEEKS",
  "LAST_N_MONTHS",
  "NEXT_N_MONTHS",
  "LAST_N_QUARTERS",
  "NEXT_N_QUARTERS",
  "LAST_N_YEARS",
  "NEXT_N_YEARS",
  "LAST_N_FISCAL_QUARTERS",
  "NEXT_N_FISCAL_QUARTERS",
  "LAST_N_FISCAL_YEARS",
  "NEXT_N_FISCAL_YEARS",
];

/**
 * SOQL aggregate functions.
 * Used in SELECT clauses for grouping and summarizing data.
 *
 * Example: SELECT COUNT(Id), AVG(Amount) FROM Opportunity GROUP BY StageName
 *
 * @type {string[]}
 */
const SOQL_AGGREGATE_FUNCTIONS = [
  "AVG",
  "COUNT",
  "COUNT_DISTINCT",
  "MIN",
  "MAX",
  "SUM",
];

/**
 * SOQL other functions.
 * Used in SELECT and WHERE clauses.
 *
 * @type {string[]}
 */
const SOQL_FUNCTIONS = [
  "CALENDAR_MONTH",
  "CALENDAR_QUARTER",
  "CALENDAR_YEAR",
  "DAY_IN_MONTH",
  "DAY_IN_WEEK",
  "DAY_IN_YEAR",
  "DAY_ONLY",
  "FISCAL_MONTH",
  "FISCAL_QUARTER",
  "FISCAL_YEAR",
  "HOUR_IN_DAY",
  "WEEK_IN_MONTH",
  "WEEK_IN_YEAR",
  "FIELDS",
  "FORMAT",
  "TOLABEL",
  "GROUPING",
  "CONVERTCURRENCY",
  "CONVERTTIMEZONE",
  "DISTANCE",
  "GEOLOCATION",
];

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  PRIMITIVE_TYPES,
  COLLECTION_TYPES,
  VOID_TYPE,
  SOQL_DATE_LITERALS,
  SOQL_DATE_N_LITERALS,
  SOQL_AGGREGATE_FUNCTIONS,
  SOQL_FUNCTIONS,
};
```

### 2.3 Create `common/README.md`

Create `d:\Git\tree-sitter-salesforce\common\README.md`:

```markdown
# Common Utilities — `common/`

This directory contains shared JavaScript modules used by all grammar definitions
in the tree-sitter-salesforce mono-repo.

## Modules

### `common.js` — Grammar DSL Helpers

Provides utility functions for writing tree-sitter grammar rules.

| Function | Purpose | Example |
|---|---|---|
| `ci(keyword)` | Case-insensitive keyword matching | `ci('SELECT')` matches SELECT, select, Select |
| `commaJoined(rule)` | Zero or more comma-separated items | `commaJoined($.arg)` → "", "a", "a, b" |
| `commaJoined1(rule)` | One or more comma-separated items | `commaJoined1($.field)` → "a", "a, b" |
| `joined(sep, rule)` | Items separated by custom delimiter | `joined('.', $.id)` → "a", "a.b", "a.b.c" |
| `optionalSeq(...rules)` | Required first + optional rest | `optionalSeq(a, b, c)` → a, a b, a b c |
| `dialects` | Language identifiers | `dialects.APEX`, `dialects.SOQL` |

### `salesforce-types.js` — Type Constants

Provides arrays of Salesforce type names and SOQL-specific constants.

| Export | Description |
|---|---|
| `PRIMITIVE_TYPES` | Apex primitives: String, Integer, Boolean, Date, etc. |
| `COLLECTION_TYPES` | Apex collections: List, Set, Map |
| `VOID_TYPE` | The "void" return type |
| `SOQL_DATE_LITERALS` | SOQL date constants: YESTERDAY, TODAY, etc. |
| `SOQL_DATE_N_LITERALS` | Parameterized dates: LAST_N_DAYS, NEXT_N_MONTHS, etc. |
| `SOQL_AGGREGATE_FUNCTIONS` | Aggregate functions: COUNT, SUM, AVG, etc. |
| `SOQL_FUNCTIONS` | SOQL functions: CALENDAR_MONTH, FIELDS, FORMAT, etc. |

## Usage in Grammar Files

```javascript
// In apex/grammar.js or soql/grammar.js:
const { ci, commaJoined, commaJoined1, joined } = require('../common/common.js');
const { PRIMITIVE_TYPES, SOQL_DATE_LITERALS } = require('../common/salesforce-types.js');

module.exports = grammar({
  name: 'soql',
  rules: {
    select_clause: $ => seq(ci('SELECT'), commaJoined1($.field_identifier)),
    date_literal: $ => choice(...SOQL_DATE_LITERALS.map(d => ci(d))),
  }
});
```
```

### 2.4 Git Commit

```powershell
cd d:\Git\tree-sitter-salesforce
git add common/
git commit -m "feat: add shared grammar utilities

- common/common.js: case-insensitive keywords, comma-joined lists, DSL helpers
- common/salesforce-types.js: Apex types, SOQL date literals, aggregate functions
- common/README.md: documentation for all shared modules

All functions are heavily documented with JSDoc comments and usage examples."
```

## Verification Checklist

- [ ] `common/common.js` exists and exports: `ci`, `commaJoined`, `commaJoined1`, `joined`, `optionalSeq`, `dialects`
- [ ] `common/salesforce-types.js` exists and exports: `PRIMITIVE_TYPES`, `COLLECTION_TYPES`, `VOID_TYPE`, `SOQL_DATE_LITERALS`, `SOQL_DATE_N_LITERALS`, `SOQL_AGGREGATE_FUNCTIONS`, `SOQL_FUNCTIONS`
- [ ] `common/README.md` exists with usage documentation
- [ ] Both files can be imported without errors: `node -e "require('./common/common.js'); require('./common/salesforce-types.js'); console.log('OK')"`
- [ ] Git commit exists for this step

## Checkpoint State

After completing this step, the `common/` directory is fully populated:

```
common/
├── common.js              ✅ Grammar DSL helpers (ci, commaJoined, etc.)
├── salesforce-types.js    ✅ Type constants (primitives, collections, SOQL literals)
└── README.md              ✅ Documentation
```

**What's changed since Step 1:**
- `common/` directory now has 3 files (was empty)
- No other files modified

**Next step:** Step 3 — SOQL Parser
