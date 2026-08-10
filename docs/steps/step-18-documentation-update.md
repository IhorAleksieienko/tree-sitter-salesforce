# Step 18: Documentation Update — All New Grammars & Modernised Bindings

> **Agent Checkpoint — Read This First**
>
> **Status**: This step is NOT YET STARTED.
> **Prerequisites**: Steps 10–17 are COMPLETE.
> - All five grammars (`apex`, `apex-anon`, `soql`, `sosl`, `formula`) generate, test, and publish correctly.
> - Python bindings use the modern capsule API (`tss.apex()`, `tss.apex_anon()`, `tss.soql()`, `tss.sosl()`, `tss.formula()`).
> - CI/CD workflow is green across all platforms.
> - The `sf-rag-engine` project confirmed working against the new bindings.
>
> **Design Flag ℹ️**: This step makes **no grammar or code changes**. It only updates prose
> and adds new doc files. Any agent can execute sub-tasks independently — they do not
> depend on each other's order. Run a final `node scripts/test-all.js` before opening a PR
> to confirm nothing drifted during the documentation pass.

---

## Goal

Bring every user-facing document up to date with the five grammars introduced in Steps 10–17.
Ensure that a developer who has never seen this repository can:

1. Understand what each grammar does in 60 seconds (README).
2. Install and use any grammar from Python or Node.js in under 5 minutes (Quick Start).
3. Find the authoritative reference for each language's supported constructs (per-language docs).
4. Know which features map to which Salesforce API version (SALESFORCE_API.md).
5. Understand how Anonymous Apex differs from class-based Apex (architecture note).

---

## Affected Files

| File | Change Type | What to Update |
|---|---|---|
| `README.md` | Modify | Features list, Quick Start (5 grammars), parser status table, roadmap, doc index |
| `ARCHITECTURE.md` | Modify | Data-flow diagram, grammar stack, injection model, `apex-anon` note |
| `SALESFORCE_API.md` | Modify | Add SOSL, Formula, Anonymous Apex sections; mark new SOQL features ✅ |
| `CHANGELOG.md` | Modify | Add entries for Steps 10–17 under a new version heading |
| `docs/03-understanding-apex.md` | Modify | Add sections: multi-type `when` clause, Anonymous Apex distinction |
| `docs/04-understanding-soql.md` | Modify | Add sections: date functions, GROUP BY ROLLUP/CUBE, WITH DATA CATEGORY |
| `docs/09-getting-started-tutorial.md` | Modify | Extend tutorial with SOSL, Formula, and `apex_anon` examples |
| `docs/10-release-process.md` | **New** | How to cut a release (version bump → tag → CI → PyPI/npm verify) |
| `docs/11-understanding-sosl.md` | **New** | SOSL language overview for parser authors and tool builders |
| `docs/12-understanding-formula.md` | **New** | Formula Language overview: operators, functions, global variables |
| `docs/13-understanding-anonymous-apex.md` | **New** | Anonymous Apex: what it is, how to use the `apex-anon` grammar |

---

## Sub-Task 18.1 — Update `README.md`

Replace the entire file with the updated version below.
Key changes: headline updated to mention all 5 grammars; Features expanded;
Quick Start shows all language loaders; Parser Status table shows all 5 grammars;
Dynamic SOSL support table added; Roadmap updated; Documentation links added.

