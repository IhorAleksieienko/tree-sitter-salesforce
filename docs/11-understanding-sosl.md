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
FIND 'search_term'
  [IN field_scope]
  [RETURNING object_spec, ...]
  [WITH clause]
  [LIMIT n]
  [OFFSET n]
  [UPDATE TRACKING | VIEWSTAT]
```

## Examples

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

### Per-object filtering and sorting

```sosl
FIND 'San Jose' IN ALL FIELDS
RETURNING Account(Id, Name WHERE BillingCountry = 'US' ORDER BY Name ASC LIMIT 10),
          Lead(Name, Company WHERE IsConverted = false)
```

### With highlighting and snippet

```sosl
FIND 'cloud computing' IN ALL FIELDS
RETURNING KnowledgeArticleVersion(Id, Title)
WITH HIGHLIGHT
WITH SNIPPET
```

### Bind variable in search term

```sosl
FIND :searchQuery IN ALL FIELDS RETURNING Account(Name)
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
    (sosl_string)                    ; 'Acme*'
    (field_scope)                    ; IN NAME FIELDS
    (returning_clause                ; RETURNING Account(...)
      (identifier)                   ; Account
      (field_path)                   ; Id
      (field_path)                   ; Name
      (where_condition))             ; WHERE ...
    (with_clause)                    ; WITH HIGHLIGHT
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
