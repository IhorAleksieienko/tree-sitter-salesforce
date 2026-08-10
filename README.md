# tree-sitter-salesforce

[![CI](https://github.com/ia/tree-sitter-salesforce/actions/workflows/ci.yml/badge.svg)](https://github.com/ia/tree-sitter-salesforce/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/tree-sitter-salesforce.svg)](https://www.npmjs.com/package/tree-sitter-salesforce)
[![PyPI version](https://img.shields.io/pypi/v/tree-sitter-salesforce.svg)](https://pypi.org/project/tree-sitter-salesforce/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Tree-sitter grammars for Salesforce languages — **Apex**, **Anonymous Apex**, **SOQL**, **SOSL**, and **Formula Language**.

> Providing fast, incremental, error-tolerant parsing for Salesforce development tools.

## Features

- 🚀 **Production-quality** Apex and Anonymous Apex parsers targeting Salesforce API v67 (Summer '25), ensuring compatibility with the latest platform features.
- ⚡ **Anonymous Apex Scripting Mode** — Dedicated `apex_anon` grammar for top-level executable scripts (`.apex`), Developer Console "Execute Anonymous", and CLI automation.
- 🔍 **SOQL parser** with full query syntax support: date functions, aggregate extensions (`GROUP BY ROLLUP/CUBE`), scalar functions (`FORMAT`, `convertCurrency`, `toLabel`, `GROUPING`), polymorphic `TYPEOF`, and `WITH DATA CATEGORY` filtering.
- 🔎 **SOSL parser** supporting multi-object full-text searches, field scopes (`IN ALL/NAME/EMAIL/PHONE/SIDEBAR FIELDS`), `RETURNING` clauses with filtering/sorting/pagination, `WITH` clauses (`HIGHLIGHT`, `SNIPPET`, `DATA CATEGORY`), and bind variables.
- 📐 **Formula parser** supporting Validation Rules, Formula Fields, Flow Decision Criteria, and Process Builder conditions with rich built-in function recognition and global context variables (`$User`, `$Organization`, `$CustomMetadata`, `$Setup`).
- 🔗 **Language injection** — SOQL and SOSL are highlighted correctly inside Apex and Anonymous Apex code, improving readability and reducing syntax errors when writing inline database queries and search statements.
- 📦 **Multi-language bindings** — Node.js, Python, and WASM bindings allow these parsers to be integrated into any modern tooling ecosystem (e.g., linters, IDEs, CI/CD pipelines).
- 📚 **Educational** — Every grammar rule is documented with comments explaining *why* it exists, helping junior developers and open-source contributors understand the underlying parsing logic.
- 🧩 **Extensible** — Multi-grammar mono-repo architecture providing a unified foundation for all Salesforce language tooling.

## Quick Start

### Node.js

```sh
npm install tree-sitter tree-sitter-salesforce
```

```javascript
const Parser = require('tree-sitter');
const Salesforce = require('tree-sitter-salesforce');

const parser = new Parser();

// Parse Apex code (.cls, .trigger)
parser.setLanguage(Salesforce.apex);
const apexTree = parser.parse(`
  public with sharing class AccountService {
      public List<List<SObject>> searchAccounts() {
          return [FIND 'Acme*' IN ALL FIELDS RETURNING Account(Id, Name), Contact(FirstName, LastName)];
      }
  }
`);
console.log(apexTree.rootNode.toString());

// Parse Anonymous Apex scripts (.apex)
parser.setLanguage(Salesforce.apexAnon);
const anonTree = parser.parse(`
  Account a = new Account(Name = 'Acme');
  insert a;
  System.debug(a.Id);
`);
console.log(anonTree.rootNode.toString());

// Parse SOSL directly
parser.setLanguage(Salesforce.sosl);
const soslTree = parser.parse("FIND 'Acme*' IN ALL FIELDS RETURNING Account(Name)");
console.log(soslTree.rootNode.toString());

// Parse Formula Language expressions
parser.setLanguage(Salesforce.formula);
const formulaTree = parser.parse("IF(ISBLANK(Email__c), 'No Email', Email__c)");
console.log(formulaTree.rootNode.toString());
```

### Python

> **Prerequisites**: Python >= 3.9 and `tree-sitter >= 0.22.0`

```sh
pip install tree-sitter-salesforce
```

```python
import tree_sitter_salesforce as tss
from tree_sitter import Parser

parser = Parser()

# 1. Parse Apex (.cls, .trigger)
parser.language = tss.apex()
tree = parser.parse(b"public class T { }")
print(tree.root_node)

# 2. Parse Anonymous Apex scripts (.apex)
parser.language = tss.apex_anon()
anon_tree = parser.parse(b"Account a = new Account(Name = 'T'); insert a;")
print(anon_tree.root_node)

# 3. Parse SOQL queries (.soql)
parser.language = tss.soql()
soql_tree = parser.parse(b"SELECT Id, Name FROM Account WHERE IsActive = true")
print(soql_tree.root_node)

# 4. Parse SOSL search queries (.sosl)
parser.language = tss.sosl()
sosl_tree = parser.parse(b"FIND 'Acme' IN ALL FIELDS RETURNING Account(Name)")
print(sosl_tree.root_node)

# 5. Parse Formula Language expressions (.formula)
parser.language = tss.formula()
formula_tree = parser.parse(b"IF(Amount > 10000, 'Large', 'Small')")
print(formula_tree.root_node)
```

### WebAssembly (Browser / VSCode Web)

```sh
npm install web-tree-sitter tree-sitter-salesforce
```

```javascript
const Parser = require('web-tree-sitter');
const { apexWasm, soqlWasm, soslWasm, formulaWasm, apexAnonWasm } = require('tree-sitter-salesforce/bindings/web');

async function main() {
  await Parser.init();
  const parser = new Parser();

  // Load compiled WASM grammar
  const Apex = await Parser.Language.load(apexWasm);
  parser.setLanguage(Apex);

  const tree = parser.parse('public class AccountService { }');
  console.log(tree.rootNode.toString());
}
main();
```

## Parser Status

| Parser | Grammar | Tests | Highlights | Injection | Tags |
|---|---|---|---|---|---|
| **Apex** | ✅ | ✅ | ✅ | ✅ SOQL, SOSL | ✅ |
| **Anonymous Apex** | ✅ | ✅ | ✅ | ✅ SOQL, SOSL | — |
| **SOQL** | ✅ | ✅ | ✅ | — | — |
| **SOSL** | ✅ | ✅ | ✅ | — | — |
| **Formula** | ✅ | ✅ | ✅ | — | — |

## Salesforce API Version

Targets **API v67 (Summer '25)**. See [SALESFORCE_API.md](SALESFORCE_API.md).

## Dynamic SOQL & SOSL Support

| Scenario | Support Level |
|---|---|
| Inline `[SELECT ...]` (with subqueries) | ✅ Full SOQL parsing |
| Inline `[FIND ...]` (SOSL) | ✅ Full SOSL parsing |
| `Database.query('SELECT ...')` | ✅ SOQL parsing in string |
| `Database.queryWithBinds(...)` | ✅ SOQL parsing in string |
| `Database.countQuery(...)` | ✅ SOQL parsing in string |
| `Database.getQueryLocator(...)` | ✅ SOQL parsing in string |
| Concatenated query strings | ⚠️ Structural recognition |

See [ARCHITECTURE.md](ARCHITECTURE.md) for details.

## Roadmap

| Language | Status |
|---|---|
| SOSL | ✅ Completed |
| Anonymous Apex | ✅ Completed |
| Formula Language | ✅ Completed |
| SFLog | 🔲 Future |

## Documentation

- [How Tree-Sitter Works](docs/00-how-tree-sitter-works.md)
- [Understanding Apex](docs/03-understanding-apex.md)
- [Understanding Anonymous Apex](docs/03b-understanding-anonymous-apex.md)
- [Understanding SOQL](docs/04-understanding-soql.md)
- [Understanding SOSL](docs/05b-understanding-sosl.md)
- [Understanding Formula Language](docs/06b-understanding-formula.md)
- [Grammar DSL Cheatsheet](docs/02-grammar-dsl-cheatsheet.md)
- [Adding a New Language](docs/05-adding-new-language.md)
- [Testing Guide](docs/06-testing-guide.md)
- [Release Process & Distribution](docs/10-release-process.md)
- [Architecture](ARCHITECTURE.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE) for details.

