# Step 6: Apex Parser — Advanced Features, Annotations & Dynamic SOQL

> **Agent Handoff Context**: Steps 1-5 are COMPLETE.
> - SOQL parser: Working with 30+ tests
> - Apex parser: Handles declarations, types, methods, statements, operators,
>   DML statements, and inline SOQL expressions
> - Parser handles ~80% of real-world Apex code

## Context

This step completes the Apex grammar by adding:
1. **Annotations** — Salesforce-specific metadata decorators
2. **Dynamic SOQL recognition** — `Database.query()` call patterns
3. **Remaining expression/type edge cases**

### Salesforce Annotations

Apex annotations are metadata that modify how the platform treats code. They're syntactically
similar to Java annotations but include Salesforce-specific ones:

```apex
@IsTest                                    // Marks a test class/method
@AuraEnabled                               // Exposes method to Lightning components
@AuraEnabled(cacheable=true)               // With parameters
@InvocableMethod(label='Process Records')  // Flow-callable method
@Future(callout=true)                      // Async execution
@SuppressWarnings('PMD.ApexSOQLInjection') // Suppress analysis warnings
@TestSetup                                 // Test data setup method
@TestVisible                               // Expose private members to tests
@ReadOnly                                  // Large data volumes
@NamespaceAccessible                       // Package visibility
@RemoteAction                              // Visualforce remoting
@HttpGet                                   // REST endpoint
```

### Dynamic SOQL — Three Tiers

See the implementation plan for the full dynamic SOQL strategy. In this step, we ensure
the Apex grammar creates the right node structure for `Database.query()` calls so that
`injections.scm` (Step 7) can target them.

## Prerequisites

- Steps 1-5 complete
- Apex parser handles methods, statements, and operators

## Objectives

After completing this step, you will have:

- [x] Annotation declarations with optional parameters
- [x] All Salesforce-specific annotations recognized
- [x] Generic annotation syntax for custom/managed package annotations
- [x] `Database.query()` / `Database.countQuery()` / `Database.getQueryLocator()` as
      recognizable method invocation patterns
- [x] Remaining expression types: string concatenation edge cases, collection
      literals (`new List<String>{'a', 'b'}`), map initializers
- [x] Inner exception classes: `public class MyException extends Exception {}`
- [x] `instanceof` with complex types
- [x] Comprehensive test corpus for annotations and dynamic SOQL
- [x] Real-world Apex files from `d:\Git\apex-recipes` parse with minimal ERROR nodes

## Detailed Instructions

### 6.1 Write Annotation Test Corpus

Create `d:\Git\tree-sitter-salesforce\apex\test\corpus\annotations.txt`:

```
==================
Simple annotation
==================

@IsTest
public class TestClass {
}

---

(source_file
  (class_declaration
    (modifiers
      (annotation name: (identifier))
      (modifier))
    name: (identifier)
    body: (class_body)))

==================
Annotation with single parameter
==================

@AuraEnabled(cacheable=true)
public static List<Account> getAccounts() {
}

---

(... method with annotation containing key-value pair ...)

==================
Annotation with string parameter
==================

@SuppressWarnings('PMD.ApexSOQLInjection')
public static List<Account> query() {
}

---

(... method with annotation containing string literal ...)

==================
Multiple annotations on method
==================

@IsTest
@TestSetup
static void setupData() {
}

---

(... method with two annotations ...)
```

### 6.2 Write Dynamic SOQL Test Corpus

Create `d:\Git\tree-sitter-salesforce\apex\test\corpus\dynamic-soql.txt`:

Test cases for all three tiers:

```
==================
Tier 1: Inline SOQL
==================

public class T {
    void m() {
        List<Account> a = [SELECT Id FROM Account];
    }
}

---

(... soql_expression node ...)

==================
Tier 2: Database.query with string literal
==================

public class T {
    void m() {
        List<Account> a = Database.query('SELECT Id FROM Account');
    }
}

---

(... method_invocation with object=Database, name=query,
     argument containing string_literal ...)

==================
Tier 3: Database.query with concatenated string
==================

public class T {
    void m() {
        String q = 'SELECT Id FROM Account ' + 'WHERE Name = \'Test\'';
        List<Account> a = Database.query(q);
    }
}

---

(... method_invocation with string concatenation in local var,
     then Database.query with identifier argument ...)

==================
Database.queryWithBinds
==================

public class T {
    void m() {
        Map<String, Object> binds = new Map<String, Object>{'name' => 'Test'};
        List<Account> a = Database.queryWithBinds(
            'SELECT Id FROM Account WHERE Name = :name',
            binds,
            AccessLevel.USER_MODE
        );
    }
}

---

(... method_invocation with three arguments ...)
```

### 6.3 Add Annotation Rules to Grammar

Add to `apex/grammar.js`:

