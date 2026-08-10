# Understanding Salesforce Formula Language

Formula Language is Salesforce's declarative expression language used in:
- **Validation Rules** — Prevent bad data from being saved
- **Formula Fields** — Compute values from other fields
- **Flow Decision Criteria** — Control which branch a Flow takes
- **Process Builder** — Define entry criteria and field update formulas

## Key Differences from Apex

| Feature | Formula Language | Apex |
|---|---|---|
| Entry point | A single expression | Class/method declarations |
| Statements | None (expression only) | Full statement language |
| Equality operator | `=` (single equals) | `==` (double equals) |
| String concatenation | `&` | `+` |
| Bitwise AND | Not available | `&` |
| Case sensitivity | Case-insensitive everywhere | Case-insensitive keywords, case-sensitive identifiers |

## Operator Precedence (Highest → Lowest)

| Level | Operators | Description |
|---|---|---|
| 10 | `.` | Field path access (`Account.Name`) |
| 9 | `- +` (unary) | Negation, positive |
| 8 | `^` | Exponentiation |
| 7 | `* /` | Multiplication, division |
| 6 | `+ -` | Addition, subtraction |
| 5 | `&` | String concatenation |
| 4 | `= == <> != < <= > >=` | Comparison and equality |
| 3 | `!` | Logical NOT |
| 2 | `&&` | Logical AND |
| 1 | `\|\|` | Logical OR |

## Field References

Dot-notation traverses relationships:

```text
Account.BillingCity              ← field on a related object
Account.Parent.BillingState      ← multi-hop relationship
Owner.Profile.Name               ← polymorphic relationship
```

In the AST, this produces a `field_reference` node with chained `identifier` children.

## Global Context Variables

Use `$` prefix to access platform-level context:

| Variable | Description | Example |
|---|---|---|
| `$User` | Running user | `$User.ProfileId` |
| `$UserRole` | Running user's role | `$UserRole.DeveloperName` |
| `$Organization` | Org settings | `$Organization.Name` |
| `$Profile` | User's profile | `$Profile.Name` |
| `$RecordType` | Record Type metadata | `$RecordType.DeveloperName` |
| `$CustomMetadata` | CMDT records | `$CustomMetadata.Config__mdt.Default.Value__c` |
| `$Setup` | Custom Settings | `$Setup.AppConfig__c.Discount__c` |
| `$Permission` | Custom permissions | `$Permission.ManageUsers` |
| `$GlobalConstant` | True / False / EmptyString | `$GlobalConstant.True` |
| `$ObjectType` | Schema metadata | `$ObjectType.Account.Fields.Name` |

In the AST, global variables produce a structured `global_variable` node with a `context: (global_context)` child and optional `field: (identifier)` children.

## Built-in Functions (Selected)

| Category | Functions |
|---|---|
| Logical | `IF`, `IFS`, `CASE`, `AND`, `OR`, `NOT`, `XOR` |
| Null/Blank | `ISBLANK`, `ISNULL`, `BLANKVALUE`, `NULLVALUE` |
| Picklist | `ISPICKVAL`, `ISPICKVALMULTISELECT`, `INCLUDES`, `EXCLUDES`, `TEXT` |
| Field Change | `ISCHANGED`, `ISNEW`, `PRIORVALUE` |
| Math | `ABS`, `CEILING`, `FLOOR`, `ROUND`, `MCEILING`, `MFLOOR`, `MAX`, `MIN`, `MOD`, `SQRT`, `EXP`, `LN`, `LOG`, `POWER` |
| Geo-spatial | `GEOLOCATION`, `DISTANCE` |
| Text | `LEFT`, `RIGHT`, `MID`, `LEN`, `TRIM`, `SUBSTITUTE`, `REGEX`, `FIND`, `BEGINS`, `CONTAINS`, `UPPER`, `LOWER`, `PROPER`, `LPAD`, `RPAD`, `REVERSE` |
| Date/Time | `DATE`, `DATEVALUE`, `DATETIMEVALUE`, `TIMEVALUE`, `TODAY`, `NOW`, `TIMENOW`, `YEAR`, `MONTH`, `DAY`, `HOUR`, `MINUTE`, `SECOND`, `ADDMONTHS`, `WEEKDAY`, `ISOWEEK`, `ISOYEAR`, `UNIXTIMESTAMP` |
| Lookup | `VLOOKUP` |
| Format & Media | `FORMAT`, `HYPERLINK`, `IMAGE` (dedicated `image_expression` node) |

## Dedicated `IMAGE` Expression

Formulas use `IMAGE(url, alt [, height, width])` to render dynamic UI badges and images. The parser provides a dedicated `image_expression` node with named fields:
- `image_url`
- `alt_text`
- `height` (optional)
- `width` (optional)

```formula
IMAGE('/img/status.png', 'Status OK', 20, 20)
```

## Examples

### Validation Rule — required field conditional on another

```formula
AND(
  ISPICKVAL(Status__c, 'Active'),
  ISBLANK(Activation_Date__c)
)
```

### Formula Field — full name from parts

```formula
FirstName & ' ' & LastName
```

### Formula Field — nested IF with Geo and IMAGE

```formula
IF(
  DISTANCE(GEOLOCATION(BillingLatitude, BillingLongitude), GEOLOCATION(37.77, -122.42), 'mi') < 10.5,
  IMAGE('/img/near.png', 'Nearby Customer', 16, 16),
  IMAGE('/img/far.png', 'Distant Customer')
)
```

### Flow Criteria — check running user role

```formula
$UserRole.DeveloperName = 'Sales_Manager' || $Profile.Name = 'System Administrator'
```

## AST Structure

```text
(source_file
  (function_call
    name: (function_name)      ; IF
    (binary_expression         ; Amount > 10000
      (field_reference)
      (number))
    (string_literal)           ; 'Enterprise'
    (string_literal)))         ; 'SMB'
```

## Using the Parser

```python
import tree_sitter_salesforce as tss
from tree_sitter import Parser

parser = Parser()
parser.language = tss.formula()

tree = parser.parse(b"IF(ISBLANK(Email__c), 'Required', $User.Name & ': ' & Email__c)")
root = tree.root_node

# Inspect the top-level function call
fn = root.child(0)
print(fn.type)                        # → function_call
print(fn.child_by_field_name("name").text.decode())  # → IF
```
