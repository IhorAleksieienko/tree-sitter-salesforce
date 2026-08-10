# Understanding Anonymous Apex (for Parser Authors)

## Overview

Anonymous Apex is a mechanism in Salesforce that allows developers and automated tools to execute Apex code on the fly without saving it into a persistent `.cls` class file or `.trigger` file.

It is widely used across the Salesforce ecosystem:
- **Developer Console**: The "Execute Anonymous" window.
- **Salesforce CLI**: `sf apex run --file script.apex` or `sfdx force:apex:execute`.
- **CI/CD Pipelines**: Seed data scripts, test environment bootstrapping, and integration test setup.
- **VS Code / IDEs**: Direct script execution and scratchpad debugging.

```apex
// Anonymous script: executable statements at the file root
Account acc = new Account(Name = 'Acme Corp', BillingCity = 'San Francisco');
insert acc;

Contact con = new Contact(FirstName = 'John', LastName = 'Doe', AccountId = acc.Id);
insert con;

System.debug('Created Account ID: ' + acc.Id + ', Contact ID: ' + con.Id);
```

---

## The Grammar Dilemma: Why a Separate Grammar?

### The Naive Root Choice Problem

A naive attempt to support both standard Apex files (`.cls`/`.trigger`) and Anonymous Apex scripts within a single grammar might look like this:

```javascript
// ❌ UNSOUND DESIGN: Do NOT do this
source_file: $ => choice(
  repeat1($.declaration),  // Classes, Interfaces, Enums, Triggers
  repeat1($.statement)     // Top-level statements
)
```

This causes severe LR/GLR parser ambiguities:

1. **Token Overlap & Lookahead Failure**: Both branches can begin with the exact same keywords (e.g. `public`, `private`, `static`, `final`). A parser looking at `public ...` cannot decide whether it is parsing a `class_declaration`, a `method_declaration`, or a statement.
2. **Exponential State Splitting (GLR Explosion)**: Tree-sitter would fork parser states on almost every token at the root, leading to exponential parse times, slowdowns, and unpredictable reduction choices.
3. **Semantic Inaccuracy**: Standard Apex does not permit top-level executable statements outside classes, and Anonymous Apex does not permit top-level method declarations. Combining them blurs syntactic boundaries.

### The Architected Solution: `apex_anon` Grammar Extension

To achieve zero conflicts, fast linear parsing, and clean ASTs:
1. **`apex/grammar.js`** remains strictly focused on `.cls` and `.trigger` declarations with root `source_file: $ => repeat($.declaration)`.
2. **`apex-anon/grammar.js`** inherits all shared Apex rules (expressions, types, statements, DML, inline queries) and overrides only the root entry point:

```javascript
const apexGrammar = require("../apex/grammar.js");

module.exports = grammar(apexGrammar, {
  name: "apex_anon",
  rules: {
    source_file: ($) => repeat($.statement),
  },
});
```

---

## Supported Constructs in Anonymous Apex

Anonymous scripts can contain any statement valid inside an Apex method body:

### 1. Variable Declarations & Expressions
```apex
String status = 'Active';
Integer count = 10;
Double discount = count > 5 ? 0.15 : 0.05;
```

### 2. DML Operations
```apex
insert new Lead(LastName = 'Smith', Company = 'Acme');
update accountsToProcess;
delete [SELECT Id FROM Opportunity WHERE StageName = 'Closed Lost'];
```

### 3. Control Flow & Loops
```apex
for (Account a : [SELECT Id, Name FROM Account LIMIT 10]) {
    System.debug(a.Name);
}

try {
    Database.insert(records, false);
} catch (DmlException e) {
    System.debug(LoggingLevel.ERROR, e.getMessage());
}
```

### 4. Inline SOQL & SOSL Injections
Both inline SOQL (`[SELECT ...]`) and inline SOSL (`[FIND ...]`) are recognized and injected with their respective grammar highlighters:
```apex
List<List<SObject>> searchResults = [FIND 'Acme*' IN ALL FIELDS RETURNING Account(Id, Name)];
```

---

## Usage Guide

### Node.js

```javascript
const Parser = require('tree-sitter');
const Salesforce = require('tree-sitter-salesforce');

const parser = new Parser();

// Configure parser with Anonymous Apex grammar
parser.setLanguage(Salesforce.apexAnon);

const script = `
Account a = new Account(Name = 'Test Org');
insert a;
System.debug('Created account with ID: ' + a.Id);
`;

const tree = parser.parse(script);
console.log(tree.rootNode.toString());
```

### Python

```python
import tree_sitter_salesforce as tss
from tree_sitter import Language, Parser

parser = Parser()
parser.language = Language(tss.apex_anon())

script = b"""
Account a = new Account(Name = 'Test Org');
insert a;
System.debug('Created ID: ' + a.Id);
"""

tree = parser.parse(script)
print(tree.root_node.sexp())
```

---

## File Association Conventions

- `.cls`: Standard Apex Class (Parsed by `apex`)
- `.trigger`: Standard Apex Trigger (Parsed by `apex`)
- `.apex`: Anonymous Apex Script (Parsed by `apex_anon`)