```markdown
# tree-sitter-salesforce

Tree-sitter grammars for Salesforce languages — **Apex, SOQL, SOSL, Formula Language,
and Anonymous Apex**.

> Providing fast, incremental, error-tolerant parsing for Salesforce development tools.

[![CI](https://github.com/IhorAleksieienko/tree-sitter-salesforce/actions/workflows/ci.yml/badge.svg)](https://github.com/IhorAleksieienko/tree-sitter-salesforce/actions)

## Features

- 🚀 **Production-quality Apex parser** — Salesforce API v67 (Summer '25), covering
  classes, interfaces, enums, triggers, DML, annotations, generics, and modern syntax
  (`?.`, `??`, switch/when, multi-SObject type patterns).
- 🔍 **SOQL parser** — Full query syntax including `TYPEOF`, `GROUP BY ROLLUP/CUBE`,
  date functions (`CALENDAR_MONTH`, `FISCAL_YEAR`), bind variables, and all security
  clauses (`WITH USER_MODE / SYSTEM_MODE / DATA CATEGORY`).
- 🔎 **SOSL parser** — Full-text search language: `FIND … IN … RETURNING … WITH …`,
  field scopes, per-object `WHERE` / `ORDER BY` / `LIMIT`, `WITH HIGHLIGHT`, `WITH SNIPPET`.
- 📐 **Formula Language parser** — Declarative formula expressions for Validation Rules,
  Formula Fields, and Flow criteria: 50+ built-in functions, field-path references, and
  global context variables (`$User`, `$Organization`, `$CustomMetadata`).
- 📝 **Anonymous Apex parser** — Parses top-level executable scripts (Developer Console
  "Execute Anonymous", `sf apex run`) without a class wrapper.
- 🔗 **Language injection** — SOQL and SOSL are highlighted correctly *inside* Apex code
  (both static `[SELECT …]`/`[FIND …]` literals and dynamic `Database.*` method strings).
- 📦 **Multi-language bindings** — Python (≥ 0.22 native capsule API), Node.js, and
  WebAssembly bindings for browser and VS Code Web.
- 📚 **Educational** — Every grammar rule carries inline comments explaining *why* it
  exists, designed for contributors and parser authors.

## Quick Start

### Python

```sh
pip install tree-sitter-salesforce
```

```python
import tree_sitter_salesforce as tss
from tree_sitter import Language, Parser

parser = Parser()

# ── Apex (.cls / .trigger) ──────────────────────────────────────────────────
parser.language = Language(tss.apex())
tree = parser.parse(b"""
public with sharing class AccountService {
    public List<Account> getAccounts() {
        return [SELECT Id, Name FROM Account];
    }
}
""")
print(tree.root_node.sexp())

# ── Anonymous Apex (Developer Console / sf apex run) ────────────────────────
parser.language = Language(tss.apex_anon())
tree = parser.parse(b"insert new Account(Name = 'Test');\nSystem.debug('done');")
print(tree.root_node.sexp())

# ── SOQL ────────────────────────────────────────────────────────────────────
parser.language = Language(tss.soql())
tree = parser.parse(b"SELECT Id, Name FROM Account WHERE IsDeleted = false LIMIT 10")
print(tree.root_node.sexp())

# ── SOSL ────────────────────────────────────────────────────────────────────
parser.language = Language(tss.sosl())
tree = parser.parse(b"FIND 'Acme*' IN ALL FIELDS RETURNING Account(Name), Contact(Email)")
print(tree.root_node.sexp())

# ── Formula Language ─────────────────────────────────────────────────────────
parser.language = Language(tss.formula())
tree = parser.parse(b"IF(ISBLANK(Email__c), 'Required', Email__c & ' (' & $User.Name & ')')")
print(tree.root_node.sexp())
```

### Node.js

```sh
npm install tree-sitter tree-sitter-salesforce
```

```javascript
const Parser = require('tree-sitter');
const { apex, apexAnon, soql, sosl, formula } = require('tree-sitter-salesforce');

const parser = new Parser();

// Apex
parser.setLanguage(apex);
const apexTree = parser.parse(`public class T { }`);
console.log(apexTree.rootNode.toString());

