# Step 5: Apex Parser — Statements & Control Flow

> **Agent Handoff Context**: Steps 1-4 are COMPLETE.
> - `soql/grammar.js` — Working SOQL parser with 30+ tests passing
> - `apex/grammar.js` — Core Apex grammar with declarations, types, modifiers
> - Parser can handle: classes, interfaces, enums, triggers, field declarations
> - Parser CANNOT yet handle: methods, statements, operators, DML, SOQL expressions

## Context

This step adds **methods, statements, and control flow** to the Apex parser — the
constructs that make up the body of Apex code. After this step, the parser will handle
most of the imperative code you'd find in real-world Apex.

## Prerequisites

- Steps 1-4 complete
- Apex parser generates and passes tests for declarations and types

## Objectives

After completing this step, you will have:

- [x] Method declarations with parameters and return types
- [x] Constructor declarations
- [x] Property declarations with getters/setters
- [x] All control flow: if/else, for, enhanced for, while, do-while, switch/when
- [x] Try/catch/finally
- [x] DML statements: insert, update, upsert, delete, undelete, merge
- [x] SOQL expression node (opaque — `[...]` brackets for later injection)
- [x] All binary operators (+, -, *, /, ==, !=, &&, ||, etc.)
- [x] Unary operators (!, ++, --, +, -, ~)
- [x] Assignment operators (=, +=, -=, etc.)
- [x] Ternary operator (? :)
- [x] Null coalescing (??)
- [x] Safe navigation (?.)
- [x] instanceof operator
- [x] Cast expressions
- [x] New expressions (object creation)
- [x] Method invocation
- [x] Array/list access
- [x] Comprehensive test corpus

## Detailed Instructions

### 5.1 Write Test Corpus

Create these test files BEFORE implementing the grammar rules:

#### 5.1.1 Method Tests

Create `d:\Git\tree-sitter-salesforce\apex\test\corpus\methods.txt`:

Test cases should cover:
- Simple void method
- Method with return type
- Method with parameters (typed)
- Static method
- Override method
- Constructor
- Constructor with `this()` and `super()` calls
- Property with getter/setter
- Abstract method (no body, just signature)
- Method with all modifier combinations

Example test format:
```
==================
Simple void method
==================

public class T {
    public void doWork() {
    }
}

---

(source_file
  (class_declaration
    (modifiers (modifier))
    name: (identifier)
    body: (class_body
      (method_declaration
        (modifiers (modifier))
        type: (void_type)
        name: (identifier)
        parameters: (formal_parameters)
        body: (block)))))
```

#### 5.1.2 Statement Tests

Create `d:\Git\tree-sitter-salesforce\apex\test\corpus\statements.txt`:

Test cases should cover:
- if/else
- for (traditional C-style)
- Enhanced for (for-each): `for (Account a : accounts) { }`
- while
- do-while
- switch/when (Apex-specific syntax, different from Java switch)
- try/catch/finally
- return (with and without value)
- break, continue
- throw
- DML: insert, update, upsert, delete, undelete, merge
- Expression statement (method call as statement)
- Block statement

Example DML test:
```
==================
Insert DML statement
==================

public class T {
    public void doWork() {
        Account a = new Account();
        insert a;
    }
}

---

(source_file
  (class_declaration ...
    body: (class_body
      (method_declaration ...
        body: (block
          (local_variable_declaration ...)
          (dml_statement (dml_type) (expression)))))))
```

#### 5.1.3 Expression Tests

Create `d:\Git\tree-sitter-salesforce\apex\test\corpus\expressions.txt`:

Test cases should cover:
- Binary expressions: `a + b`, `a * b`, `a && b`, `a == b`
- Unary expressions: `!flag`, `++i`, `i++`, `-value`
- Ternary: `condition ? trueVal : falseVal`
- Null coalescing: `value ?? defaultValue`
- Safe navigation: `account?.Name`
- instanceof: `obj instanceof Account`
- Cast: `(Account) sobj`
- New expression: `new Account()`
- New list: `new List<Account>()`
- New map: `new Map<String, Object>()`
- Array initializer: `new List<String>{'a', 'b'}`
- Method invocation: `obj.method(arg1, arg2)`
- Array/list access: `list[0]`
- Chained method calls: `acct.getName().toUpperCase()`
- Assignment: `x = 5`, `x += 3`
- SOQL expression: `[SELECT Id FROM Account]`

#### 5.1.4 SOQL Injection Tests

Create `d:\Git\tree-sitter-salesforce\apex\test\corpus\soql-injection.txt`:

```
==================
Inline SOQL query
==================

public class T {
    public void doWork() {
        List<Account> accts = [SELECT Id FROM Account];
    }
}

---

(source_file
  (class_declaration ...
    body: (class_body
      (method_declaration ...
        body: (block
          (local_variable_declaration
            type: (generic_type ...)
            (variable_declarator
              name: (identifier)
              value: (soql_expression))))))))
```

### 5.2 Add Grammar Rules to `apex/grammar.js`

Add these rules to the existing `apex/grammar.js`. The key additions are organized by category:

#### 5.2.1 Methods & Constructors

Add to `_class_body_declaration`:
```javascript
_class_body_declaration: ($) => choice(
  $.field_declaration,
  $.method_declaration,       // NEW
  $.constructor_declaration,  // NEW
  $.property_declaration,     // NEW
  $.class_declaration,
  $.interface_declaration,
  $.enum_declaration,
  ";",
),
```

