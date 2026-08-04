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
```
Our parser handles this by defining a `soql_expression` rule which is completely opaque (i.e., `seq('[', /[^\]]+/, ']')`), and then relying on Tree-Sitter's injection framework to parse the inner content with the standalone SOQL parser.

### DML Statements
Apex has built-in keywords for Data Manipulation Language (DML) operations:
```apex
insert newAccounts;
update existingAccounts;
delete obsoleteAccounts;
```
These are statements, not method calls. The parser defines dedicated rules (`insert_statement`, `update_statement`, etc.) for each.

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

## Parsing Challenges
- **Ambiguities:** Because Apex is case-insensitive, distinguishing between a variable named `Select` and the start of a SOQL query or method call can sometimes produce grammar conflicts. We use the `conflicts` array in `grammar.js` to instruct Tree-Sitter to use GLR (Generalized LR) parsing to explore multiple branches dynamically.
- **Dynamic SOQL:** Queries constructed via `Database.query(myString)` are evaluated at runtime. Our parser recognizes the method invocation pattern and tags it, but it cannot parse the concatenated string as valid SOQL.