// SOQL
parser.setLanguage(soql);
const soqlTree = parser.parse(`SELECT Id FROM Account WHERE Name = 'Acme'`);
console.log(soqlTree.rootNode.toString());
```

## Parser Status

| Parser | Grammar | Tests | Highlights | Injection | Tags |
|---|---|---|---|---|---|
| **Apex** | ✅ | ✅ | ✅ | ✅ SOQL + SOSL | ✅ |
| **Apex (Anonymous)** | ✅ | ✅ | ✅ (shared) | ✅ SOQL + SOSL | — |
| **SOQL** | ✅ | ✅ | ✅ | — | — |
| **SOSL** | ✅ | ✅ | ✅ | — | — |
| **Formula Language** | ✅ | ✅ | ✅ | — | — |

## Salesforce API Version

Targets **API v67 (Summer '25)**. See [SALESFORCE_API.md](SALESFORCE_API.md).

## Dynamic Query Support

| Scenario | SOQL | SOSL |
|---|---|---|
| Inline `[SELECT …]` / `[FIND …]` | ✅ Full parsing | ✅ Full parsing |
| `Database.query('SELECT …')` | ✅ String injection | — |
| `Database.queryWithBinds(…)` | ✅ String injection | — |
| Concatenated query strings | ⚠️ Structural recognition | — |

## Roadmap

| Feature | Status |
|---|---|
| SFLog parser | 🔲 Future |
| Apex type-flow analysis queries (`locals.scm` for all grammars) | 🔲 Future |
| VS Code extension | 🔲 Future |

## Documentation

- [How Tree-Sitter Works](docs/00-how-tree-sitter-works.md)
- [Grammar DSL Cheatsheet](docs/02-grammar-dsl-cheatsheet.md)
- [Understanding Apex](docs/03-understanding-apex.md)
- [Understanding SOQL](docs/04-understanding-soql.md)
- [Understanding SOSL](docs/11-understanding-sosl.md)
- [Understanding Formula Language](docs/12-understanding-formula.md)
- [Understanding Anonymous Apex](docs/13-understanding-anonymous-apex.md)
- [Getting Started Tutorial](docs/09-getting-started-tutorial.md)
- [Adding a New Language](docs/05-adding-new-language.md)
- [Testing Guide](docs/06-testing-guide.md)
- [Release Process](docs/10-release-process.md)
- [Architecture](ARCHITECTURE.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE) for details.
```

---

## Sub-Task 18.2 — Update `ARCHITECTURE.md`

### Changes required

1. **Grammar Definition Layer** diagram — add `sosl/grammar.js`, `formula/grammar.js`,
   `apex-anon/grammar.js`.
2. **Data Flow diagram** — add the three new grammar paths through `tree-sitter generate`.
3. **Binding Layer** diagram — add the new per-grammar `_binding_*.pyd` modules.
4. **Language Injection Model** — update "Injection Tiers" to mention SOSL Tier 1 and
   Tier 2 Database method expansion.
5. **Add new section: "Anonymous Apex vs. Class Apex"** explaining why two grammar files
   exist and how consumers should choose between them.

### New section to append

```markdown
## Anonymous Apex vs. Class Apex

Two separate grammar definitions handle Apex:

| Grammar | File | Entry Point | Use Case |
|---|---|---|---|
| `apex` | `apex/grammar.js` | `repeat($.declaration)` | `.cls`, `.trigger` files |
| `apex_anon` | `apex-anon/grammar.js` | `repeat1($.statement)` | Developer Console, `sf apex run` |

**Why two grammars?** Merging both modes into a single `source_file` rule creates
irresolvable GLR conflicts — the parser cannot decide from the first token whether a
`public` keyword opens a class declaration or a statement-level modifier. Separate grammar
files with distinct entry points is the idiomatic tree-sitter solution.

**How consumers choose**: By file extension or execution context.
- `.cls`, `.trigger` → `apex` grammar
- `.apex`, runtime execution → `apex_anon` grammar
- Editors configure this via the `scope` field in `tree-sitter.json`
```

---

## Sub-Task 18.3 — Update `SALESFORCE_API.md`

Add the following new sections after the existing SOQL section:

