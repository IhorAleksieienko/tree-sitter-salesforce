# Salesforce API Compatibility — v67 (Summer '25)

This document tracks which Salesforce language features the parser supports,
organized by the API version that introduced each feature.

## Target Version

| Property | Value |
|---|---|
| **API Version** | v67.0 |
| **Release Name** | Summer '25 |
| **Release Date** | June 2025 |

## Apex Language Features

### Core Features (Available Since Early Versions)

| Feature | API Version | Parser Status | Notes |
|---|---|---|---|
| Classes and Interfaces | v7+ | ✅ Implemented | |
| Enums | v7+ | ✅ Implemented | |
| Triggers | v7+ | ✅ Implemented | |
| Try/Catch/Finally | v7+ | ✅ Implemented | |
| DML Statements (insert, update, delete, upsert, undelete, merge) | v7+ | ✅ Implemented | |
| SOQL For Loops | v7+ | ✅ Implemented | |
| Static Methods/Variables | v7+ | ✅ Implemented | |
| Access Modifiers (public, private, protected, global) | v7+ | ✅ Implemented | |
| Sharing Keywords (with sharing, without sharing) | v7+ | ✅ Implemented | |
| Collections (List, Set, Map) | v7+ | ✅ Implemented | |
| Enhanced For Loops | v20+ | ✅ Implemented | |
| Annotations (@IsTest, @Future, etc.) | v24+ | ✅ Implemented | |
| Anonymous Apex Execution Mode | v7+ | ✅ Implemented | Top-level executable scripts (`apex_anon`) for Developer Console & CLI |

### Modern Features

