# Architecture Blueprint: Tree-Sitter Salesforce Multi-Grammar Engine

## Project Scope & Architectural Mission

The `tree-sitter-salesforce` project provides the low-level, high-performance, deterministic parsing foundation for the entire Salesforce static analysis ecosystem. It compiles grammar definitions into native C parsers and exposes first-class bindings for Python, Node.js, and WebAssembly (WASM).

- **Target Platform:** Salesforce API v67.0 (Summer '25)
- **Grammar Ecosystem:** Apex, Anonymous Apex, SOQL, SOSL, and Salesforce Formula Language
- **Design Philosophy:** Fast, incremental, error-tolerant parsing with zero speculative ambiguities.

---

## Repository Structure

```
tree-sitter-salesforce/
│
├── 📄 README.md                          # Project overview, quickstart, status
├── 📄 LICENSE                            # MIT
├── 📄 NOTICE                             # Third-party attributions
├── 📄 CONTRIBUTING.md                    # How to contribute or add a new parser
├── 📄 ARCHITECTURE.md                    # Comprehensive architecture blueprint (this document)
├── 📄 CHANGELOG.md                       # Version history with SF API mapping
├── 📄 SALESFORCE_API.md                  # API v67 compatibility matrix & feature inventory
│
├── 📄 package.json                       # Root npm config: scripts, devDependencies
├── 📄 tree-sitter.json                   # Tree-sitter multi-grammar manifest
├── 📄 pyproject.toml                     # Python package config (py-tree-sitter >= 0.22.0)
├── 📄 binding.gyp                        # Node.js native binding build manifest (5 targets)
│
├── 📁 docs/                              # Educational documentation & guides
│   ├── 📄 00-how-tree-sitter-works.md    # Conceptual guide: what is tree-sitter?
│   ├── 📄 01-project-setup.md            # Environment setup instructions
│   ├── 📄 02-grammar-dsl-cheatsheet.md   # Quick reference for grammar.js functions
│   ├── 📄 03-understanding-apex.md       # Apex language overview for parser authors
│   ├── 📄 03b-understanding-anonymous-apex.md # Anonymous Apex guide
│   ├── 📄 04-understanding-soql.md       # SOQL language overview for parser authors
│   ├── 📄 05-adding-new-language.md      # Step-by-step guide to add a new parser
│   ├── 📄 06-testing-guide.md            # How to write and run tests
│   ├── 📄 06b-understanding-formula.md   # Formula language overview
│   ├── 📄 07-queries-and-highlights.md   # How syntax highlighting queries work
│   ├── 📄 08-troubleshooting.md          # Common errors and how to fix them
│   ├── 📄 09-getting-started-tutorial.md # End-to-end tutorial with code examples
│   ├── 📄 10-release-process.md          # Multi-platform release process & checklist
│   ├── 📄 11-understanding-sosl.md       # SOSL search language overview
│   ├── 📄 12-understanding-formula.md    # Formula language overview
│   ├── 📄 13-understanding-anonymous-apex.md # Anonymous Apex scripting mode guide
│   └── 📁 steps/                         # Historical implementation step blueprints
│
├── 📁 common/                            # Shared grammar utilities
│   ├── 📄 common.js                      # Reusable DSL helpers (ci, commaJoined, etc.)
│   └── 📄 salesforce-types.js            # Shared Salesforce type definitions
│
├── 📁 apex/                              # Apex parser (.cls, .trigger)
│   ├── 📄 grammar.js                     # Apex grammar definition
│   ├── 📁 src/                           # Auto-generated C parser (parser.c)
│   ├── 📁 test/corpus/                   # Test corpus suites
│   └── 📁 queries/                       # Highlights, tags, locals, injections
│
├── 📁 apex-anon/                         # Anonymous Apex parser (.apex, CLI, Dev Console)
│   ├── 📄 grammar.js                     # Anonymous Apex grammar definition
│   ├── 📁 src/                           # Auto-generated C parser (parser.c)
│   ├── 📁 test/corpus/                   # Test corpus suites
│   └── 📁 queries/                       # Highlights, locals, injections
│
├── 📁 soql/                              # SOQL query parser (.soql)
│   ├── 📄 grammar.js                     # SOQL grammar definition
│   ├── 📁 src/                           # Auto-generated C parser (parser.c)
│   ├── 📁 test/corpus/                   # Test corpus suites
│   └── 📁 queries/                       # Highlights
│
├── 📁 sosl/                              # SOSL search parser (.sosl)
│   ├── 📄 grammar.js                     # SOSL grammar definition
│   ├── 📁 src/                           # Auto-generated C parser (parser.c)
│   ├── 📁 test/corpus/                   # Test corpus suites
│   └── 📁 queries/                       # Highlights
│
├── 📁 formula/                           # Formula Language parser (.formula)
│   ├── 📄 grammar.js                     # Formula grammar definition
│   ├── 📁 src/                           # Auto-generated C parser (parser.c)
│   ├── 📁 test/corpus/                   # Test corpus suites
│   └── 📁 queries/                       # Highlights
│
└── 📁 bindings/                          # Language-specific bindings
    ├── 📁 node/                          # Node.js N-API binding
    ├── 📁 python/                        # Python PyCapsule native binding (nanobind)
    └── 📁 web/                           # Emscripten WASM binaries & web loader
```

---

## Data Flow & Compilation Stack

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                       TREE-SITTER SALESFORCE MULTI-GRAMMAR STACK                            │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
  1. Grammar Definition Layer (DSL in JavaScript & Shared Common Rules)
     ├── common/common.js      (Case-insensitivity, commaJoined, shared operators)
     ├── apex/grammar.js       (Classes, Triggers, Enums, Interfaces, DML, Switch/When)
     ├── apex-anon/grammar.js  (Top-level statement scripts, Dev Console, CLI)
     ├── soql/grammar.js       (SELECT, FROM, WHERE, WITH USER_MODE, TYPEOF, Subqueries)
     ├── sosl/grammar.js       (FIND ... IN ... RETURNING ... WITH ...)
     └── formula/grammar.js    (Validation Rules, Formula Fields, Flow Expressions)
                                        │
                                        ▼ tree-sitter generate
  2. Native C Parsing Engine (Auto-generated LR/GLR Parsers)
     ├── apex/src/parser.c
     ├── apex-anon/src/parser.c
     ├── soql/src/parser.c
     ├── sosl/src/parser.c
     └── formula/src/parser.c
                                        │
                                        ▼ Tree-sitter Queries (.scm) & Compilers
  3. Language Injection & Query Layer
     ├── Highlights:           highlights.scm (Token classification for syntax coloring)
     ├── Injections:           injections.scm (SOQL/SOSL embedded in Apex & Database.* strings)
     ├── Scopes & Locals:      locals.scm (Lexical scopes, definition & reference tracking)
     └── Code Navigation:      tags.scm (Symbol definitions for ctags & LSP navigation)
                                        │
                                        ▼ Native & Web Assembly Compilers
  4. Multi-Language Binding & Distribution Layer
     ├── Python Bindings:      bindings/python/ (PyCapsule C extensions: _binding_*.pyd/.so)
     ├── Node.js Bindings:     bindings/node/ (node-gyp N-API C++ addon: tree_sitter_salesforce.node)
     ├── WASM Web Bindings:    bindings/web/ (Emscripten WebAssembly: tree-sitter-*.wasm)
     └── Native Binaries:      Windows MSVC (x64), Linux GCC (x86_64, aarch64), macOS Clang (arm64, x64)
                                        │
                                        ▼
  5. Downstream Consumers
     ├── IDEs & Editors:       Neovim, VS Code, Helix, Zed, Cursor, Dev Console
     └── Analysis Pipelines:   Linters, Static Analyzers, Security Scanners, RAG Vectorizers
```

---

## 1. Multi-Grammar Architecture & Specifications

### 1.1 Apex Grammar (`apex/grammar.js`)

The Apex grammar parses `.cls` and `.trigger` files into strictly typed Abstract Syntax Trees (ASTs) adhering to API v67.0.

* **Declarations:** `class_declaration`, `interface_declaration`, `enum_declaration`, `trigger_declaration`.
* **Apex Modifiers:** Access modifiers (`public`, `private`, `protected`, `global`), sharing modifiers (`with sharing`, `without sharing`, `inherited sharing`), definition modifiers (`static`, `final`, `override`, `virtual`, `abstract`, `transient`, `testMethod`).
* **Modern Operators (v67):** Safe Navigation (`?.`), Null Coalescing (`??`), Ternary (`? :`), Bitwise & Shift operators.
* **Statements & Control Flow:** `switch on` with multi-SObject type patterns (`when Account a, Contact c { ... }`), `if/else`, `while`, `do..while`, standard/enhanced `for`, `try/catch/finally`, `throw`, `runAs`.
* **Apex DML Operations:** `insert`, `update`, `delete`, `upsert`, `undelete`, `merge`.
* **Structured Query Embeddings:** Balanced bracket parsing for inline `soql_expression` (`[SELECT ...]`) and `sosl_expression` (`[FIND ...]`) without premature token truncation.

---

### 1.2 Anonymous Apex Grammar (`apex-anon/grammar.js`)

Anonymous Apex represents scripts executed without an enclosing class or trigger wrapper (e.g. Developer Console Execute Anonymous, `sf apex run`, data fix scripts).

* **Entry Point:** `repeat1($.statement)` instead of `repeat($.declaration)`.
* **Statement Support:** All valid Apex statements (local variable declarations, DML statements, SOQL for loops, method invocations, control flow) are valid at the root level.
* **Why Two Grammars?** A single grammar with `choice(declarations, statements)` at the root creates irresolvable GLR conflicts — the parser cannot decide from the first token alone whether a modifier like `public` introduces a class or a statement-level construct. Two separate grammars with clean entry points is the idiomatic, deterministic Tree-sitter architecture.

---

### 1.3 SOQL Grammar (`soql/grammar.js`)

The SOQL grammar parses standalone `.soql` files and embedded inline SOQL expressions.

* **Core Clauses:** `SELECT`, `FROM`, `USING SCOPE`, `WHERE`, `WITH USER_MODE / WITH SYSTEM_MODE / WITH SECURITY_ENFORCED / WITH DATA CATEGORY`, `GROUP BY`, `GROUP BY ROLLUP`, `GROUP BY CUBE`, `HAVING`, `ORDER BY`, `LIMIT`, `OFFSET`, `FOR UPDATE / FOR VIEW / FOR REFERENCE`, `UPDATE TRACKING / UPDATE VIEWSTAT`.
* **Polymorphic Queries:** Full `TYPEOF` expression support:
  ```soql
  SELECT TYPEOF What WHEN Account THEN CleanStatus WHEN Opportunity THEN StageName ELSE Name END FROM Task
  ```
* **Aggregate Functions:** `COUNT()`, `COUNT(Id)`, `COUNT_DISTINCT()`, `SUM()`, `AVG()`, `MIN()`, `MAX()`, `GROUPING()`.
* **Date Literals & Date Functions:** `YESTERDAY`, `TODAY`, `TOMORROW`, `LAST_N_DAYS:n`, `CALENDAR_MONTH()`, `CALENDAR_QUARTER()`, `CALENDAR_YEAR()`, `DAY_IN_MONTH()`, `DAY_IN_WEEK()`, `DAY_IN_YEAR()`, `FISCAL_MONTH()`, `FISCAL_QUARTER()`, `FISCAL_YEAR()`, `HOUR_IN_DAY()`, `WEEK_IN_MONTH()`, `WEEK_IN_YEAR()`.
* **Scalar Functions:** `convertCurrency()`, `toLabel()`, `FORMAT()`, `FIELDS(ALL / CUSTOM / STANDARD)`.
* **Relationship Subqueries & Bind Variables:** Multi-level child subqueries `(SELECT LastName FROM Contacts)` and bind expressions `:apexVariable`, `:recordId`, `:customMap.key`.

---

### 1.4 SOSL Grammar (`sosl/grammar.js`)

The SOSL grammar parses standalone `.sosl` files and embedded `[FIND ...]` search queries.

* **Search Query:** String literals with wildcards (`'Acme*'`) and bind variables (`:searchQuery`).
* **Search Scopes:** `IN ALL FIELDS`, `IN NAME FIELDS`, `IN EMAIL FIELDS`, `IN PHONE FIELDS`, `IN SIDEBAR FIELDS`.
* **Returning Clauses:** Per-object target specifications with field selections, dedicated `WHERE` filters, `ORDER BY`, `LIMIT`, and `OFFSET`:
  ```sosl
  FIND 'Acme*' IN ALL FIELDS RETURNING Account(Id, Name WHERE BillingCountry = 'US' ORDER BY Name LIMIT 10), Contact(Email)
  ```
* **Search Modifiers:** `WITH HIGHLIGHT`, `WITH SNIPPET`, `WITH SPELL_CORRECTION`, `WITH DIVISION = '...'`, `WITH DATA CATEGORY ...`, `WITH NETWORK = '...'`, `WITH METADATA = '...'`.

---

### 1.5 Salesforce Formula Language Grammar (`formula/grammar.js`)

The Formula Language grammar parses declarative expressions used in Validation Rules, Formula Fields, Flow Decision Criteria, and Process Builder.

* **Single Expression Architecture:** Root node is `$._expression` (no statement blocks or class declarations).
* **Case-Insensitive Built-in Functions (50+ Platform Functions):**
  - *Logical:* `IF`, `IFS`, `CASE`, `AND`, `OR`, `NOT`, `XOR`
  - *Null & Blank Checks:* `ISBLANK`, `ISNULL`, `BLANKVALUE`, `NULLVALUE`
  - *Picklist & Text:* `ISPICKVAL`, `ISPICKVALMULTISELECT`, `TEXT`, `VALUE`, `INCLUDES`, `EXCLUDES`, `LEFT`, `RIGHT`, `MID`, `LEN`, `TRIM`, `SUBSTITUTE`, `FIND`, `CONTAINS`, `BEGINS`, `UPPER`, `LOWER`, `PROPER`, `LPAD`, `RPAD`, `REVERSE`
  - *Math:* `ABS`, `CEILING`, `FLOOR`, `ROUND`, `MCEILING`, `MFLOOR`, `MAX`, `MIN`, `MOD`, `SQRT`, `EXP`, `LN`, `LOG`, `POWER`
  - *Date & Time:* `DATE`, `DATEVALUE`, `DATETIMEVALUE`, `TIMEVALUE`, `TODAY`, `NOW`, `YEAR`, `MONTH`, `DAY`, `HOUR`, `MINUTE`, `SECOND`, `ADDMONTHS`, `WEEKDAY`
  - *Context & Historical:* `ISCHANGED`, `ISNEW`, `PRIORVALUE`, `VLOOKUP`, `FORMAT`, `REGEX`, `HYPERLINK`, `IMAGE`
* **Field Path & Global Context Navigation:**
  - Multi-hop relationship traversal: `Account.Parent.BillingState`
  - Platform global variables: `$User.ProfileId`, `$UserRole.Name`, `$Organization.Id`, `$CustomMetadata.Type__mdt.Record.Field__c`, `$Setup.AppConfig__c.Discount__c`, `$GlobalConstant.True`
* **Operator Precedence Matrix (Highest to Lowest):**

| Level | Operators | Associativity | Description |
|---|---|---|---|
| **10** | `.` | Left | Field & Global Reference Path |
| **9** | `+`, `-`, `!` | Unary (Right) | Unary Plus, Minus, Logical NOT |
| **8** | `^` | Right | Exponentiation (Power) |
| **7** | `*`, `/` | Left | Multiplication, Division |
| **6** | `+`, `-` | Left | Addition, Subtraction |
| **5** | `&` | Left | String Concatenation |
| **4** | `=`, `==`, `<>`, `!=`, `<`, `<=`, `>`, `>=` | Left | Comparison & Equality |
| **3** | `!`, `NOT(...)` | Unary | Logical NOT |
| **2** | `&&`, `AND(...)` | Left | Logical AND |
| **1** | `\|\|`, `OR(...)` | Left | Logical OR |

---

## 2. Language Injection & Query Architecture

Tree-sitter uses query files (`.scm`) for token classification, code navigation, and nested language injection:

```
<grammar>/queries/
├── highlights.scm     # Syntax highlighting tokens (keywords, types, methods, strings)
├── injections.scm     # SOQL & SOSL multi-language embedding inside Apex
├── locals.scm         # Lexical scope, definition, and reference tracking
└── tags.scm           # Code navigation symbols (definitions and references for ctags/LSP)
```

### Language Injection Model (`apex/queries/injections.scm`)

```
Apex / Anonymous Apex Source Code:
┌────────────────────────────────────────────────────────────────────────┐
│  List<Account> accts = [SELECT Id FROM Account WHERE ...];             │
│                        ▲                                 ▲             │
│                        │    SOQL injection boundary      │             │
│                        └─────────────────────────────────┘             │
│                                                                        │
│  List<List<SObject>> s = [FIND 'Acme*' IN ALL FIELDS RETURNING ...];   │
│                          ▲                                         ▲   │
│                          │     SOSL injection boundary             │   │
│                          └─────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘

Apex Parser sees:          soql_expression / sosl_expression (opaque)
                                   │
                           injections.scm query
                                   │
                                   ▼
Injected Parser:           Full SOQL or SOSL syntax tree inside the node
```

### Injection Tiers:

1. **Tier 1 (Static Inline Queries):**
   ```scheme
   ; Static inline SOQL
   ((soql_expression) @injection.content
     (#set! injection.language "soql"))

   ; Static inline SOSL
   ((sosl_expression) @injection.content
     (#set! injection.language "sosl"))
   ```

2. **Tier 2 (Database API String Literals):**
   ```scheme
   ; Database.query('SELECT ...')
   ((method_invocation
     object: (identifier) @_obj
     name: (identifier) @_method
     arguments: (argument_list (string_literal) @injection.content))
     (#eq? @_obj "Database")
     (#match? @_method "^(query|countQuery|getQueryLocator|queryWithBinds)$")
     (#set! injection.language "soql"))
   ```

3. **Tier 3 (Dynamic Query Concatenation):**
   Structural recognition for runtime constructed queries.

---

## 3. Native Compilation & Multi-Platform Distribution

### 3.1 Python Bindings Architecture (`py-tree-sitter >= 0.22.0`)

Modernized Python binding layer utilizing native `PyCapsule` C extensions compiled per grammar (`_binding_apex.pyd`, `_binding_soql.pyd`, etc.):

* **Zero ctypes overhead:** Directly passes native `TSLanguage *` pointers through PyCapsules.
* **64-bit safe:** Eliminates Windows 64-bit integer overflow issues with function pointers.
* **Loaders:**
  ```python
  import tree_sitter_salesforce as tss
  from tree_sitter import Language, Parser

  parser = Parser()
  parser.language = tss.apex()        # Apex
  parser.language = tss.apex_anon()   # Anonymous Apex
  parser.language = tss.soql()        # SOQL
  parser.language = tss.sosl()        # SOSL
  parser.language = tss.formula()     # Formula Language
  ```

### 3.2 Node.js Bindings (`binding.gyp`)

Compiled via N-API into a single native extension exporting all 5 language parsers:
```javascript
const { apex, apexAnon, soql, sosl, formula } = require('tree-sitter-salesforce');
```

### 3.3 WebAssembly (WASM) Bindings

Compiled via Emscripten into standalone `.wasm` binaries for browser, VS Code Web, and cloud IDEs:
```javascript
const { apexWasm, soqlWasm, soslWasm, formulaWasm, apexAnonWasm } = require('tree-sitter-salesforce/bindings/web');
```

### 3.4 Cross-Platform Compilation Matrix

Automated GitHub Actions CI/CD matrix validates builds on:
- **Windows:** MSVC x64 (`.pyd` / `.node`)
- **Linux:** GCC x86_64, aarch64 (`.so` / `.node`)
- **macOS:** Clang x86_64, Apple Silicon arm64 (`.dylib` / `.node`)
- **WebAssembly:** Emscripten 3.x (`.wasm`)

---

## 4. Test Corpus & Regression Suite Taxonomy

All grammars maintain extensive golden corpus test suites in `<grammar>/test/corpus/`:

```
tree-sitter-salesforce/
├── apex/test/corpus/
│   ├── declarations.txt       # Classes, interfaces, enums, triggers
│   ├── methods.txt            # Methods, constructors, properties, accessors
│   ├── expressions.txt        # Safe navigation, null coalescing, operators
│   ├── statements.txt         # Switch/when, loops, DML, try/catch/finally
│   ├── annotations.txt        # Built-in and custom annotations
│   ├── generics.txt           # Parameterized types and collections
│   └── anonymous_scripts.txt  # Top-level standalone statements
├── apex-anon/test/corpus/
│   └── scripts.txt            # Standalone DML, loops, and SOQL scripts
├── soql/test/corpus/
│   ├── basic_queries.txt      # SELECT, FROM, WHERE, LIMIT
│   ├── subqueries.txt         # Child subqueries & WHERE IN subqueries
│   ├── typeof_clauses.txt     # Polymorphic TYPEOF queries
│   ├── security_clauses.txt   # WITH USER_MODE, SYSTEM_MODE, DATA CATEGORY
│   └── aggregate_queries.txt  # GROUP BY ROLLUP, CUBE, HAVING, date functions
├── sosl/test/corpus/
│   ├── basic_searches.txt     # FIND ... RETURNING ...
│   └── scoped_searches.txt    # IN ALL FIELDS, WITH HIGHLIGHT, SNIPPET
└── formula/test/corpus/
    ├── validation_rules.txt   # Complex cross-object validation formulas
    ├── formula_fields.txt     # Arithmetic and string concatenation formulas
    └── flow_criteria.txt      # Flow decision logic and picklist checks
```

---

## 5. Quality Standards & Engineering Guardrails

1. **Zero-Error Parsing Benchmark:** Valid Salesforce code matching API v67 must parse cleanly with 0 `(ERROR)` or `(MISSING)` nodes.
2. **Deterministic Precedence:** Resolve all ambiguities via explicit precedence rules (`prec.left`, `prec.right`, `prec.dynamic`) rather than speculative `conflicts` array growth.
3. **Spec Alignment:** All syntax features must directly reference the official Salesforce Language Reference Manuals.
4. **Cross-Platform Determinism:** S-expression AST trees, byte offsets, and token boundaries must produce identical output across Windows, Linux, macOS, and WebAssembly.
