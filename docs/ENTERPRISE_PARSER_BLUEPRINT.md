# Enterprise Parser Blueprint: Tree-Sitter Salesforce Multi-Grammar Engine

## Project Scope & Architectural Mission

The `tree-sitter-salesforce` project provides the low-level, high-performance, deterministic parsing foundation for the entire Salesforce static analysis ecosystem. It compiles grammar definitions into native C parsers and exposes bindings for Python, Node.js, and WebAssembly (WASM).

**Repository:** `d:\Git\tree-sitter-salesforce`  
**Target Platform:** Salesforce API v67.0 (Summer '25)  
**Grammar Ecosystem:** Apex, SOQL, SOSL, and Salesforce Formula Language  

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                       TREE-SITTER SALESFORCE MULTI-GRAMMAR STACK                            │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
  1. Grammar Definition Layer (DSL in JavaScript)
     ├─ apex/grammar.js       (Classes, Triggers, Enums, Interfaces, Anonymous Scripts)
     ├─ soql/grammar.js       (SELECT, FROM, WHERE, WITH USER_MODE, TYPEOF, Subqueries)
     ├─ sosl/grammar.js       (FIND ... IN ... RETURNING ... WITH ...) [NEW]
     ├─ formula/grammar.js    (Validation Rules, Formula Fields, Flow Expressions) [NEW]
     └─ common/common.js      (Case-insensitivity, Comma-lists, Shared Precedence Table)
                                        │
                                        ▼ tree-sitter generate
  2. Native C Parsing Engine
     ├─ apex/src/parser.c
     ├─ soql/src/parser.c
     ├─ sosl/src/parser.c [NEW]
     └─ formula/src/parser.c [NEW]
                                        │
                                        ▼ Language Injection Queries (injections.scm)
  3. Multi-Language Binding & Distribution Layer
     ├─ Python Bindings:      bindings/python/ (nanobind / py-tree-sitter)
     ├─ Node.js Bindings:     bindings/node/ (node-gyp / index.js)
     ├─ WASM Web Bindings:    bindings/web/ (Emscripten / tree-sitter.wasm)
     └─ Native Libraries:     .dll (Windows), .so (Linux), .dylib (macOS)
```

---

## 1. Multi-Grammar Architecture & Specifications

### 1.1 Apex Grammar (`apex/grammar.js`)
The Apex grammar parses `.cls` and `.trigger` files into strictly typed Abstract Syntax Trees (ASTs).

#### Current Capabilities:
* **Declarations:** `class_declaration`, `interface_declaration`, `enum_declaration`, `trigger_declaration`.
* **Apex Modifiers:** Access modifiers (`public`, `private`, `protected`, `global`), sharing modifiers (`with sharing`, `without sharing`, `inherited sharing`), and other modifiers (`static`, `final`, `override`, `virtual`, `abstract`, `transient`).
* **Modern Syntax:** Safe Navigation (`?.`), Null Coalescing (`??`), Switch/When on types and literals, Try/Catch/Finally.
* **Apex DML Statements:** `insert`, `update`, `delete`, `upsert`, `undelete`, `merge`.

#### Required Enhancements:
1. **Anonymous Apex Scripting Mode:**
   - Allow top-level execution scripts (as executed via Developer Console or CI scripts) by updating the root rule:
     ```javascript
     source_file: $ => choice(
       repeat1($.declaration),
       repeat1($.statement)
     )
     ```
2. **Balanced Structured `soql_expression` & `sosl_expression`:**
   - Replace the naive regex `seq("[", /[^\]]*/, "]")` with balanced delimiter parsing so inline queries with nested expressions do not prematurely terminate the node.
3. **Advanced Switch-Case Patterns:**
   - Support multiple SObject types and generic expressions in `when` clauses (`when Account a, Contact c { ... }`).

---

### 1.2 SOQL Grammar (`soql/grammar.js`)
The SOQL grammar parses standalone `.soql` files and embedded inline SOQL expressions.

#### Covered Language Constructs:
* **Clauses:** `SELECT`, `FROM`, `USING SCOPE`, `WHERE`, `WITH USER_MODE / WITH SYSTEM_MODE / WITH SECURITY_ENFORCED`, `GROUP BY`, `HAVING`, `ORDER BY`, `LIMIT`, `OFFSET`, `FOR UPDATE / FOR VIEW / FOR REFERENCE`, `UPDATE TRACKING / UPDATE VIEWSTAT`.
* **Polymorphic Queries:** `TYPEOF Owner WHEN User THEN ... WHEN Group THEN ... ELSE ... END`.
* **Aggregate Functions:** `COUNT()`, `COUNT(Id)`, `SUM()`, `AVG()`, `MIN()`, `MAX()`, `GROUPING()`.
* **Relationship Subqueries:** `(SELECT LastName FROM Contacts)`.
* **Date Literals & Functions:** `YESTERDAY`, `TODAY`, `TOMORROW`, `LAST_N_DAYS:n`, `CALENDAR_MONTH()`, `convertCurrency()`, `toLabel()`, `FORMAT()`.
* **Bind Variables:** `:apexVariable`, `:recordId`, `:customMap.key`.

---

### 1.3 SOSL Grammar (`sosl/grammar.js`) [NEW]
Salesforce Object Search Language (SOSL) is used for programmatic text searches across multiple SObjects.

#### Syntax Specification:
```javascript
sosl_expression: $ => seq(
  "[",
  ci("find"),
  field("search_query", choice($.string_literal, $.bind_variable)),
  optional(seq(
    ci("in"),
    choice(
      ci("all fields"),
      ci("name fields"),
      ci("email fields"),
      ci("phone fields"),
      ci("sidebar fields")
    )
  )),
  optional(seq(ci("returning"), commaJoined1($.sosl_returning_clause))),
  optional(seq(
    ci("with"),
    choice(
      seq(ci("division"), "=", $.string_literal),
      seq(ci("data category"), $.data_category_spec),
      ci("highlight"),
      ci("snippet"),
      ci("spell_correction")
    )
  )),
  optional(seq(ci("limit"), $.int)),
  "]"
),

