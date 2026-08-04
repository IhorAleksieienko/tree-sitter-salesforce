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

### Modern Features

| Feature | API Version | Parser Status | Notes |
|---|---|---|---|
| Switch/When Statements | v43 (Summer '18) | ✅ Implemented | |
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
| ORDER BY, LIMIT, OFFSET | ✅ Implemented | |
| Relationship Queries (Parent.Field) | ✅ Implemented | |
| Child Subqueries | ✅ Implemented | |
| TYPEOF (Polymorphic Relationships) | ✅ Implemented | |
| Date Literals (YESTERDAY, LAST_N_DAYS:n, etc.) | ✅ Implemented | |
| Bind Variables (:apexVariable) | ✅ Implemented | |
| FOR UPDATE / FOR REFERENCE / FOR VIEW | ✅ Implemented | |
| WITH USER_MODE / WITH SYSTEM_MODE | ✅ Implemented | |
| WITH SECURITY_ENFORCED | ✅ Implemented | |

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