```markdown
## SOSL Features

| Feature | Parser Status | Notes |
|---|---|---|
| FIND 'term' | ✅ Implemented | Single-quoted string with wildcard support (`*`, `?`) |
| FIND :bindVar | ✅ Implemented | Bind variable search terms |
| IN ALL / NAME / EMAIL / PHONE / SIDEBAR FIELDS | ✅ Implemented | All field scopes |
| RETURNING SObject(fields) | ✅ Implemented | Per-object field projection |
| RETURNING with WHERE | ✅ Implemented | Per-object filter conditions |
| RETURNING with ORDER BY / LIMIT / OFFSET | ✅ Implemented | Per-object sorting and pagination |
| WITH HIGHLIGHT | ✅ Implemented | |
| WITH SNIPPET | ✅ Implemented | |
| WITH SPELL_CORRECTION | ✅ Implemented | |
| WITH DATA CATEGORY … AT/ABOVE/BELOW | ✅ Implemented | |
| LIMIT / OFFSET (query-level) | ✅ Implemented | |
| UPDATE TRACKING / VIEWSTAT | ✅ Implemented | |

## Formula Language Features

| Feature | Parser Status | Notes |
|---|---|---|
| Arithmetic operators (`+`, `-`, `*`, `/`, `^`) | ✅ Implemented | |
| Comparison operators (`=`, `==`, `<>`, `!=`, `<`, `<=`, `>`, `>=`) | ✅ Implemented | `=` and `==` both accepted |
| Boolean logic (`&&`, `\|\|`, `!`) | ✅ Implemented | |
| String concatenation (`&`) | ✅ Implemented | Distinct from bitwise AND (not present in Formula Language) |
| Field path references (`Object.Parent.Field`) | ✅ Implemented | |
| Global context variables (`$User`, `$Organization`, `$UserRole`) | ✅ Implemented | |
| Custom Metadata variables (`$CustomMetadata.Type__mdt.Record.Field`) | ✅ Implemented | |
| Custom Settings variables (`$Setup.Setting__c.Field__c`) | ✅ Implemented | |
| 50+ built-in functions (`IF`, `ISBLANK`, `REGEX`, `VLOOKUP`, etc.) | ✅ Implemented | See grammar for full list |
| Nested function calls | ✅ Implemented | Arbitrary depth |

## Apex Enhancements (Steps 10–14)

| Feature | API Version | Parser Status | Notes |
|---|---|---|---|
| Balanced SOQL subqueries in `[SELECT … (SELECT …) …]` | v7+ | ✅ Fixed | Replaces naive regex |
| `[FIND …]` inline SOSL expressions | v7+ | ✅ Implemented | `sosl_expression` node |
| `Database.queryWithBinds()` injection | v59+ | ✅ Implemented | |
| `when Account a, Contact c {}` multi-type patterns | v43+ | ✅ Implemented | `when_type_pattern` node |
| Anonymous Apex scripting mode | v7+ | ✅ Implemented | Separate `apex_anon` grammar |
| `GROUP BY ROLLUP(…)` / `GROUP BY CUBE(…)` | v18+ | ✅ Implemented | |
| SOQL date functions (`CALENDAR_MONTH`, `FISCAL_YEAR`, etc.) | v18+ | ✅ Implemented | |
| `WITH DATA CATEGORY … AT/ABOVE/BELOW` | v18+ | ✅ Implemented | |
```

---

## Sub-Task 18.4 — Update `CHANGELOG.md`

Add a new version entry at the top of the file:

