# Step 7: Language Injection & Queries

> **Agent Handoff Context**: Steps 1-6 are COMPLETE.
> - `soql/grammar.js` — Working SOQL parser with 30+ tests
> - `apex/grammar.js` — Feature-complete Apex parser for API v67
> - Apex parser produces `soql_expression` nodes for inline `[SELECT ...]`
> - Apex parser produces `method_invocation` nodes for `Database.query(...)`
> - Both parsers generate successfully and pass all tests

## Context

This step connects the two parsers together via **language injection** and creates the
**query files** that editors use for syntax highlighting, code navigation, and scope tracking.

### What Are Tree-Sitter Queries?

Tree-sitter queries use a Lisp-like syntax (S-expressions) to match patterns in the syntax
tree. They're stored in `.scm` (Scheme) files and serve different purposes:

| File | Purpose | Used By |
|---|---|---|
| `highlights.scm` | Map syntax nodes to color groups | Editor's syntax highlighting |
| `injections.scm` | Delegate parsing of subtrees to other parsers | Editor's multi-language support |
| `locals.scm` | Define variable scope boundaries | "Go to definition", "Rename symbol" |
| `tags.scm` | Mark definition/reference sites | "Go to symbol", breadcrumbs, outline |

### Query Syntax Quick Reference

```scheme
; Match a node by type
(identifier) @variable

; Match a specific node in context
(class_declaration
  name: (identifier) @name)

; Match a node with a specific text value
((identifier) @keyword
  (#eq? @keyword "Database"))

; Match any of multiple values
((identifier) @builtin
  (#any-of? @builtin "System" "Database" "Schema"))

; Set metadata on a capture
((soql_expression) @injection.content
  (#set! injection.language "soql"))
```

### Language Injection — How It Works

Language injection tells the editor: "this part of the source file is written in a
*different* language — use a different parser for it."

```
┌─ Apex file ─────────────────────────────────────────────────┐
│  public class T {                        ← Apex parser      │
│      List<Account> a = [SELECT Id        ← Apex sees        │
│                         FROM Account];      soql_expression  │
│  }                                       ← Apex parser      │
└─────────────────────────────────────────────────────────────┘
                              │
                     injections.scm says:
                     "soql_expression → parse with SOQL"
                              │
                              ▼
┌─ Injected SOQL parse ─────────────────────────────────────┐
│  SELECT Id FROM Account                  ← SOQL parser     │
│  └── soql_query_body                                       │
│      ├── select_clause: SELECT Id                          │
│      └── from_clause: FROM Account                         │
└────────────────────────────────────────────────────────────┘
```

The result: the editor shows SOQL keywords (`SELECT`, `FROM`) with SQL-style highlighting
inside the Apex file, while the surrounding Apex code uses Java-style highlighting.

## Prerequisites

- Steps 1-6 complete
- Both parsers are feature-complete and passing tests

## Objectives

After completing this step, you will have:

- [x] `apex/queries/injections.scm` — SOQL injection (Tier 1 + Tier 2)
- [x] `apex/queries/highlights.scm` — Complete Apex syntax highlighting
- [x] `apex/queries/locals.scm` — Apex variable scope tracking
- [x] `apex/queries/tags.scm` — Apex code navigation symbols
- [x] `soql/queries/highlights.scm` — SOQL syntax highlighting (shared)
- [x] `soql/queries/highlights-distinct.scm` — Standalone SOQL highlights
- [x] All highlight tests pass
- [x] Injection works end-to-end when tested with `tree-sitter highlight`

## Detailed Instructions

### 7.1 Create SOQL Injection Queries

Replace `d:\Git\tree-sitter-salesforce\apex\queries\injections.scm`:

