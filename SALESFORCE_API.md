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

## SOSL Features

| Feature | Parser Status | Notes |
|---|---|---|
| FIND 'term' | ✅ Implemented | Single-quoted string with wildcard support (`*`, `?`) |
| FIND :bindVar | ✅ Implemented | Bind variable search terms |
| IN ALL / NAME / EMAIL / PHONE / SIDEBAR FIELDS | ✅ Implemented | All field scopes |
| RETURNING SObject(fields) | ✅ Implemented | Per-object field projection |
| RETURNING with WHERE | ✅ Implemented | Per-object filter conditions |
| RETURNING with ORDER BY / LIMIT / OFFSET | ✅ Implemented | Per-object sorting and pagination |
| RETURNING with USING LISTVIEW | ✅ Implemented | List view filtering |
| WITH HIGHLIGHT | ✅ Implemented | |
| WITH SNIPPET | ✅ Implemented | |
| WITH SPELL_CORRECTION | ✅ Implemented | |
| WITH DATA CATEGORY … AT/ABOVE/BELOW | ✅ Implemented | |
| WITH DIVISION / NETWORK / PRICEBOOK_ID | ✅ Implemented | Division, Experience Cloud, and B2B Commerce filters |
| LIMIT / OFFSET (query-level) | ✅ Implemented | |
| UPDATE TRACKING / VIEWSTAT | ✅ Implemented | |

## Formula Language Features

| Feature | Parser Status | Notes |
|---|---|---|
| Arithmetic operators (`+`, `-`, `*`, `/`, `^`) | ✅ Implemented | |
| Comparison operators (`=`, `==`, `<>`, `!=`, `<`, `<=`, `>`, `>=`) | ✅ Implemented | `=` and `==` both accepted |
| Boolean logic (`&&`, `\|\|`, `!`) | ✅ Implemented | |
| String concatenation (`&`) | ✅ Implemented | Distinct from bitwise AND (not present in Formula Language) |
| Field path references (`Object.Parent.Field`) | ✅ Implemented | |
| Global context variables (`$User`, `$Organization`, `$UserRole`) | ✅ Implemented | |
| Custom Metadata variables (`$CustomMetadata.Type__mdt.Record.Field`) | ✅ Implemented | |
| Custom Settings variables (`$Setup.Setting__c.Field__c`) | ✅ Implemented | |
| 50+ built-in functions (`IF`, `ISBLANK`, `REGEX`, `VLOOKUP`, etc.) | ✅ Implemented | See grammar for full list |
| Nested function calls | ✅ Implemented | Arbitrary depth |

## Apex Enhancements (Steps 10–19)

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