```markdown
## [0.2.0] — 2026-08-XX

### Added

- **SOSL grammar** (`sosl/grammar.js`) — Full Salesforce Object Search Language support:
  `FIND … IN … RETURNING … WITH …`, field scopes, per-object WHERE/ORDER/LIMIT, WITH clauses.
- **Formula Language grammar** (`formula/grammar.js`) — Declarative formula expression parser
  for Validation Rules, Formula Fields, and Flow criteria. 50+ built-in functions, field-path
  references, global context variables (`$User`, `$CustomMetadata`).
- **Anonymous Apex grammar** (`apex-anon/grammar.js`) — Top-level statement parsing for
  Developer Console and `sf apex run` scripts.
- **`sosl_expression` node** in `apex/grammar.js` — Allows Apex `[FIND …]` blocks to be
  injected with the SOSL parser.
- **SOSL injection** in `apex/queries/injections.scm`.
- **`Database.queryWithBinds()` injection** in `apex/queries/injections.scm`.
- **`when_type_pattern` node** — Multi-SObject `when Account a, Contact c {}` syntax.
- **SOQL `GROUP BY ROLLUP/CUBE`** in `soql/grammar.js`.
- **SOQL date functions** (`CALENDAR_MONTH`, `FISCAL_YEAR`, etc.) in `soql/grammar.js`.
- **`WITH DATA CATEGORY`** clause in `soql/grammar.js`.
- **Python loaders**: `tss.apex_anon()`, `tss.sosl()`, `tss.formula()`.
- **CI/CD workflow** — GitHub Actions build matrix (Windows / Linux / macOS / WASM).
- **WASM binaries** for all five grammars in `bindings/web/`.

### Changed

- **`soql_expression`** — Replaced naive regex with balanced-bracket rule that correctly
  handles nested subqueries.
- **Python bindings** — Migrated from deprecated `Language(path, name)` constructor to
  per-grammar `_binding_*.pyd` C extensions (requires `tree-sitter >= 0.22.0`).
- **`binding.gyp`** — Now compiles five separate C extension targets.
- **`pyproject.toml`** — Added `tree-sitter>=0.22.0` as a runtime dependency; bumped
  version to `0.2.0`.

### Migration Guide (0.1.x → 0.2.0)

**Python**: The function signatures (`apex()`, `soql()`) are unchanged. However, you must
upgrade `tree-sitter` to `>= 0.22.0`:

```sh
pip install "tree-sitter>=0.22.0" "tree-sitter-salesforce==0.2.0"
```

**Node.js**: No breaking changes. New exports: `apexAnon`, `sosl`, `formula`.
```

---

## Sub-Task 18.5 — Update `docs/03-understanding-apex.md`

Append the following two sections to the existing file:

```markdown
## Multi-SObject `when` Clause Patterns

Salesforce Apex allows a `switch on` statement to match multiple SObject types in a single
`when` clause:

```apex
switch on genericSObject {
    when Account a, Contact c {
        // Both Account and Contact are bound here
        System.debug(a?.Name ?? c?.Name);
    }
    when Opportunity o { }
    when else { }
}
```

In the AST, each comma-separated type pattern becomes a `when_type_pattern` node with
`type` and `name` fields:

```
(when_clause
  (when_type_pattern type: (type_identifier) name: (identifier))  ; Account a
  (when_type_pattern type: (type_identifier) name: (identifier))  ; Contact c
  body: (block …))
```

## Anonymous Apex vs. Class-Based Apex

The `apex_anon` grammar parses top-level statements without a class wrapper. Use it
when analysing scripts from:
- **Developer Console** Execute Anonymous window
- **`sf apex run`** / **`sfdx force:apex:execute`**
- Data migration and CI seed scripts

```python
import tree_sitter_salesforce as tss
from tree_sitter import Language, Parser

parser = Parser()

# Class-based Apex → use tss.apex()
parser.language = Language(tss.apex())

# Anonymous Apex → use tss.apex_anon()
parser.language = Language(tss.apex_anon())
tree = parser.parse(b"insert new Account(Name = 'Test');\nSystem.debug('done');")
```

Both grammars share the same `statement`, `expression`, and `type` rules. The only
difference is the `source_file` entry point.
```

---

## Sub-Task 18.6 — Update `docs/04-understanding-soql.md`

Append a new section covering the constructs added in Step 11:

```markdown
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

### WITH DATA CATEGORY

```soql
SELECT Id, Title
FROM KnowledgeArticleVersion
WITH DATA CATEGORY Geography__c AT USA__c
```

Supported operators: `AT`, `ABOVE`, `BELOW`, `ABOVE_OR_BELOW`.
Multiple category filters are comma-separated.
```

---

## Sub-Task 18.7 — Create `docs/11-understanding-sosl.md`

```markdown
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

```
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

```
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
from tree_sitter import Language, Parser

parser = Parser()
parser.language = Language(tss.sosl())
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
```

---

## Sub-Task 18.8 — Create `docs/12-understanding-formula.md`

```markdown
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

```
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
| `$CustomMetadata` | CMDT records | `$CustomMetadata.Config__mdt.Default.Value__c` |
| `$Setup` | Custom Settings | `$Setup.AppConfig__c.Discount__c` |
| `$GlobalConstant` | True / False / EmptyString | `$GlobalConstant.True` |
| `$ObjectType` | Schema metadata | `$ObjectType.Account.Fields.Name` |