```scheme
; ============================================================================
; Apex Language Injection Queries
; ============================================================================
; These queries tell editors which parts of Apex code should be parsed by
; a DIFFERENT parser (in our case, the SOQL parser).
;
; Three tiers of SOQL injection:
;   Tier 1: Inline [SELECT ...] → Full SOQL parsing
;   Tier 2: Database.query('SELECT ...') → SOQL parsing of string content
;   Tier 3: Concatenated queries → Structural recognition only (no injection)
;
; Injection format:
;   (pattern) @injection.content           ← what text to re-parse
;   (#set! injection.language "soql")      ← which parser to use
;   (#set! injection.include-children)     ← include child nodes' text
; ============================================================================

; ---------------------------------------------------------------------------
; TIER 1: Inline Static SOQL
; ---------------------------------------------------------------------------
; When Apex code contains [SELECT Id FROM Account], the Apex parser creates
; a `soql_expression` node. We inject the SOQL parser to parse its content.
;
; Example:
;   List<Account> accts = [SELECT Id, Name FROM Account WHERE IsActive = TRUE];
;                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
;                         This entire region is re-parsed by the SOQL parser
; ---------------------------------------------------------------------------
((soql_expression) @injection.content
  (#set! injection.language "soql"))

; ---------------------------------------------------------------------------
; TIER 2: Database.query() with String Literal
; ---------------------------------------------------------------------------
; When Apex calls Database.query('SELECT ...'), we inject the SOQL parser
; into the string literal's content (excluding the quotes themselves).
;
; This ONLY works when the argument is a single string literal — NOT when
; the argument is a variable or concatenation expression.
;
; Example:
;   Database.query('SELECT Id FROM Account')
;                  ^^^^^^^^^^^^^^^^^^^^^^^^
;                  String content re-parsed by SOQL parser
;
; NOTE: The exact query pattern depends on how the grammar represents
; method_invocation. Adjust the pattern to match your actual AST structure.
; ---------------------------------------------------------------------------
((method_invocation
  object: (identifier) @_obj
  name: (identifier) @_method
  arguments: (argument_list
    (string_literal) @injection.content))
  (#eq? @_obj "Database")
  (#eq? @_method "query")
  (#set! injection.language "soql"))

; Same pattern for Database.countQuery()
((method_invocation
  object: (identifier) @_obj
  name: (identifier) @_method
  arguments: (argument_list
    (string_literal) @injection.content))
  (#eq? @_obj "Database")
  (#eq? @_method "countQuery")
  (#set! injection.language "soql"))

; Same pattern for Database.getQueryLocator()
((method_invocation
  object: (identifier) @_obj
  name: (identifier) @_method
  arguments: (argument_list
    (string_literal) @injection.content))
  (#eq? @_obj "Database")
  (#eq? @_method "getQueryLocator")
  (#set! injection.language "soql"))
```

### 7.2 Create Apex Syntax Highlighting Queries

Replace `d:\Git\tree-sitter-salesforce\apex\queries\highlights.scm`:

```scheme
; ============================================================================
; Apex Syntax Highlighting Queries
; ============================================================================
; Maps Apex syntax tree nodes to highlight capture names.
;
; Highlight groups follow the tree-sitter standard naming convention:
;   @keyword           - Language keywords
;   @type              - Type names
;   @type.builtin      - Built-in types (String, Integer, etc.)
;   @function          - Function/method names
;   @function.method   - Method names specifically
;   @variable          - Variable names
;   @variable.builtin  - Built-in variables (this, super)
;   @string            - String literals
;   @number            - Numeric literals
;   @boolean           - Boolean literals
;   @comment           - Comments
;   @operator          - Operators
;   @punctuation       - Brackets, semicolons, etc.
;   @attribute         - Annotations/decorators
;   @constant          - Constants (enum values, final statics)
;
; The editor's color theme maps these groups to actual colors.
; ============================================================================

; --- Comments ---
(line_comment) @comment
(block_comment) @comment

; --- Annotations ---
(annotation
  "@" @attribute
  name: (identifier) @attribute)

; --- Keywords ---
; Declaration keywords
"class" @keyword
"interface" @keyword
"enum" @keyword
"trigger" @keyword
"on" @keyword
"extends" @keyword
"implements" @keyword

; Control flow keywords
"if" @keyword
"else" @keyword
"for" @keyword
"while" @keyword
"do" @keyword
"switch" @keyword.control
"when" @keyword.control
"return" @keyword.control
"break" @keyword.control
"continue" @keyword.control
"throw" @keyword.control
"try" @keyword
"catch" @keyword
"finally" @keyword

; DML keywords — Apex-specific
(dml_type) @keyword

; Modifier keywords
(modifier) @keyword

; --- Types ---
(type_identifier) @type
(void_type) @type.builtin
(generic_type (type_identifier) @type)

; --- Functions and Methods ---
(method_declaration
  name: (identifier) @function.method)
(constructor_declaration
  name: (identifier) @function.method)
(method_invocation
  name: (identifier) @function.method)

; --- Variables ---
(variable_declarator
  name: (identifier) @variable)
(formal_parameter
  name: (identifier) @variable.parameter)
(field_declaration
  (variable_declarator
    name: (identifier) @variable.member))

; --- Built-in Variables ---
(this) @variable.builtin
(super) @variable.builtin

; --- Literals ---
(string_literal) @string
(int) @number
(decimal) @number
(boolean) @boolean
(null_literal) @constant.builtin

; --- Operators ---
"=" @operator
"+" @operator
"-" @operator
"*" @operator
"/" @operator
"%" @operator
"==" @operator
"!=" @operator
"<" @operator
">" @operator
"<=" @operator
">=" @operator
"&&" @operator
"||" @operator
"!" @operator
"??" @operator
"?." @operator
"?" @operator
":" @operator
"+=" @operator
"-=" @operator
"*=" @operator
"/=" @operator
"++" @operator
"--" @operator
"instanceof" @keyword.operator

; --- Punctuation ---
"(" @punctuation.bracket
")" @punctuation.bracket
"[" @punctuation.bracket
"]" @punctuation.bracket
"{" @punctuation.bracket
"}" @punctuation.bracket
"<" @punctuation.bracket
">" @punctuation.bracket
";" @punctuation.delimiter
"," @punctuation.delimiter
"." @punctuation.delimiter
"@" @punctuation.special

; --- Special Salesforce Constructs ---
(trigger_declaration
  name: (identifier) @function)
(trigger_event) @keyword

; --- Enum Constants ---
(enum_constant (identifier) @constant)

; --- Class/Interface/Enum Names ---
(class_declaration
  name: (identifier) @type.definition)
(interface_declaration
  name: (identifier) @type.definition)
(enum_declaration
  name: (identifier) @type.definition)
```

