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
| Classes and Interfaces | v7+ | 🔲 Planned | |
| Enums | v7+ | 🔲 Planned | |
| Triggers | v7+ | 🔲 Planned | |
| Try/Catch/Finally | v7+ | 🔲 Planned | |
| DML Statements (insert, update, delete, upsert, undelete, merge) | v7+ | 🔲 Planned | |
| SOQL For Loops | v7+ | 🔲 Planned | |
| Static Methods/Variables | v7+ | 🔲 Planned | |
| Access Modifiers (public, private, protected, global) | v7+ | 🔲 Planned | |
| Sharing Keywords (with sharing, without sharing) | v7+ | 🔲 Planned | |
| Collections (List, Set, Map) | v7+ | 🔲 Planned | |
| Enhanced For Loops | v20+ | 🔲 Planned | |
| Annotations (@IsTest, @Future, etc.) | v24+ | 🔲 Planned | |

### Modern Features

| Feature | API Version | Parser Status | Notes |
|---|---|---|---|
| Switch/When Statements | v43 (Summer '18) | 🔲 Planned | |
| @InvocableMethod / @InvocableVariable | v31+ | 🔲 Planned | |
| inherited sharing | v44 (Winter '19) | 🔲 Planned | |
| @SuppressWarnings | v36+ | 🔲 Planned | |
| Safe Navigation Operator `?.` | v50 (Spring '21) | 🔲 Planned | |
| Null Coalescing Operator `??` | v59 (Winter '24) | 🔲 Planned | |

## SOQL Features

| Feature | Parser Status | Notes |
|---|---|---|
| SELECT, FROM, WHERE | 🔲 Planned | |
| Aggregate Functions (COUNT, SUM, AVG, MIN, MAX) | 🔲 Planned | |
| GROUP BY, HAVING | 🔲 Planned | |
| ORDER BY, LIMIT, OFFSET | 🔲 Planned | |
| Relationship Queries (Parent.Field) | 🔲 Planned | |
| Child Subqueries | 🔲 Planned | |
| TYPEOF (Polymorphic Relationships) | 🔲 Planned | |
| Date Literals (YESTERDAY, LAST_N_DAYS:n, etc.) | 🔲 Planned | |
| Bind Variables (:apexVariable) | 🔲 Planned | |
| FOR UPDATE / FOR REFERENCE / FOR VIEW | 🔲 Planned | |
| WITH USER_MODE / WITH SYSTEM_MODE | 🔲 Planned | |
| WITH SECURITY_ENFORCED | 🔲 Planned | |

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
