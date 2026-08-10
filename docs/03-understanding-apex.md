# Understanding Apex (for Parser Authors)

## Overview
Apex is a strongly typed, object-oriented programming language executed on the Salesforce platform. Syntactically, it is heavily based on Java. However, it includes several domain-specific features related to the Salesforce platform, such as inline database queries (SOQL/SOSL) and database manipulation statements (DML).

## Key Characteristics

### Case-Insensitivity
Unlike Java, Apex is entirely case-insensitive for identifiers and keywords. `Public Class MyClass` is identical to `public class myclass`. Our grammar uses the `ci()` helper function to define all keywords as case-insensitive regular expressions.

### Single-File Compilation Units
Apex classes and triggers are compiled individually. The top-level structure of an Apex file is either:
1. A single class, interface, or enum declaration.
2. A single trigger declaration.

There are no package declarations or multiple top-level classes in a standard `.cls` file (though inner classes are allowed).

## Salesforce-Specific Language Features

### Inline SOQL and SOSL
Apex allows developers to write SOQL and SOSL queries directly in the code, enclosed in brackets:
```apex
List<Account> accounts = [SELECT Id, Name FROM Account WHERE Name = 'Acme'];
List<List<SObject>> searchResults = [FIND 'Acme*' IN ALL FIELDS RETURNING Account(Id, Name)];
```
Our parser handles this by defining balanced `soql_expression` and `sosl_expression` rules, and then relying on Tree-Sitter's injection framework to parse the inner content with the standalone SOQL and SOSL parsers.

### DML Statements
Apex has built-in keywords for Data Manipulation Language (DML) operations, including modern security modes (`as user` and `as system` introduced in API v54+):
```apex
insert as user newAccounts;
update as system existingAccounts;
upsert as user opps External_Id__c;
delete as user obsoleteAccounts;
```
These are statements, not method calls. The parser produces `dml_statement` nodes with optional `access_level` (`user` or `system`), `record`, and `options` child fields.

### Explicit Constructor Chaining
Apex constructors support explicit chaining to overloaded constructors in the same class via `this(...)` or superclass constructors via `super(...)` and `Outer.super(...)`:

```apex
public class CustomException extends Exception {
    public CustomException() {
        this('Default error message');
    }
    public CustomException(String msg) {
        super(msg);
    }
}
```
These calls produce `explicit_constructor_invocation` AST nodes containing the invoked constructor keyword (`this` or `super`), optional `object` qualifier, optional `type_arguments`, and `arguments: (argument_list ...)`.

### System.runAs Testing Statements
Apex test methods use the `System.runAs(user) { ... }` block construct to execute code in the context of a specified user:

```apex
@IsTest
static void testPermissions() {
    User standardUser = [SELECT Id FROM User WHERE Profile.Name = 'Standard User' LIMIT 1];
    System.runAs(standardUser) {
        Account acc = new Account(Name = 'Test Corp');
        insert as user acc;
    }
}
```
This produces a `run_as_statement` node with `user: (parenthesized_expression ...)` and `body: (block ...)`.

### Triggers
Triggers are a unique entry point in Apex, associated with database events:
```apex
trigger AccountTrigger on Account (before insert, after update) {
    // trigger logic
}
```
The `trigger_declaration` rule accounts for the trigger name, target sObject, and the list of trigger events.

### Annotations
Apex annotations begin with `@`. While some take arguments (e.g., `@SuppressWarnings('PMD')`), others are simple markers (e.g., `@IsTest`, `@AuraEnabled`). Our parser defines a generic `annotation` rule to capture all variants gracefully.

### Properties
Apex supports C#-style properties with getters and setters:
```apex
public String Name {
    get { return name; }
    set { name = value; }
}
```
These are parsed using `property_declaration`, distinguishing them from standard Java fields or methods.

### Interfaces and Generic Inheritance
Apex interfaces declare method signatures, constant fields, and inner types. Classes and interfaces can inherit from generic base types:
```apex
public interface IProcessable<T> extends IBase<T> {
    void process(T record);
    Boolean isValid(T record);
}

public class AccountBatch implements Database.Batchable<sObject>, IProcessable<Account> {
    // ...
}
```
The parser produces `generic_type` and `scoped_type_identifier` nodes directly under `superclass` and `interfaces`.

### Map Literals
Apex supports map instantiation with key-value pairs using the `=>` operator:
```apex
Map<String, String> m = new Map<String, String>{
    'key1' => 'val1',
    'key2' => 'val2',
};
```
These expressions are parsed into `map_initializer` nodes containing `map_key_initializer` child nodes with `key` and `value` fields.

### Static and Instance Initializers
Apex classes support static initialization blocks (`static { ... }`) that run once when the class is loaded, as well as instance initialization blocks (`{ ... }`) that run whenever an instance is created:

```apex
public class ServiceManager {
    private static Map<String, Object> cache;
    private List<String> history;

    static {
        cache = new Map<String, Object>();
    }

    {
        history = new List<String>();
    }
}
```
In the AST:
- `static { ... }` produces a `static_initializer` node with a `body: (block)` field.
- Bare `{ ... }` blocks directly within class bodies produce `instance_initializer` nodes.

### Trigger Member Declarations
Apex triggers can contain helper methods, static fields/constants, and inner types alongside standard procedural statements:

```apex
trigger AccountTrigger on Account (before insert, after insert) {
    public static final String PREFIX = 'ACC-';

    private void enrich(Account acc) {
        acc.AccountNumber = PREFIX + acc.Name;
    }

    for (Account a : Trigger.new) {
        enrich(a);
    }
}
```
The `trigger_body` rule accepts both procedural `statement` nodes and member declarations (such as `method_declaration` and `local_variable_declaration`), enabling full AST indexing of trigger-local helper symbols.

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

```text
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
from tree_sitter import Parser

parser = Parser()

# Class-based Apex → use tss.apex()
parser.language = tss.apex()

# Anonymous Apex → use tss.apex_anon()
parser.language = tss.apex_anon()
tree = parser.parse(b"insert new Account(Name = 'Test');\nSystem.debug('done');")
```

Both grammars share the same `statement`, `expression`, and `type` rules. The only
difference is the `source_file` entry point.

## Parsing Challenges
- **Ambiguities:** Because Apex is case-insensitive, distinguishing between a variable named `Select` and the start of a SOQL query or method call can sometimes produce grammar conflicts. We use the `conflicts` array in `grammar.js` to instruct Tree-Sitter to use GLR (Generalized LR) parsing to explore multiple branches dynamically.
- **Dynamic Queries:** Queries constructed via `Database.query(myString)` or `Database.queryWithBinds(...)` are evaluated at runtime. Our parser recognizes the method invocation pattern and injects the SOQL grammar into string literals when statically determinable.