| Feature | API Version | Parser Status | Notes |
|---|---|---|---|
| Switch/When Statements | v43 (Summer '18) | ✅ Implemented | Supports literal/enum patterns, single SObject type patterns, and multi-SObject type patterns (`when Account a, Contact c`) |
| @InvocableMethod / @InvocableVariable | v31+ | ✅ Implemented | |
| inherited sharing | v44 (Winter '19) | ✅ Implemented | |
| @SuppressWarnings | v36+ | ✅ Implemented | |
| Safe Navigation Operator `?.` | v50 (Spring '21) | ✅ Implemented | |
| User-Mode and System-Mode DML (`as user` / `as system`) | v54 (Spring '22) | ✅ Implemented | Supported on insert, update, upsert, delete, undelete, and merge |
| Null Coalescing Operator `??` | v59 (Winter '24) | ✅ Implemented | |

## SOQL Features

| Feature | Parser Status | Notes |
|---|---|---|
| SELECT, FROM, WHERE | ✅ Implemented | |
| Aggregate Functions (COUNT, SUM, AVG, MIN, MAX) | ✅ Implemented | |
| GROUP BY, HAVING | ✅ Implemented | |
| GROUP BY ROLLUP and GROUP BY CUBE | ✅ Implemented | Full support for multi-level aggregate rollups and data cube grouping |
| Date Functions (CALENDAR_MONTH, FISCAL_YEAR, DAY_ONLY, etc.) | ✅ Implemented | Covers all 13 SOQL date/time functions in SELECT and GROUP BY |
| Scalar Functions (FORMAT, convertCurrency, toLabel, GROUPING) | ✅ Implemented | Currency conversion, number formatting, picklist label localization, grouping |
| ORDER BY, LIMIT, OFFSET | ✅ Implemented | |
| Relationship Queries (Parent.Field) | ✅ Implemented | |
| Child Subqueries | ✅ Implemented | Fully supported in standalone SOQL and inline Apex `soql_expression` with balanced brackets |
| TYPEOF (Polymorphic Relationships) | ✅ Implemented | Supported with WHEN...THEN and ELSE...END clauses |
| Date Literals (YESTERDAY, LAST_N_DAYS:n, etc.) | ✅ Implemented | |
| Bind Variables (:apexVariable) | ✅ Implemented | Supports map access `:map['key']` inside inline expressions |
| FOR UPDATE / FOR REFERENCE / FOR VIEW | ✅ Implemented | |
| WITH USER_MODE / WITH SYSTEM_MODE | ✅ Implemented | |
| WITH SECURITY_ENFORCED | ✅ Implemented | |
| WITH DATA CATEGORY Filtering | ✅ Implemented | Supports AT, ABOVE, BELOW, ABOVE_OR_BELOW category selectors |
| WITH RecordVisibilityContext Filtering | ✅ Implemented | Multi-parameter security context (`RecordVisibilityContext(key=val, ...)`) |
| USING SCOPE Filtering | ✅ Implemented | Predefined scope filters (`Mine`, `Team`, `Delegated`, etc.) |
| USING LOOKUP ... BIND Search Filtering | ✅ Implemented | Search filter lookup scoping with field binding and bind variables |
| Time Literals (`HH:mm:ss[.SSS][Z\|+-HH:mm]`) | ✅ Implemented | Specialized time literals (e.g., `08:30:00.000Z`, `09:00:00`) |
| convertTimezone Date Function | ✅ Implemented | Timezone conversion in SELECT, WHERE, and nested date functions |
| FORMULA('...') Dynamic Formula Filtering (Summer '26) | ✅ Implemented | Evaluates dynamic formula expressions in `WHERE` and `HAVING` clauses |
| ALL ROWS Clause | ✅ Implemented | Terminal clause querying soft-deleted Recycle Bin records and archived Task/Event activities |

## SOSL Features

| Feature | Parser Status | Notes |
|---|---|---|
| FIND 'term' | ✅ Implemented | Single-quoted string with wildcard support (`*`, `?`) |
| FIND {term} | ✅ Implemented | Curly brace search terms supporting wildcards, logical operators, and exact phrases |
| FIND :bindVar | ✅ Implemented | Bind variable search terms |
| IN ALL / NAME / EMAIL / PHONE / SIDEBAR FIELDS | ✅ Implemented | All field scopes |
| RETURNING SObject(fields) | ✅ Implemented | Per-object field projection |
| RETURNING Projections (`toLabel()`, `convertCurrency()`, `FORMAT()`) | ✅ Implemented | Field projection functions inside RETURNING object specifications |
| RETURNING with WHERE | ✅ Implemented | Per-object filter conditions |
| RETURNING with ORDER BY / LIMIT / OFFSET | ✅ Implemented | Per-object sorting and pagination |
| RETURNING with USING LISTVIEW | ✅ Implemented | List view filtering |
| WITH USER_MODE / WITH SYSTEM_MODE | ✅ Implemented | Modern security context execution modes |
| WITH METADATA | ✅ Implemented | Metadata search scope filtering (`METADATA = '...'` or `:bindVar`) |
| WITH NETWORK / NETWORK IN | ✅ Implemented | Experience Cloud network filtering with single equals or `IN ('...', ...)` list |
| WITH SNIPPET / SNIPPET (TARGET_LENGTH = n) | ✅ Implemented | Search snippet extraction with optional target length parameter |
| WITH DIVISION | ✅ Implemented | Division filtering supporting string literals and `:bindVar` |
| WITH HIGHLIGHT | ✅ Implemented | Search hit highlighting |
| WITH SPELL_CORRECTION | ✅ Implemented | Spell correction suggestions |
| WITH DATA CATEGORY … AT/ABOVE/BELOW | ✅ Implemented | Knowledge data category filtering |
| WITH PRICEBOOK_ID | ✅ Implemented | B2B Commerce pricebook filter supporting string literals and `:bindVar` |
| LIMIT / OFFSET (query-level) | ✅ Implemented | Query-level result pagination |
| UPDATE TRACKING / VIEWSTAT | ✅ Implemented | View and search statistic updates |

## Formula Language Features

| Feature | Parser Status | Notes |
|---|---|---|
| Arithmetic operators (`+`, `-`, `*`, `/`, `^`) | ✅ Implemented | |
| Comparison operators (`=`, `==`, `<>`, `!=`, `<`, `<=`, `>`, `>=`) | ✅ Implemented | `=` and `==` both accepted |
| Boolean logic (`&&`, `\|\|`, `!`) | ✅ Implemented | |
| String concatenation (`&`) | ✅ Implemented | Distinct from bitwise AND (not present in Formula Language) |
| Field path references (`Object.Parent.Field`) | ✅ Implemented | |
| Global context variables (`$User`, `$Organization`, `$UserRole`, `$RecordType`, `$Setup`, `$Permission`, etc.) | ✅ Implemented | Structured `global_context` and chained `field` identifiers |
| Custom Metadata variables (`$CustomMetadata.Type__mdt.Record.Field`) | ✅ Implemented | |
| Custom Settings variables (`$Setup.Setting__c.Field__c`) | ✅ Implemented | |
| Geo-spatial functions (`GEOLOCATION`, `DISTANCE`) | ✅ Implemented | Full support in `function_call` |
| Date and time functions (`TIMENOW`, `ISOWEEK`, `ISOYEAR`, `UNIXTIMESTAMP`, `TODAY`, `NOW`, etc.) | ✅ Implemented | Comprehensive date/time functions |
| Dedicated `IMAGE` Expression node (`image_expression`) | ✅ Implemented | Exposes named fields: `image_url`, `alt_text`, `height`, `width` |
| Scientific notation numeric literals (`1.2e-5`, `3.0E+8`) | ✅ Implemented | Tokenized in `number` literal regex |
| 50+ built-in functions (`IF`, `ISBLANK`, `REGEX`, `VLOOKUP`, etc.) | ✅ Implemented | See grammar for full list |
| Nested function calls | ✅ Implemented | Arbitrary depth |

## Apex Enhancements (Steps 10–22)

| Feature | API Version | Parser Status | Notes |
|---|---|---|---|
| Balanced SOQL subqueries in `[SELECT … (SELECT …) …]` | v7+ | ✅ Fixed | Replaces naive regex |
| `[FIND …]` inline SOSL expressions | v7+ | ✅ Implemented | `sosl_expression` node |
| `Database.queryWithBinds()` injection | v59+ | ✅ Implemented | |
| `when Account a, Contact c {}` multi-type patterns | v43+ | ✅ Implemented | `when_type_pattern` node |
| Anonymous Apex scripting mode | v7+ | ✅ Implemented | Separate `apex_anon` grammar |
| `GROUP BY ROLLUP(…)` / `GROUP BY CUBE(…)` | v18+ | ✅ Implemented | |
| SOQL date functions (`CALENDAR_MONTH`, `FISCAL_YEAR`, etc.) | v18+ | ✅ Implemented | |
| `WITH DATA CATEGORY … AT/ABOVE/BELOW` | v18+ | ✅ Implemented | |
| Interface Method/Constant/Type Declarations | v7+ | ✅ Implemented | Methods, fields, inner enums/classes/interfaces |
| Generic `extends` and `implements` Inheritance | v7+ | ✅ Implemented | `generic_type` & scoped types in inheritance clauses |
| Map Literal Initializers (`new Map<K,V>{k => v}`) | v7+ | ✅ Implemented | `map_initializer` and `map_key_initializer` nodes |
| Static and Instance Initializers | v7+ | ✅ Implemented | `static_initializer` and `instance_initializer` blocks in classes |
| Trigger Helper Member Declarations | v7+ | ✅ Implemented | Helper methods, fields, and inner types directly within `trigger_body` |
| Explicit Constructor Chaining (`this(…)` / `super(…)`) | v7+ | ✅ Implemented | `explicit_constructor_invocation` node with type_arguments & qualifier |
| `System.runAs(…)` Testing Statements | v7+ | ✅ Implemented | `run_as_statement` node with `user` and `body` fields |
| Modern DML Security Modes (`as user` / `as system`) | v54+ | ✅ Implemented | `access_level` on `dml_statement` (`user` / `system`) |
| Case-Insensitive Switch Keywords (`switch on` / `when else`) | v43+ | ✅ Implemented | Fully case-insensitive multi-word keyword matching |
| Multi-Line String Literals (`'''...'''`) | Summer '26 | ✅ Implemented | `multi_line_string_literal` text block support |
| Array Dimension Sizing (`new String[size]`) | v7+ | ✅ Implemented | `array_creation_expression` with `type` and `size` fields |
| Long Literals (`100L`, `100l`) | v7+ | ✅ Implemented | `long_literal` node |
| Scientific Notation Decimals (`1.2e-5`) | v7+ | ✅ Implemented | `scientific_decimal` node |
| Class Reflection Literals (`Account.class`, `void.class`) | v7+ | ✅ Implemented | `class_literal` node with `type` field |

## Backward Compatibility

This parser will successfully parse code written for **ANY** Salesforce API
version ≤ v67. Older code simply won't use newer features — the parser handles
this naturally because newer features are defined as `optional()` grammar rules.

Code using features from API versions > v67 may produce `ERROR` nodes in the
syntax tree.

## Limitations

- Custom annotations from managed packages are parsed as generic annotations
  (the parser recognizes the `@` prefix but doesn't validate annotation names)
- Apex does NOT have string interpolation — if you see it in your code, it's not
  standard Apex
- The parser does not validate semantic constraints (e.g., it won't reject a
  `global` method inside a non-`global` class — that's a compiler-level check)

## Status Key

| Icon | Meaning |
|---|---|
| ✅ | Implemented and tested |
| 🔧 | Work in progress |
| 🔲 | Planned but not started |
| ❌ | Will not implement (out of scope or not applicable) |