## Built-in Functions (Selected)

| Category | Functions |
|---|---|
| Logical | `IF`, `IFS`, `CASE`, `AND`, `OR`, `NOT` |
| Null/Blank | `ISBLANK`, `ISNULL`, `BLANKVALUE`, `NULLVALUE` |
| Picklist | `ISPICKVAL`, `INCLUDES`, `EXCLUDES`, `TEXT` |
| Field Change | `ISCHANGED`, `ISNEW`, `PRIORVALUE` |
| Math | `ABS`, `CEILING`, `FLOOR`, `ROUND`, `SQRT`, `MOD`, `POWER` |
| Text | `LEFT`, `RIGHT`, `MID`, `LEN`, `TRIM`, `SUBSTITUTE`, `REGEX`, `FIND` |
| Date/Time | `DATE`, `TODAY`, `NOW`, `YEAR`, `MONTH`, `DAY`, `ADDMONTHS` |
| Lookup | `VLOOKUP` |
| Format | `FORMAT`, `HYPERLINK`, `IMAGE` |

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

### Formula Field — nested IF

```formula
IF(Amount > 100000, 'Enterprise',
  IF(Amount > 10000, 'Mid-Market', 'SMB'))
```

### Flow Criteria — check running user role

```formula
$UserRole.DeveloperName = 'Sales_Manager' || $Profile.Name = 'System Administrator'
```

## AST Structure

```
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
from tree_sitter import Language, Parser

parser = Parser()
parser.language = Language(tss.formula())

tree = parser.parse(b"IF(ISBLANK(Email__c), 'Required', $User.Name & ': ' & Email__c)")
root = tree.root_node

# Inspect the top-level function call
fn = root.child(0)
print(fn.type)                        # → function_call
print(fn.child_by_field_name("name").text.decode())  # → IF
```
```

---

## Sub-Task 18.9 — Create `docs/13-understanding-anonymous-apex.md`

```markdown
# Understanding Anonymous Apex

Anonymous Apex refers to Apex code executed **without a class or trigger wrapper**.
It runs directly in the current user context and is not stored as metadata in the org.

## Common Entry Points

| Tool | Command |
|---|---|
| Developer Console | Execute Anonymous window (Ctrl+E) |
| VS Code (Salesforce Extension Pack) | Right-click → SFDX: Execute Anonymous Apex |
| CLI | `sf apex run --file myscript.apex` |
| Tooling API | `ExecuteAnonymous` endpoint |

## How It Differs from Class-Based Apex

```apex
// CLASS-BASED Apex (.cls) — requires declaration wrapper
public class AccountService {
    public void run() {
        insert new Account(Name = 'Test');
    }
}

// ANONYMOUS Apex (.apex) — top-level statements directly
insert new Account(Name = 'Test');
System.debug('Done');
```

## Grammar Selection

This project provides **two separate grammar definitions** for Apex:

| Grammar | Module | File Types | Entry Point |
|---|---|---|---|
| `apex` | `tss.apex()` | `.cls`, `.trigger` | `repeat($.declaration)` |
| `apex_anon` | `tss.apex_anon()` | `.apex` | `repeat1($.statement)` |

> **Why two grammars?** A single grammar with `choice(declarations, statements)` at the
> root creates irresolvable parsing conflicts — the parser cannot decide from the first
> token alone which branch to take. Two separate grammars with distinct entry points is
> the idiomatic tree-sitter pattern for this situation.

## What Is Valid in Anonymous Apex

Everything valid as a statement in a method body is valid at the top level:

- Variable declarations: `String s = 'hello';`
- DML: `insert rec;`, `update records;`, `delete old;`
- Method calls: `System.debug(msg);`
- SOQL for loops: `for (Account a : [SELECT Id FROM Account]) { … }`
- Control flow: `if`, `for`, `while`, `switch on`, `try/catch`
- Class instantiation: `MyClass inst = new MyClass();`