Add method/constructor/property rules:
```javascript
method_declaration: ($) => seq(
  optional($.modifiers),
  field("type", $._type),
  field("name", $.identifier),
  field("parameters", $.formal_parameters),
  choice(field("body", $.block), ";")  // abstract methods have no body
),

constructor_declaration: ($) => seq(
  optional($.modifiers),
  field("name", $.identifier),
  field("parameters", $.formal_parameters),
  field("body", $.block)
),

property_declaration: ($) => seq(
  optional($.modifiers),
  field("type", $._type),
  field("name", $.identifier),
  "{",
  optional($.getter),
  optional($.setter),
  "}"
),

getter: ($) => seq(optional($.modifiers), ci("get"), choice($.block, ";")),
setter: ($) => seq(optional($.modifiers), ci("set"), choice($.block, ";")),

formal_parameters: ($) => seq("(", commaJoined($.formal_parameter), ")"),
formal_parameter: ($) => seq(
  optional($.modifiers),
  field("type", $._type),
  field("name", $.identifier)
),
```

#### 5.2.2 Statements

Expand the `statement` rule:
```javascript
statement: ($) => choice(
  $.expression_statement,
  $.block,
  $.local_variable_declaration,
  $.if_statement,
  $.for_statement,
  $.enhanced_for_statement,
  $.while_statement,
  $.do_while_statement,
  $.switch_statement,
  $.try_statement,
  $.return_statement,
  $.break_statement,
  $.continue_statement,
  $.throw_statement,
  $.dml_statement,
),
```

Add each statement rule with comments explaining Apex-specific behavior:

```javascript
// DML Statements — Apex-specific database operations
dml_statement: ($) => seq($.dml_type, $.expression, ";"),
dml_type: ($) => choice(
  ci("insert"), ci("update"), ci("upsert"),
  ci("delete"), ci("undelete"), ci("merge")
),

// Switch/When — Apex's pattern matching (different from Java's switch)
// Syntax:
//   switch on expression {
//     when value1 { ... }
//     when value2, value3 { ... }
//     when Type varName { ... }
//     when else { ... }
//   }
switch_statement: ($) => seq(
  ci("switch on"), $.expression, "{",
  repeat($.when_clause),
  optional($.when_else_clause),
  "}"
),
```

#### 5.2.3 Expressions

Expand the `expression` rule to include all operators:

```javascript
expression: ($) => choice(
  $.primary_expression,
  $.assignment_expression,
  $.binary_expression,
  $.unary_expression,
  $.update_expression,      // ++, --
  $.ternary_expression,
  $.null_coalescing_expression,
  $.cast_expression,
  $.instanceof_expression,
  $.new_expression,
  $.method_invocation,
  $.field_access,
  $.array_access,
  $.soql_expression,
),
```

#### 5.2.4 SOQL Expression (Opaque Node for Injection)

```javascript
/**
 * SOQL expression — inline SOQL query delimited by square brackets.
 *
 * This is an OPAQUE node: the Apex parser captures everything between
 * [ and ] as raw text. The SOQL parser is then injected via
 * `injections.scm` to provide full SOQL parsing within this node.
 *
 * Examples:
 *   [SELECT Id FROM Account]
 *   [SELECT Id FROM Account WHERE Name = :searchTerm]
 *
 * Note: The content between brackets may contain nested brackets (in
 * subqueries), so we use an external scanner or careful regex to match
 * the correct closing bracket.
 */
soql_expression: ($) => seq(
  "[",
  // Match everything that's not a closing bracket, or nested [...] pairs
  // This is a simplified version; a production parser would use an
  // external scanner for proper bracket matching
  /[^\]]*/,
  "]"
),
```

### 5.3 Generate and Test

```powershell
cd d:\Git\tree-sitter-salesforce\apex
npx tree-sitter generate
npx tree-sitter test
```

### 5.4 Test with Real-World Apex

Parse the AccountTriggerHandler from apex-recipes:

```powershell
cd d:\Git\tree-sitter-salesforce\apex
npx tree-sitter parse "d:\Git\apex-recipes\force-app\main\default\classes\Trigger Recipes\AccountTriggerHandler.cls"
```

Examine the output tree. Look for ERROR nodes — each one represents a construct the
grammar doesn't handle yet. Fix them iteratively.

### 5.5 Git Commit

```powershell
cd d:\Git\tree-sitter-salesforce
git add apex/
git commit -m "feat(apex): statements, methods, operators, and SOQL expression

- Method declarations with parameters and return types
- Constructors and properties (get/set)
- Control flow: if/else, for, enhanced for, while, do-while, switch/when
- Exception handling: try/catch/finally, throw
- DML statements: insert, update, upsert, delete, undelete, merge
- SOQL expression node (opaque, for injection)
- All binary/unary/assignment operators
- Ternary, null coalescing (??), safe navigation (?.)
- instanceof, cast, new expressions
- Method invocation and field access
- 40+ test cases"
```

## Verification Checklist

- [ ] Method declarations parse correctly (with/without modifiers, parameters, body)
- [ ] All control flow statements parse (if, for, while, switch, try)
- [ ] DML statements parse (insert, update, upsert, delete, undelete, merge)
- [ ] `[SELECT Id FROM Account]` produces a `soql_expression` node
- [ ] Binary expressions respect operator precedence
- [ ] Null coalescing `??` and safe navigation `?.` work
- [ ] Real-world Apex files from apex-recipes parse without major errors
- [ ] `cd apex && npx tree-sitter test` — all tests pass

## Checkpoint State

After completing this step, the Apex parser handles ~80% of real-world Apex code.

**What works:** Classes, fields, methods, constructors, properties, all statements,
all operators, SOQL expression nodes.

**What's NOT yet supported (Step 6):** Annotations, Database.query() patterns,
edge cases in generics, some advanced expressions.

**Next step:** Step 6 — Apex Advanced Features, Annotations & Dynamic SOQL
