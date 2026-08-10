# Understanding SOQL (for Parser Authors)

## Overview
The Salesforce Object Query Language (SOQL) is used to read information stored in the Salesforce database. It is similar to standard SQL but is tailored specifically for the Salesforce data model, lacking `INSERT`/`UPDATE` statements (which are handled by Apex DML) and `JOIN` statements (which are handled via relationship queries).

## Core Structure
A standard SOQL query follows a strict clause order:
1. `SELECT`
2. `FROM`
3. `USING` (optional)
4. `WHERE` (optional)
5. `WITH` (optional)
6. `GROUP BY` (optional)
7. `HAVING` (optional)
8. `ORDER BY` (optional)
9. `LIMIT` (optional)
10. `OFFSET` (optional)
11. `FOR` (optional)
12. `UPDATE` (optional)
13. `ALL ROWS` (optional)

Our grammar enforces this structure in the `soql_query_body` rule by chaining these clauses sequentially.

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

## Advanced SOQL Constructs (API v67)

### Date Functions

Date functions can appear in `SELECT` and `GROUP BY` clauses to extract date parts:

```soql
SELECT CALENDAR_MONTH(CloseDate) cm, SUM(Amount) total
FROM Opportunity
GROUP BY CALENDAR_MONTH(CloseDate)
```

Supported functions: `CALENDAR_MONTH`, `CALENDAR_QUARTER`, `CALENDAR_YEAR`,
`DAY_IN_MONTH`, `DAY_IN_WEEK`, `DAY_IN_YEAR`, `DAY_ONLY`, `FISCAL_MONTH`,
`FISCAL_QUARTER`, `FISCAL_YEAR`, `HOUR_IN_DAY`, `WEEK_IN_MONTH`, `WEEK_IN_YEAR`.

### GROUP BY ROLLUP and CUBE

```soql
-- ROLLUP: subtotals at each grouping level
SELECT StageName, LeadSource, COUNT(Id)
FROM Opportunity
GROUP BY ROLLUP(StageName, LeadSource)

-- CUBE: all possible subtotal combinations
SELECT StageName, LeadSource, SUM(Amount)
FROM Opportunity
GROUP BY CUBE(StageName, LeadSource)
```

Use `GROUPING(field)` in `SELECT` to identify which rows are subtotal rows.

### Scalar Functions
SOQL provides specialized scalar functions wrapping field expressions in the `SELECT` clause:
- `FORMAT(field)`: Formats numbers, dates, and currencies according to user locale.
- `convertCurrency(amountField)`: Converts currency values to the user's corporate currency.
- `toLabel(picklistField)`: Returns translated picklist values for multilingual orgs.
- `GROUPING(field)`: Distinguishes between aggregate subtotal rows and regular data rows in ROLLUP/CUBE queries.

### WITH DATA CATEGORY

```soql
SELECT Id, Title
FROM KnowledgeArticleVersion
WITH DATA CATEGORY Geography__c AT USA__c
```

Supported operators: `AT`, `ABOVE`, `BELOW`, `ABOVE_OR_BELOW`.
Multiple category filters are comma-separated.

### Bind Variables
When embedded in Apex, SOQL queries can reference Apex variables using a colon prefix (`:varName`).
```soql
SELECT Id FROM Account WHERE Name = :accountName
```
Our SOQL parser explicitly defines a `bind_variable` rule to capture `:identifier` or `:method_call()`.

### Dynamic Formula Filtering (`FORMULA`)
Salesforce Summer '26 introduces dynamic formula evaluation inside SOQL filter conditions (`WHERE` and `HAVING` clauses):
```soql
SELECT Id, Name FROM Contact WHERE FORMULA('Birthdate + 365') > TODAY
SELECT Id, Name FROM Opportunity WHERE FORMULA('Amount * 1.1') > 50000
```
The parser encapsulates this via the `formula_expression` rule, accepting a string literal or value expression.

### ALL ROWS Clause
Appending `ALL ROWS` to a query instructs the database to return all matching records, including soft-deleted records from the Recycle Bin and archived Task/Event activities:
```soql
SELECT Id, Name, IsDeleted FROM Opportunity WHERE IsDeleted = true ALL ROWS
```
`all_rows_clause` is placed at the very end of the query following any `LIMIT`, `OFFSET`, `FOR`, or `UPDATE` clauses.

## Integration with Apex
When writing a Tree-Sitter grammar, the SOQL parser is completely standalone. It parses standard SOQL strings. The integration with Apex happens solely via Tree-Sitter's injection system (`injections.scm`), which detects SOQL blocks inside Apex code and applies the SOQL parser to those specific text ranges.