### 7.3 Create Apex Locals Queries

Replace `d:\Git\tree-sitter-salesforce\apex\queries\locals.scm`:

```scheme
; ============================================================================
; Apex Local Variable Scope Queries
; ============================================================================
; Defines scope boundaries for variable resolution.
;
; How scoping works in tree-sitter:
;   @local.scope    - A new scope boundary (block, method, class)
;   @local.definition - A variable definition within a scope
;   @local.reference  - A reference to a variable
;
; Editors use this to:
;   - Highlight all references to a selected variable
;   - "Go to definition" within the current scope
;   - "Rename symbol" across a scope
; ============================================================================

; --- Scope Boundaries ---
; Every block creates a new scope
(block) @local.scope
(class_body) @local.scope
(interface_body) @local.scope
(trigger_body) @local.scope
(method_declaration) @local.scope
(constructor_declaration) @local.scope
(for_statement) @local.scope
(enhanced_for_statement) @local.scope
(catch_clause) @local.scope

; --- Definitions ---
(local_variable_declaration
  (variable_declarator
    name: (identifier) @local.definition))

(formal_parameter
  name: (identifier) @local.definition)

(enhanced_for_statement
  name: (identifier) @local.definition)

(catch_clause
  name: (identifier) @local.definition)

; --- References ---
(identifier) @local.reference
```

### 7.4 Create Apex Tags Queries

Replace `d:\Git\tree-sitter-salesforce\apex\queries\tags.scm`:

```scheme
; ============================================================================
; Apex Code Navigation Tags
; ============================================================================
; Defines symbols for code navigation features.
;
; Tag types:
;   @definition.class    - Class declaration
;   @definition.method   - Method declaration
;   @definition.function - Function declaration
;   @reference.call      - Method/function call
;
; Editors use this for:
;   - Symbol outline (sidebar tree of classes/methods)
;   - Breadcrumbs (path showing current location in code)
;   - "Go to Symbol" command
;   - Workspace symbol search
; ============================================================================

; --- Definitions ---
(class_declaration
  name: (identifier) @name) @definition.class

(interface_declaration
  name: (identifier) @name) @definition.interface

(enum_declaration
  name: (identifier) @name) @definition.enum

(method_declaration
  name: (identifier) @name) @definition.method

(constructor_declaration
  name: (identifier) @name) @definition.method

(trigger_declaration
  name: (identifier) @name) @definition.function

(field_declaration
  (variable_declarator
    name: (identifier) @name)) @definition.field

; --- References ---
(method_invocation
  name: (identifier) @name) @reference.call
```

### 7.5 Create SOQL Highlighting Queries

Replace `d:\Git\tree-sitter-salesforce\soql\queries\highlights.scm`:

