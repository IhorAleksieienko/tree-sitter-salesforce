# Understanding Salesforce Formula Language (for Parser Authors)

## Overview

The **Salesforce Formula Language** is a declarative, expression-oriented language used across the Salesforce platform for:
- **Validation Rules** (e.g. `ISBLANK(Email__c) || NOT(REGEX(Email__c, "..."))`)
- **Formula Fields** (e.g. `Opportunity.Amount * 0.1`, `FirstName & ' ' & LastName`)
- **Flow Decision Criteria & Resource Formulas** (e.g. `$GlobalConstant.True`, `ISPICKVAL(Status__c, 'Active')`)
- **Process Builder & Workflow Rule Conditions** (e.g. `Account.AnnualRevenue > 1000000`)
- **Default Field Values** (e.g. `TODAY() + 30`)

Unlike Apex or SOQL, a Formula is **a single expression** — there are no statements, declarations, or blocks.

```text
IF(ISBLANK(Email__c), 'No Email Provided', Email__c)
```

---

## Core Characteristics

### 1. Single Expression Architecture
The `source_file` entry point is simply `$._expression`. There is no sequence of statements or block delimiters.

### 2. Case-Insensitive Built-in Functions
All function names are case-insensitive: `IF(...)`, `if(...)`, and `If(...)` are syntactically identical.

### 3. Field References & Dot Notation
Field references navigate through SObject relationships using dot notation:
```text
Account.Parent.BillingState
```
This produces a `field_reference` node containing `(identifier)` children for each relationship step.

### 4. Global Context Variables (`$` Prefix)
Global context variables represent system-level information, custom metadata, and setup values:
- `$User.ProfileId`
- `$Organization.Id`
- `$CustomMetadata.Config__mdt.Default.Value__c`
- `$Setup.AppSettings__c.Enabled__c`
- `$GlobalConstant.True`

These are parsed as `global_variable` nodes with leading `$` and dotted identifier paths.

### 5. String Concatenation (`&`) vs Addition (`+`)
In Salesforce Formula Language:
- **`&` is String Concatenation**: `FirstName & ' ' & LastName` concatenates strings.
- **`+` is Numeric Addition**: `Amount + 100` adds numbers (or days to dates).
- **Bitwise AND does NOT exist**: Bitwise operations are not supported in Formula Language.

### 6. Equality Comparison (`=` and `==`)
In Formula Language, a single `=` is the primary equality operator:
```text
Account.BillingCountry = 'US'
```
The double equals `==` is also supported as an alias for backward compatibility. Similarly, both `<>` and `!=` represent inequality.

---

## Operator Precedence Matrix

The formula grammar strictly enforces the standard Salesforce operator precedence table (from lowest to highest):

| Precedence | Operator | Associativity | Description |
|---|---|---|---|
| **1** | `\|\|`, `OR(...)` | Left | Logical OR |
| **2** | `&&`, `AND(...)` | Left | Logical AND |
| **3** | `!`, `NOT(...)` | Unary | Logical NOT |
| **4** | `=`, `==`, `<>`, `!=`, `<`, `<=`, `>`, `>=` | Left | Comparison & Equality |
| **5** | `&` | Left | String Concatenation |
| **6** | `+`, `-` | Left | Additive Arithmetic |
| **7** | `*`, `/` | Left | Multiplicative Arithmetic |
| **8** | `^` | Right | Exponentiation (Power) |
| **9** | `+`, `-`, `!` | Unary (Right) | Unary Plus, Minus, NOT |
| **10** | `.` | Left | Field & Global Reference Path |

---

## Function Categories

The grammar recognizes all standard Salesforce formula functions:

- **Logical**: `IF`, `IFS`, `CASE`, `AND`, `OR`, `NOT`, `XOR`
- **Null & Blank Checks**: `ISBLANK`, `ISNULL`, `BLANKVALUE`, `NULLVALUE`
- **Picklist**: `ISPICKVAL`, `ISPICKVALMULTISELECT`, `TEXT`, `VALUE`, `INCLUDES`, `EXCLUDES`
- **Field Change**: `ISCHANGED`, `ISNEW`, `PRIORVALUE`
- **Math**: `ABS`, `CEILING`, `FLOOR`, `ROUND`, `MCEILING`, `MFLOOR`, `MAX`, `MIN`, `MOD`, `SQRT`, `EXP`, `LN`, `LOG`, `POWER`
- **Text**: `LEFT`, `RIGHT`, `MID`, `LEN`, `TRIM`, `SUBSTITUTE`, `FIND`, `CONTAINS`, `BEGINS`, `UPPER`, `LOWER`, `PROPER`, `RPAD`, `LPAD`, `REVERSE`
- **Date & Time**: `DATE`, `DATEVALUE`, `DATETIMEVALUE`, `TIMEVALUE`, `TODAY`, `NOW`, `YEAR`, `MONTH`, `DAY`, `HOUR`, `MINUTE`, `SECOND`, `ADDMONTHS`, `WEEKDAY`
- **Lookups & Formatting**: `VLOOKUP`, `FORMAT`, `REGEX`, `HYPERLINK`, `IMAGE`

Any unknown or custom function identifier is also supported gracefully via fallback to `identifier`.

---

## AST Structure Examples

### Simple Validation Rule
```text
ISBLANK(Email__c)
```
```text
(source_file
  (function_call
    name: (function_name)
    arguments: (field_reference
      (identifier))))
```

### Complex Logical Rule with Global Variable
```text
AND(
  NOT(ISBLANK(Email__c)),
  $User.ProfileId != '00e000000000001'
)
```
```text
(source_file
  (function_call
    name: (function_name)
    arguments: (function_call
      name: (function_name)
      arguments: (function_call
        name: (function_name)
        arguments: (field_reference
          (identifier))))
    arguments: (binary_expression
      (global_variable
        (identifier)
        (identifier))
      (string_literal))))
```

---

## Language Bindings Usage

### Node.js
```javascript
const Parser = require('tree-sitter');
const Salesforce = require('tree-sitter-salesforce');

const parser = new Parser();
parser.setLanguage(Salesforce.formula);

const tree = parser.parse("IF(ISBLANK(Email__c), 'required', Email__c)");
console.log(tree.rootNode.toString());
```

### Python
```python
import tree_sitter_salesforce as tss
from tree_sitter import Language, Parser

parser = Parser()
parser.language = Language(tss.formula())

tree = parser.parse(b"Amount * 0.1 + ShippingHandling__c")
assert not tree.root_node.has_error
```
