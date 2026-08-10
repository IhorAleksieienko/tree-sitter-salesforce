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
from tree_sitter import Parser

parser = Parser()
parser.language = tss.apex_anon()

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
