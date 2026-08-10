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

### Date Literals and Date Functions
SOQL has robust built-in date literals (e.g., `YESTERDAY`, `LAST_N_DAYS:5`) and date/time functions:
- **Date Literals:** Represent relative dates in WHERE filters (`WHERE CreatedDate > YESTERDAY`).
- **Date Functions:** Extract date and fiscal components in SELECT and GROUP BY clauses:
  `CALENDAR_MONTH()`, `CALENDAR_QUARTER()`, `CALENDAR_YEAR()`, `DAY_IN_MONTH()`, `DAY_IN_WEEK()`, `DAY_IN_YEAR()`, `DAY_ONLY()`, `FISCAL_MONTH()`, `FISCAL_QUARTER()`, `FISCAL_YEAR()`, `HOUR_IN_DAY()`, `WEEK_IN_MONTH()`, `WEEK_IN_YEAR()`.
  ```soql
  SELECT CALENDAR_MONTH(CloseDate), SUM(Amount)
  FROM Opportunity
  GROUP BY CALENDAR_MONTH(CloseDate)
  ```

### Aggregate Extensions: ROLLUP and CUBE
In addition to standard `GROUP BY field1, field2`, SOQL supports multi-level subtotaling:
- **`GROUP BY ROLLUP(field1, field2)`**: Generates hierarchical subtotals from right to left.
- **`GROUP BY CUBE(field1, field2)`**: Generates subtotals for all possible combinations of dimensions.
```soql
SELECT StageName, LeadSource, COUNT(Id)
FROM Opportunity
GROUP BY ROLLUP(StageName, LeadSource)
HAVING COUNT(Id) > 5
```

### Scalar Functions
SOQL provides specialized scalar functions wrapping field expressions in the `SELECT` clause:
- `FORMAT(field)`: Formats numbers, dates, and currencies according to user locale.
- `convertCurrency(amountField)`: Converts currency values to the user's corporate currency.
- `toLabel(picklistField)`: Returns translated picklist values for multilingual orgs.
- `GROUPING(field)`: Distinguishes between aggregate subtotal rows and regular data rows in ROLLUP/CUBE queries.

### Data Category Filtering
For Salesforce Knowledge and Ideas queries, the `WITH DATA CATEGORY` clause filters articles by categorization hierarchy using operators `AT`, `ABOVE`, `BELOW`, and `ABOVE_OR_BELOW`:
```soql
SELECT Id, Title FROM KnowledgeArticleVersion
WITH DATA CATEGORY Geography__c AT USA__c AND Product__c ABOVE (Phones__c, Computers__c)
```

### Bind Variables
When embedded in Apex, SOQL queries can reference Apex variables using a colon prefix (`:varName`).
```soql
SELECT Id FROM Account WHERE Name = :accountName
```
Our SOQL parser explicitly defines a `bind_variable` rule to capture `:identifier` or `:method_call()`.

## Integration with Apex
When writing a Tree-Sitter grammar, the SOQL parser is completely standalone. It parses standard SOQL strings. The integration with Apex happens solely via Tree-Sitter's injection system (`injections.scm`), which detects SOQL blocks inside Apex code and applies the SOQL parser to those specific text ranges.

