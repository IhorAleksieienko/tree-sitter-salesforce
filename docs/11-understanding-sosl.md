# Understanding SOSL (Salesforce Object Search Language)

SOSL is Salesforce's full-text search language. It searches across multiple SObjects
simultaneously, unlike SOQL which queries a single object per statement.

## When to Use SOSL vs. SOQL

| Use SOSL when… | Use SOQL when… |
|---|---|
| Searching across multiple object types at once | Querying a specific object |
| Full-text keyword search (partial matches, wildcards) | Filtering on exact field values |
| You don't know which object type contains the data | You know the object you need |
| Building a universal search feature | Loading related records for display |

## Basic Syntax

```text
FIND 'search_term' | {search_term} | :bindVar
  [IN field_scope]
  [RETURNING object_spec, ...]
  [WITH clause ...]
  [LIMIT n]
  [OFFSET n]
  [UPDATE TRACKING | VIEWSTAT]
```

## Examples

### Curly brace full-text search with projection functions

```sosl
FIND {Cloud Computing*} IN ALL FIELDS
RETURNING Account(Id, Name, toLabel(Industry), convertCurrency(AnnualRevenue)),
          Contact(Id, FirstName, LastName, FORMAT(CreatedDate))
WITH USER_MODE
WITH NETWORK IN ('CommunityA', 'CommunityB')
WITH SNIPPET (TARGET_LENGTH = 120)
LIMIT 50
```

### Simple search across all fields

```sosl
FIND 'Acme' IN ALL FIELDS RETURNING Account(Name, BillingCity)
```

### Wildcard search across multiple objects

```sosl
FIND 'Acme*' IN NAME FIELDS
RETURNING Account(Id, Name),
          Contact(FirstName, LastName, Email)
LIMIT 50
```

### Per-object filtering, projection, and sorting

```sosl
FIND 'San Jose' IN ALL FIELDS
RETURNING Account(Id, Name, toLabel(Type) WHERE BillingCountry = 'US' ORDER BY Name ASC LIMIT 10),
          Lead(Name, Company WHERE IsConverted = false)
```

### With highlighting and snippet

```sosl
FIND 'cloud computing' IN ALL FIELDS
RETURNING KnowledgeArticleVersion(Id, Title)
WITH HIGHLIGHT
WITH SNIPPET (TARGET_LENGTH = 150)
```

### Bind variable in search term and WITH clauses

```sosl
FIND :searchQuery IN ALL FIELDS RETURNING Account(Name) WITH DIVISION = :divVar
```

## Field Scopes

| Scope | Description |
|---|---|
| `ALL FIELDS` | Searches name, email, phone, and sidebar fields |
| `NAME FIELDS` | Name fields only |
| `EMAIL FIELDS` | Email fields only |
| `PHONE FIELDS` | Phone fields only |
| `SIDEBAR FIELDS` | Fields that appear in the sidebar |

## AST Structure

```text
(source_file
  (sosl_query
    (sosl_brace_string)              ; {Cloud Computing*}
    (field_scope)                    ; IN ALL FIELDS
    (returning_clause                ; RETURNING Account(...)
      (identifier)                   ; Account
      (field_path)                   ; Id
      (field_path)                   ; Name
      (projection_function_call      ; toLabel(Industry)
        (field_path)))
      (projection_function_call      ; convertCurrency(AnnualRevenue)
        (field_path)))
    (with_clause                     ; WITH USER_MODE
      (with_security_clause))
    (with_clause                     ; WITH SNIPPET (TARGET_LENGTH = 120)
      (with_snippet_clause
        (integer)))
    (integer)))                      ; LIMIT 50
```

## Using the Parser

```python
import tree_sitter_salesforce as tss
from tree_sitter import Parser

parser = Parser()
parser.language = tss.sosl()
tree = parser.parse(b"FIND 'Acme' IN ALL FIELDS RETURNING Account(Name)")
root = tree.root_node

# Get the sosl_query node
sosl_query = root.child(0)
print(sosl_query.type)  # → sosl_query

# Get returning clauses
for child in sosl_query.children:
    if child.type == "returning_clause":
        sobject = child.child_by_field_name("sobject")
        print(f"Returning: {sobject.text.decode()}")
```

## Inline SOSL in Apex

SOSL can appear inline inside Apex code using `[FIND …]` syntax:

```apex
List<List<SObject>> results = [FIND 'Acme' IN ALL FIELDS RETURNING Account(Name)];
```

The Apex grammar produces a `sosl_expression` node, which is injected with the SOSL parser
via `apex/queries/injections.scm`. In editors, `FIND`, `IN`, `RETURNING` etc. will receive
SOSL syntax highlighting tokens inside the Apex file.