What is NOT valid:
- Class declarations (`public class Foo {}` — use the `apex` grammar)
- Trigger declarations
- Interface or enum declarations at the file level

## Using the Parser

```python
import tree_sitter_salesforce as tss
from tree_sitter import Language, Parser

parser = Parser()
parser.language = Language(tss.apex_anon())

script = b"""
List<Account> accounts = [SELECT Id, Name FROM Account LIMIT 10];
for (Account a : accounts) {
    System.debug('Account: ' + a.Name);
}
"""

tree = parser.parse(script)
assert not tree.root_node.has_error

# The root is source_file containing statements directly
root = tree.root_node
print(root.type)         # → source_file
print(root.child_count)  # → 2 (local_variable_declaration, enhanced_for_statement)
```

## SOQL and SOSL in Anonymous Apex

Anonymous Apex supports inline SOQL and SOSL just like class-based Apex:

```apex
// Both parsers support injection
List<Account> accts = [SELECT Id FROM Account];
List<List<SObject>> results = [FIND 'Acme' IN ALL FIELDS RETURNING Account(Name)];
```

The `apex_anon` grammar inherits the same `soql_expression` and `sosl_expression` rules
from `apex/grammar.js`, so injection works identically.
```

---

## Sub-Task 18.10 — Create `docs/10-release-process.md`

```markdown
# Release Process

This document describes how to cut a new release of `tree-sitter-salesforce`.

## Prerequisites

- All grammar steps (10–17) complete and merged to `main`
- All CI checks green on `main`
- `sf-rag-engine` regression tests confirmed passing

## Release Checklist

### 1. Version Bump

Update version in both files **to match**:

```sh
# pyproject.toml
version = "0.X.Y"

# package.json
"version": "0.X.Y"
```

### 2. Update CHANGELOG.md

Move items from the `[Unreleased]` section to a new version heading:
```markdown
## [0.X.Y] — YYYY-MM-DD
```

### 3. Verify Locally

```cmd
node scripts/test-all.js
python scripts/test_bindings.py
npm publish --dry-run
```

All must exit code 0.

### 4. Commit and Tag

```sh
git add pyproject.toml package.json CHANGELOG.md
git commit -m "chore: release v0.X.Y"
git tag v0.X.Y
git push origin main --tags
```

### 5. Monitor CI

Open the Actions tab. The `release.yml` workflow triggers automatically on the tag push.
Watch for:
- ✅ `build-wheels` — all 3 OS × 4 Python versions
- ✅ `build-wasm` — 5 WASM binaries
- ✅ `publish-pypi` — wheel upload
- ✅ `publish-npm` — npm publish

### 6. Verify Published Packages

```sh
# PyPI
pip install "tree-sitter-salesforce==0.X.Y"
python -c "import tree_sitter_salesforce as tss; tss.apex(); print('OK')"

# npm
npm install tree-sitter-salesforce@0.X.Y
node -e "const s = require('tree-sitter-salesforce'); console.log(Object.keys(s))"
```

### 7. Create GitHub Release

- Go to the repository Releases page
- Click "Draft a new release"
- Select the new tag
- Paste the CHANGELOG entry as the release notes
- Attach the WASM artifacts from the CI run
```

---

## Sub-Task 18.11 — Update `docs/09-getting-started-tutorial.md`

Append a new section at the end of the existing tutorial file with examples for the
three new grammars:

```markdown
---

## Using the New Grammars (Steps 10–17)

### Parsing a SOSL Search Expression

```python
import tree_sitter_salesforce as tss
from tree_sitter import Language, Parser

parser = Parser()
parser.language = Language(tss.sosl())

tree = parser.parse(b"FIND 'Acme*' IN ALL FIELDS RETURNING Account(Name, BillingCity ORDER BY Name) LIMIT 20")

root = tree.root_node
print("Parse successful:", not root.has_error)
print("Root type:", root.type)         # → source_file
print("Query node:", root.child(0).type) # → sosl_query
```

### Parsing a Formula Language Expression

