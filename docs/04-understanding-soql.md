# Understanding SOQL (for Parser Authors)

## Overview
The Salesforce Object Query Language (SOQL) is used to read information stored in the Salesforce database. It is similar to standard SQL but is tailored specifically for the Salesforce data model, lacking `INSERT`/`UPDATE` statements (which are handled by Apex DML) and `JOIN` statements (which are handled via relationship queries).

## Core Structure
A standard SOQL query follows a strict clause order:
1. `SELECT`
2. `FROM`
3. `WHERE` (optional)
4. `WITH` (optional)
5. `GROUP BY` (optional)
6. `HAVING` (optional)
7. `ORDER BY` (optional)
8. `LIMIT` (optional)
9. `OFFSET` (optional)
10. `FOR` (optional)

Our grammar enforces this structure in the `_soql_query_expression` rule by chaining these clauses sequentially.

## Salesforce-Specific Quirks

### Relationship Queries (No JOINs)
SOQL does not use `JOIN`. Instead, it navigates relationships using dot notation (Parent-to-Child or Child-to-Parent):
- **Child-to-Parent:** `SELECT Contact.Account.Name FROM Contact`
- **Parent-to-Child:** Uses subqueries in the SELECT clause: `SELECT Name, (SELECT LastName FROM Contacts) FROM Account`

The parser handles this via `subquery` rules in the `select_clause` and dot-separated `identifier` rules.

### Polymorphic Relationships
Salesforce has fields (like `OwnerId` or `WhatId` on Tasks) that can reference multiple object types. SOQL introduces the `TYPEOF` clause to handle these:
```soql
SELECT 
    TYPEOF What
        WHEN Account THEN Phone
        WHEN Opportunity THEN Amount
        ELSE Name
    END
FROM Task
```
Our grammar implements `typeof_clause` specifically for this syntax.

### Date Literals
SOQL has robust built-in date literals (e.g., `YESTERDAY`, `LAST_N_DAYS:5`). The lexer must recognize these as distinct tokens (or composite rules) rather than standard identifiers or function calls.

### Bind Variables
When embedded in Apex, SOQL queries can reference Apex variables using a colon prefix (`:varName`).
```soql
SELECT Id FROM Account WHERE Name = :accountName
```
Our SOQL parser explicitly defines a `bind_variable` rule to capture `:identifier` or `:method_call()`.

## Integration with Apex
When writing a Tree-Sitter grammar, the SOQL parser is completely standalone. It parses standard SOQL strings. The integration with Apex happens solely via Tree-Sitter's injection system (`injections.scm`), which detects SOQL blocks inside Apex code and applies the SOQL parser to those specific text ranges.
