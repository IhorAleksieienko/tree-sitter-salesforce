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
| FIND 'search_term' (Wildcards `*`, `?`) | ✅ Implemented | Supports simple strings, wildcard search expressions, and bind variables |
| IN Field Scope | ✅ Implemented | Supports `ALL FIELDS`, `NAME FIELDS`, `EMAIL FIELDS`, `PHONE FIELDS`, `SIDEBAR FIELDS` |
| RETURNING Clause | ✅ Implemented | Supports multi-SObject specifications with field selections |
| RETURNING WHERE Filters | ✅ Implemented | Boolean conditions (`AND`, `OR`, `NOT`) and comparisons |
| RETURNING ORDER BY | ✅ Implemented | Supports `ASC`/`DESC` directions and `NULLS FIRST/LAST` |
| RETURNING LIMIT & OFFSET | ✅ Implemented | Per-object pagination limits and offsets |
| RETURNING USING LISTVIEW | ✅ Implemented | Filtering by ListView ID |
| WITH Clauses | ✅ Implemented | Supports `WITH HIGHLIGHT`, `WITH SNIPPET`, `WITH SPELL_CORRECTION`, `WITH DATA CATEGORY`, `WITH DIVISION`, `WITH NETWORK`, `WITH PRICEBOOK_ID` |
| UPDATE TRACKING / VIEWSTAT | ✅ Implemented | Supports tracking search statistics and article views |
| Top-level LIMIT & OFFSET | ✅ Implemented | Global query-level result limits and offsets |
| Apex Inline Injection | ✅ Implemented | Injected into Apex `[FIND ...]` `sosl_expression` nodes |

## Formula Language Features

| Feature | Parser Status | Notes |
|---|---|---|
| Validation Rules | ✅ Implemented | Single-expression parser for validation rules across standard and custom SObjects |
| Formula Fields | ✅ Implemented | Number, text, currency, date, and boolean formula fields |
| Flow Decision Criteria | ✅ Implemented | Flow decision elements and formula resource expressions |
| Process Builder Conditions | ✅ Implemented | Multi-condition criteria logic |
| Global Variables (`$` prefix) | ✅ Implemented | Supports `$User`, `$UserRole`, `$Organization`, `$Profile`, `$CustomMetadata`, `$Setup`, `$GlobalConstant` |
| Dotted Field References | ✅ Implemented | Relationship navigation (`Account.Parent.BillingState`) |
| String Concatenation (`&`) | ✅ Implemented | Distinguishes `&` (string concat) from `+` (numeric addition) |
| Case-Insensitive Functions | ✅ Implemented | Full built-in library (`IF`, `AND`, `OR`, `NOT`, `ISBLANK`, `ISNULL`, `ISPICKVAL`, `PRIORVALUE`, `ISCHANGED`, `ISNEW`, `REGEX`, `VLOOKUP`, etc.) |
| Comparison Operators | ✅ Implemented | Supports `=`, `==`, `<>`, `!=`, `<`, `<=`, `>`, `>=` |


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