```python
parser.language = Language(tss.formula())

# Validation rule formula
tree = parser.parse(b"""
AND(
  NOT(ISBLANK(Email__c)),
  REGEX(Email__c, "[a-zA-Z0-9._]+@[a-zA-Z]+\\.[a-zA-Z]{2,}")
)
""".strip())

print("Formula parse ok:", not tree.root_node.has_error)
fn = tree.root_node.child(0)
print("Function:", fn.child_by_field_name("name").text.decode())  # → AND
```

### Parsing an Anonymous Apex Script

```python
parser.language = Language(tss.apex_anon())

tree = parser.parse(b"""
List<Account> accounts = [SELECT Id, Name FROM Account WHERE IsActive__c = true LIMIT 5];
for (Account a : accounts) {
    a.Description = 'Processed by script';
}
update accounts;
System.debug('Updated ' + accounts.size() + ' records');
""".strip())

print("Anonymous Apex ok:", not tree.root_node.has_error)
root = tree.root_node
print("Top-level statements:", root.child_count)
```
```

---

## How to Test This Step

Documentation steps are verified by reading and by mechanical checks, not by running code.

### 1. Verify all new files exist

```cmd
dir docs\*.md
```

Must list: `10-release-process.md`, `11-understanding-sosl.md`,
`12-understanding-formula.md`, `13-understanding-anonymous-apex.md`.

### 2. Verify README links resolve

Open `README.md` and click every documentation link. Each must open a file that exists.

### 3. Verify code examples in docs are runnable

Run the code blocks in `docs/11-understanding-sosl.md`, `docs/12-understanding-formula.md`,
and `docs/13-understanding-anonymous-apex.md` through the Python interpreter:

```cmd
python -c "
import tree_sitter_salesforce as tss
from tree_sitter import Language, Parser
p = Parser()
p.language = Language(tss.sosl())
t = p.parse(b\"FIND 'Acme' IN ALL FIELDS RETURNING Account(Name)\")
assert not t.root_node.has_error, 'SOSL example broken'

p.language = Language(tss.formula())
t = p.parse(b\"IF(ISBLANK(Email__c), 'Required', Email__c)\")
assert not t.root_node.has_error, 'Formula example broken'

p.language = Language(tss.apex_anon())
t = p.parse(b\"System.debug('Hello');\")
assert not t.root_node.has_error, 'apex_anon example broken'
print('All doc examples: OK')
"
```

### 4. Spell-check and link-check (optional but recommended)

```cmd
npx markdown-link-check README.md
npx markdown-link-check ARCHITECTURE.md
```

---

## Success Criteria

| # | Criterion | How to Verify |
|---|---|---|
| 1 | `README.md` shows 5 grammars in Parser Status table | Read the file |
| 2 | `README.md` Quick Start includes `tss.sosl()` and `tss.formula()` examples | Read the file |
| 3 | `ARCHITECTURE.md` mentions `apex-anon` grammar and explains the two-grammar design | Read the file |
| 4 | `SALESFORCE_API.md` has SOSL and Formula Language sections | Read the file |
| 5 | `CHANGELOG.md` has a `[0.2.0]` entry listing all new features | Read the file |
| 6 | `docs/11-understanding-sosl.md` exists and code examples run without error | Run Python snippet above |
| 7 | `docs/12-understanding-formula.md` exists and code examples run without error | Run Python snippet above |
| 8 | `docs/13-understanding-anonymous-apex.md` exists and explains the two-grammar design | Read the file |
| 9 | `docs/10-release-process.md` exists with a complete release checklist | Read the file |
| 10 | All links in `README.md` resolve to existing files | Click-test or `markdown-link-check` |

---

## Regression Risk

**None for grammar or bindings.** This step only edits Markdown files and adds new ones.

---

## API Contract Impact

**None.** Documentation only.

---

## Final State After This Step

The repository will be in the fully documented state described in
[ARCHITECTURE.md](../../ARCHITECTURE.md). All four grammars
(Apex, SOQL, SOSL, Formula) plus the Anonymous Apex variant are implemented, tested,
published, and documented. The project is ready for consumption by `sf-rag-engine` and
any other tooling that needs deterministic Salesforce language parsing.