```scheme
; ============================================================================
; SOQL Syntax Highlighting Queries (Shared)
; ============================================================================
; These highlights apply both when SOQL is standalone AND when it's
; injected inside Apex code.
; ============================================================================

; --- Keywords ---
"SELECT" @keyword
"FROM" @keyword
"WHERE" @keyword
"AND" @keyword.operator
"OR" @keyword.operator
"NOT" @keyword.operator
"IN" @keyword.operator
"LIKE" @keyword.operator
"ORDER" @keyword
"BY" @keyword
"GROUP" @keyword
"HAVING" @keyword
"LIMIT" @keyword
"OFFSET" @keyword
"ASC" @keyword
"DESC" @keyword
"NULLS" @keyword
"FIRST" @keyword
"LAST" @keyword
"FOR" @keyword
"UPDATE" @keyword
"WITH" @keyword
"USING" @keyword
"SCOPE" @keyword
"TYPEOF" @keyword
"WHEN" @keyword
"THEN" @keyword
"ELSE" @keyword
"END" @keyword
"AS" @keyword
"FIELDS" @keyword.function
"ALL" @keyword
"CUSTOM" @keyword
"STANDARD" @keyword
"INCLUDES" @keyword.operator
"EXCLUDES" @keyword.operator
"TRUE" @boolean
"FALSE" @boolean
"NULL" @constant.builtin

; --- Functions ---
(function_expression
  function_name: (identifier) @function)
(count_expression
  (identifier) @function)

; --- Fields and Objects ---
(field_identifier (identifier) @variable)
(dotted_identifier (identifier) @variable)
(storage_identifier (identifier) @type)

; --- Literals ---
(string_literal) @string
(int) @number
(decimal) @number
(date) @string.special
(date_time) @string.special
(date_literal) @constant.builtin
(date_literal_with_param
  (date_literal) @constant.builtin
  (int) @number)
(currency_literal) @number

; --- Operators ---
(value_comparison_operator) @operator
(set_comparison_operator) @keyword.operator

; --- Punctuation ---
"(" @punctuation.bracket
")" @punctuation.bracket
"," @punctuation.delimiter
"." @punctuation.delimiter
":" @punctuation.delimiter

; --- Order Direction ---
(order_direction) @keyword
(order_null_direction) @keyword

; --- WITH Types ---
(with_type) @keyword

; --- Scope Types ---
(using_scope_type) @constant.builtin
```

Replace `d:\Git\tree-sitter-salesforce\soql\queries\highlights-distinct.scm`:

```scheme
; ============================================================================
; SOQL Syntax Highlighting Queries (Standalone Only)
; ============================================================================
; Additional highlights for standalone .soql files that aren't needed when
; SOQL is embedded inside Apex (because Apex handles these).
; ============================================================================

; --- Comments (only standalone SOQL has comments) ---
(header_comment) @comment
(formatting_comment) @comment
```

### 7.6 Test Highlighting End-to-End

```powershell
# Test SOQL highlighting
cd d:\Git\tree-sitter-salesforce
echo "SELECT Id, Name FROM Account WHERE IsActive = TRUE ORDER BY Name LIMIT 10" > test.soql
npx tree-sitter highlight test.soql

# Test Apex highlighting
@"
@IsTest
public with sharing class TestService {
    public static List<Account> getAccounts() {
        return [SELECT Id, Name FROM Account];
    }
}
"@ | Out-File -Encoding utf8 test.cls

cd apex
npx tree-sitter highlight ..\test.cls

# Clean up
del ..\test.soql
del ..\test.cls
```

Verify that:
- Keywords (SELECT, FROM, WHERE, class, public, etc.) are highlighted
- Types (Account, String, List) are highlighted differently from keywords
- Literals (strings, numbers, booleans) have distinct colors
- Annotations (@IsTest) are highlighted as attributes
- SOQL inside Apex [SELECT ...] gets SOQL-style highlighting

### 7.7 Git Commit

```powershell
cd d:\Git\tree-sitter-salesforce
git add .
git commit -m "feat: language injection and syntax highlighting queries

- apex/queries/injections.scm: Tier 1 (inline SOQL) + Tier 2 (Database.query)
- apex/queries/highlights.scm: Complete Apex syntax highlighting
- apex/queries/locals.scm: Variable scope tracking
- apex/queries/tags.scm: Code navigation symbols
- soql/queries/highlights.scm: SOQL highlighting (shared)
- soql/queries/highlights-distinct.scm: Standalone SOQL highlights
- Injection verified end-to-end"
```

## Verification Checklist

- [ ] `tree-sitter highlight` on .soql files shows colored output
- [ ] `tree-sitter highlight` on .cls files shows colored output
- [ ] SOQL inside Apex gets SOQL-style highlighting (injection works)
- [ ] Class/method names appear in tags output
- [ ] Variable definitions/references are tracked in locals
- [ ] No query syntax errors in any .scm file
- [ ] All parser tests still pass

## Checkpoint State

After this step, both parsers are fully functional with rich editor integration:
- Syntax highlighting for Apex and SOQL
- SOQL injection inside Apex code (Tier 1 + Tier 2)
- Code navigation and scope tracking

**Next step:** Step 8 — Bindings & Integration
