# Understanding SOSL (for Parser Authors)

## Overview
The Salesforce Object Search Language (SOSL) is used to perform text-based searches across multiple Salesforce SObjects simultaneously. While SOQL retrieves structured database records from a single object (with related child/parent records), SOSL executes full-text search indexing across diverse objects in a single search statement.

```apex
// SOQL — retrieves records from Account
List<Account> accounts = [SELECT Id, Name FROM Account WHERE Name = 'Acme'];

// SOSL — searches across Account, Contact, and Lead in one pass
List<List<SObject>> results = [FIND 'Acme*' IN ALL FIELDS
                               RETURNING Account(Id, Name),
                                         Contact(FirstName, LastName),
                                         Lead(Company)];
```

---

## Core Structure

A standard SOSL query follows a sequential clause structure:
1. `FIND 'search_query'` (or `FIND :bindVariable`) — **Required**
2. `IN field_scope` — Optional (`ALL FIELDS`, `NAME FIELDS`, `EMAIL FIELDS`, `PHONE FIELDS`, `SIDEBAR FIELDS`)
3. `RETURNING object_spec, ...` — Optional (one or more SObject specs)
4. `WITH clause` — Optional (`HIGHLIGHT`, `SNIPPET`, `DATA CATEGORY`, `DIVISION`, etc.)
5. `LIMIT n` — Optional (top-level search result limit)
6. `OFFSET n` — Optional (top-level search result offset)
7. `UPDATE TRACKING | VIEWSTAT` — Optional (search logging and tracking)

Our grammar enforces this structure in `sosl/grammar.js` within the `sosl_query` rule.

---

## Language Constructs & Specifics

### 1. Search Query and Wildcards
SOSL search queries are enclosed in single quotes and support wildcard characters:
- **`*` (Asterisk)**: Matches zero or more characters (e.g. `'Acme*'`).
- **`?` (Question Mark)**: Matches exactly one character (e.g. `'Jo?n'`).
- **Bind Variables**: When embedded in Apex, SOSL search terms can reference Apex variables with `:varName` (e.g. `FIND :searchStr`).

### 2. Field Scopes (`IN` Clause)
Restricts search indexing to particular field groupings:
- `IN ALL FIELDS`: Searches all searchable text/string fields (default).
- `IN NAME FIELDS`: Searches name fields only (`Name`, `FirstName`, `LastName`).
- `IN EMAIL FIELDS`: Searches email fields.
- `IN PHONE FIELDS`: Searches phone fields.
- `IN SIDEBAR FIELDS`: Searches sidebar-indexed fields.

### 3. Multi-SObject `RETURNING` Clause
Specifies which objects and fields to return from the search results. Each object spec can define optional filters and controls:
```sosl
RETURNING Account(
    Id, Name, BillingCity
    USING LISTVIEW = '00Bxx0000012345'
    WHERE BillingCountry = 'US' AND IsActive = TRUE
    ORDER BY Name ASC NULLS LAST
    LIMIT 25
    OFFSET 10
)
```

Inside the parentheses:
- **Field Paths**: Comma-separated list of field names (`Id`, `Parent.Name`).
- **`USING LISTVIEW`**: Restricts returned records to those visible in a specific list view.
- **`WHERE` Filters**: Boolean conditions (`AND`, `OR`, `NOT`) and comparison operators (`=`, `!=`, `<`, `<=`, `>`, `>=`, `LIKE`).
- **`ORDER BY`**: Field sorting with optional direction (`ASC`/`DESC`) and null placement (`NULLS FIRST`/`NULLS LAST`).
- **`LIMIT` and `OFFSET`**: Per-object result limits and pagination.

### 4. `WITH` Clauses
Provides specialized search modifiers:
- `WITH HIGHLIGHT`: Highlights matching search terms in returned text.
- `WITH SNIPPET`: Returns search snippet excerpts around matching terms.
- `WITH SPELL_CORRECTION = true`: Enables search spell correction suggestions.
- `WITH DATA CATEGORY group AT/ABOVE/BELOW category`: Knowledge article filtering.
- `WITH DIVISION = 'divName'`: Restricts search to a specific business division.
- `WITH NETWORK = 'networkId'`: Experience Cloud / Community network filtering.
- `WITH PRICEBOOK_ID = 'pricebookId'`: B2B commerce pricebook filtering.

---

## Integration with Apex

When authored as a Tree-Sitter grammar, the SOSL parser is completely standalone (`sosl/grammar.js`). It parses pure SOSL statements starting at the `FIND` keyword.

In Apex source code, SOSL appears enclosed within square brackets:
```apex
List<List<SObject>> searchList = [FIND 'Acme*' IN ALL FIELDS RETURNING Account(Name)];
```

The integration operates via Tree-Sitter's language injection system:
1. **Apex Grammar (`apex/grammar.js`)**: Defines `sosl_expression` as `seq("[", field("query", seq(ci("find"), optional($._sosl_content))), "]")` using balanced-bracket parsing.
2. **Injection Query (`apex/queries/injections.scm`)**: Delegates the inner content of `sosl_expression` to the `sosl` grammar:
   ```scheme
   ((sosl_expression) @injection.content
     (#set! injection.language "sosl"))
   ```