```javascript
// =========================================================================
// ANNOTATIONS
// =========================================================================

/**
 * Annotation — metadata decorator on classes, methods, fields.
 *
 * Syntax:
 *   @AnnotationName
 *   @AnnotationName(param=value)
 *   @AnnotationName(param1=value1, param2=value2)
 *
 * In Apex, annotations are case-insensitive.
 * The parser recognizes the @ syntax generically — it does NOT validate
 * that the annotation name is a real Salesforce annotation. This means
 * custom annotations from managed packages work too.
 */
annotation: ($) => seq(
  "@",
  field("name", $.identifier),
  optional($.annotation_arguments)
),

annotation_arguments: ($) => seq(
  "(",
  commaJoined1($.annotation_key_value),
  ")"
),

annotation_key_value: ($) => seq(
  field("key", $.identifier),
  "=",
  field("value", $._annotation_value)
),

_annotation_value: ($) => choice(
  $.string_literal,
  $.boolean,
  $.int,
  $.identifier,
),
```

Add `$.annotation` to the `modifiers` rule:
```javascript
modifiers: ($) => repeat1(choice($.annotation, $.modifier)),
```

### 6.4 Verify Dynamic SOQL Node Structure

The key is that `Database.query(...)` appears as:

```
(method_invocation
  object: (identifier)         ← "Database"
  name: (identifier)           ← "query"
  arguments: (argument_list
    (string_literal)))         ← The SOQL string
```

This structure already exists from Step 5's `method_invocation` rule. In Step 7,
we'll write `injections.scm` queries that target this pattern.

### 6.5 Add Collection Literal Rules

```javascript
/**
 * Map/set/list initializer with curly braces.
 *
 * Examples:
 *   new List<String>{'a', 'b', 'c'}
 *   new Map<String, Integer>{'one' => 1, 'two' => 2}
 *   new Set<Id>{recordId1, recordId2}
 */
array_initializer: ($) => seq(
  "{",
  commaJoined($._variable_initializer),
  "}"
),

map_initializer: ($) => seq(
  "{",
  commaJoined1($.map_entry),
  "}"
),

map_entry: ($) => seq(
  field("key", $.expression),
  "=>",
  field("value", $.expression)
),
```

### 6.6 Generate, Test, and Validate Against Real Code

```powershell
cd d:\Git\tree-sitter-salesforce\apex
npx tree-sitter generate
npx tree-sitter test

# Test against real-world Apex files
npx tree-sitter parse "d:\Git\apex-recipes\force-app\main\default\classes\Trigger Recipes\AccountTriggerHandler.cls"
npx tree-sitter parse "d:\Git\apex-recipes\force-app\main\default\classes\Data Recipes\DynamicSOQLRecipes.cls"
npx tree-sitter parse "d:\Git\apex-recipes\force-app\main\default\classes\Data Recipes\SOQLRecipes.cls"
```

Examine each output for ERROR nodes. Fix the grammar iteratively.

### 6.7 Update SALESFORCE_API.md

Update `d:\Git\tree-sitter-salesforce\SALESFORCE_API.md` to reflect implemented features.
Change 🔲 Planned to ✅ Implemented for each feature the parser now handles.

### 6.8 Git Commit

```powershell
cd d:\Git\tree-sitter-salesforce
git add .
git commit -m "feat(apex): annotations, dynamic SOQL, and collection literals

- Full annotation support (@IsTest, @AuraEnabled(cacheable=true), etc.)
- Generic annotation syntax for custom/managed package annotations
- Database.query() method invocation pattern (for Tier 2 injection)
- Collection literals: List{'a','b'}, Map{'k'=>'v'}, Set{1,2}
- Inner exception classes
- Updated SALESFORCE_API.md with implemented features
- 20+ new test cases"
```

## Verification Checklist

- [ ] Annotations parse correctly: `@IsTest`, `@AuraEnabled(cacheable=true)`, `@SuppressWarnings('...')`
- [ ] Multiple annotations on a single declaration work
- [ ] `Database.query('...')` creates a recognizable method_invocation node
- [ ] `Database.queryWithBinds(...)` parses with multiple arguments
- [ ] Collection literals parse: `new List<String>{'a', 'b'}`
- [ ] Map literals with `=>` parse: `new Map<String, Object>{'k' => 'v'}`
- [ ] AccountTriggerHandler.cls parses with minimal ERROR nodes
- [ ] DynamicSOQLRecipes.cls parses with minimal ERROR nodes
- [ ] SOQLRecipes.cls parses (inline [SELECT...] produces soql_expression)
- [ ] SALESFORCE_API.md reflects current implementation status
- [ ] All tests pass

## Checkpoint State

After this step, the Apex grammar is **feature-complete** for Salesforce API v67.

**Next step:** Step 7 — Language Injection & Queries