sosl_returning_clause: $ => seq(
  field("sobject", $.identifier),
  optional(seq(
    "(",
    field("fields", commaJoined1($.identifier)),
    optional(seq(ci("where"), field("condition", $._where_condition))),
    optional(seq(ci("order by"), field("order", $._order_by_spec))),
    optional(seq(ci("limit"), field("limit", $.int))),
    optional(seq(ci("offset"), field("offset", $.int))),
    ")"
  ))
)
```

---

### 1.4 Salesforce Formula Grammar (`formula/grammar.js`) [NEW]
Declarative Salesforce logic (Validation Rules, Formula Fields, Flow Decision Criteria, and Process Builder) uses a distinct Formula Language.

#### Syntax Specification:
* **Function Invocations:**
  - Logic: `IF(logical_test, val_if_true, val_if_false)`, `CASE(expression, val1, result1, default_result)`.
  - Picklists: `ISPICKVAL(picklist_field, text_value)`, `TEXT(picklist_field)`.
  - Nulls: `ISBLANK(expression)`, `ISNULL(expression)`.
  - Math & Text: `ROUND()`, `FLOOR()`, `SUBSTITUTE()`, `TRIM()`, `REGEX()`, `VLOOKUP()`.
  - Context & Historical: `PRIORVALUE(field)`, `ISCHANGED(field)`, `ISNEW()`, `INCLUDES()`.
* **Field Path References:**
  - Standard/Custom Fields: `Account.Parent.BillingState`, `Opportunity.Amount`.
  - Global Context Variables: `$User.ProfileId`, `$UserRole.Name`, `$Organization.Id`.
  - Custom Metadata & Settings: `$CustomMetadata.Type__mdt.Record.Field__c`, `$Setup.AppConfig__c.Discount__c`.
* **Operators:**
  - Comparison: `=`, `==`, `<>`, `!=`, `<`, `<=`, `>`, `>=`.
  - Arithmetic: `+`, `-`, `*`, `/`, `^`.
  - Boolean: `&&`, `||`, `!`, `AND(...)`, `OR(...)`, `NOT(...)`.
  - String Concatenation: `&` and `+`.

---

## 2. Language Injection & Query Architecture

Tree-sitter uses query files (`.scm`) to handle syntax highlighting, code navigation, and inter-language nesting:

```
apex/queries/
├── highlights.scm     # Syntax highlighting tokens (keywords, types, methods, strings)
├── injections.scm     # SOQL & SOSL multi-language embedding
├── locals.scm         # Lexical scope and variable definition tracking
└── tags.scm           # Code navigation symbols (definitions and references)
```

### Injection Model (`injections.scm`):
```scheme
; TIER 1: Inline Static SOQL
((soql_expression) @injection.content
  (#set! injection.language "soql"))

; TIER 1: Inline Static SOSL
((sosl_expression) @injection.content
  (#set! injection.language "sosl"))

; TIER 2: Database.query() String Literals
((method_invocation
  object: (identifier) @_obj
  name: (identifier) @_method
  arguments: (argument_list (string_literal) @injection.content))
  (#eq? @_obj "Database")
  (#match? @_method "^(query|countQuery|getQueryLocator|queryWithBinds)$")
  (#set! injection.language "soql"))
```

---

## 3. Native Compilation & Multi-Platform Distribution

### 3.1 Python Bindings Architecture
Modernize the Python binding pipeline to eliminate legacy ctypes wrapping and Windows 64-bit integer overflow bugs:
1. Standardize on official `tree-sitter` Python wheels (`py-tree-sitter >= 0.22.0`).
2. Provide precompiled Python C-extension wheels (`.pyd` on Windows, `.so` on Linux, `.dylib` on macOS).
3. Expose dedicated language loaders:
   ```python
   import tree_sitter_salesforce as tss
   apex_lang = tss.apex()
   soql_lang = tss.soql()
   sosl_lang = tss.sosl()
   formula_lang = tss.formula()
   ```

### 3.2 Automated CI/CD Cross-Platform Build Matrix
Maintain a GitHub Actions workflow that builds, tests, and publishes parser binaries:
* **Matrix Targets:**
  - `windows-latest` (MSVC x64)
  - `ubuntu-latest` (GCC x86_64, aarch64)
  - `macos-latest` (Clang x86_64, Apple Silicon arm64)
  - `WASM` (Emscripten WebAssembly build for browser/VSCode Web extensions)

---

## 4. Test Corpus & Regression Test Suite

Maintain a comprehensive corpus test suite under `test/corpus/` across all four grammars:

```
tree-sitter-salesforce/
├── apex/test/corpus/
│   ├── declarations.txt       # Classes, interfaces, enums, triggers
│   ├── methods.txt            # Methods, constructors, properties, getters/setters
│   ├── expressions.txt        # Safe navigation, null coalescing, operators
│   ├── statements.txt         # Switch/when, loops, DML, try/catch
│   ├── annotations.txt        # Built-in and custom annotations
│   └── anonymous_scripts.txt  # Top-level standalone statements
├── soql/test/corpus/
│   ├── basic_queries.txt      # SELECT, FROM, WHERE
│   ├── subqueries.txt         # Child subqueries & WHERE IN subqueries
│   ├── typeof_clauses.txt     # Polymorphic TYPEOF queries
│   ├── security_clauses.txt   # WITH USER_MODE, WITH SYSTEM_MODE
│   └── aggregate_queries.txt  # GROUP BY ROLLUP, CUBE, HAVING
├── sosl/test/corpus/
│   ├── basic_searches.txt     # FIND ... RETURNING ...
│   └── scoped_searches.txt    # IN ALL FIELDS, WITH HIGHLIGHT
└── formula/test/corpus/
    ├── validation_rules.txt   # Complex cross-object validation formulas
    ├── formula_fields.txt     # Arithmetic and string formula fields
    └── flow_criteria.txt      # Flow decision logic and picklist checks
```

---

## 5. Phased Implementation Roadmap for `tree-sitter-salesforce`

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                     TREE-SITTER SALESFORCE IMPLEMENTATION ROADMAP                                │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘

 Phase 1: SOQL Injection & Parser Hardening (Weeks 1 - 2)
   ├── 1.1 Refactor apex/grammar.js to emit structured AST for soql_expression
   ├── 1.2 Expand soql/grammar.js with date functions, aggregate grouping, and bind variables
   ├── 1.3 Validate SOQL language injection queries in injections.scm
   └── 1.4 Expand Apex and SOQL test corpus suites

 Phase 2: Salesforce Formula Grammar (Weeks 3 - 4)
   ├── 2.1 Author formula/grammar.js with complete Salesforce built-in function library
   ├── 2.2 Add field-path navigation (Object.Parent.Field, $User, $CustomMetadata)
   ├── 2.3 Create comprehensive formula test corpus (validation rules, formula fields)
   └── 2.4 Compile native C parser formula/src/parser.c

 Phase 3: SOSL Grammar & Anonymous Apex Mode (Weeks 5 - 6)
   ├── 3.1 Author sosl/grammar.js for multi-object FIND queries
   ├── 3.2 Add anonymous script execution mode to apex/grammar.js
   ├── 3.3 Create test corpus for SOSL and Anonymous Apex
   └── 3.4 Compile native C parser sosl/src/parser.c

 Phase 4: Multi-Platform CI/CD & Python Packaging (Weeks 7 - 8)
   ├── 4.1 Implement automated GitHub Actions cross-compilation matrix (Win/Linux/macOS/WASM)
   ├── 4.2 Modernize Python package setup with py-tree-sitter native bindings
   ├── 4.3 Publish npm packages (@salesforce/tree-sitter-apex, @salesforce/tree-sitter-soql)
   └── 4.4 Build and verify WebAssembly (WASM) distribution for browser-based IDEs
```
