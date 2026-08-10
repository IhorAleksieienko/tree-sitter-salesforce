# tree-sitter-salesforce

Tree-sitter grammars for Salesforce languages — **Apex, SOQL, SOSL, Formula Language,
and Anonymous Apex**.

> Providing fast, incremental, error-tolerant parsing for Salesforce development tools.

[![CI](https://github.com/IhorAleksieienko/tree-sitter-salesforce/actions/workflows/ci.yml/badge.svg)](https://github.com/IhorAleksieienko/tree-sitter-salesforce/actions)
[![npm version](https://img.shields.io/npm/v/tree-sitter-salesforce.svg)](https://www.npmjs.com/package/tree-sitter-salesforce)
[![PyPI version](https://img.shields.io/pypi/v/tree-sitter-salesforce.svg)](https://pypi.org/project/tree-sitter-salesforce/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🚀 **Production-quality Apex parser** — Salesforce API v67 (Summer '25), covering
  classes, interfaces, enums, triggers, DML, annotations, generics, and modern syntax
  (`?.`, `??`, switch/when, multi-SObject type patterns).
- 🔍 **SOQL parser** — Full query syntax including `TYPEOF`, `GROUP BY ROLLUP/CUBE`,
  date functions (`CALENDAR_MONTH`, `FISCAL_YEAR`), scalar functions (`FORMAT`, `convertCurrency`, `toLabel`, `GROUPING`), `convertTimezone()`, time literals, dynamic formula filtering (`FORMULA(...)`), `ALL ROWS` clause, bind variables, `USING SCOPE / LOOKUP ... BIND`, and all security
  clauses (`WITH USER_MODE / SYSTEM_MODE / DATA CATEGORY / RecordVisibilityContext`).
- 🔎 **SOSL parser** — Full-text search language: `FIND … IN … RETURNING … WITH …`,
  field scopes, per-object `WHERE` / `ORDER BY` / `LIMIT`, `WITH HIGHLIGHT`, `WITH SNIPPET`.
- 📐 **Formula Language parser** — Declarative formula expressions for Validation Rules,
  Formula Fields, and Flow criteria: 50+ built-in functions, field-path references, and
  global context variables (`$User`, `$Organization`, `$CustomMetadata`, `$Setup`).
- 📝 **Anonymous Apex parser** — Parses top-level executable scripts (Developer Console
  "Execute Anonymous", `sf apex run`) without a class wrapper.
- 🔗 **Language injection** — SOQL and SOSL are highlighted correctly *inside* Apex code
  (both static `[SELECT …]`/`[FIND …]` literals and dynamic `Database.*` method strings).
- 📦 **Multi-language bindings** — Python (≥ 0.22 native capsule API), Node.js, and
  WebAssembly bindings for browser and VS Code Web.
- 📚 **Educational** — Every grammar rule carries inline comments explaining *why* it
  exists, designed for contributors and parser authors.

## Quick Start

### Python

```sh
pip install tree-sitter-salesforce
```

```python
import tree_sitter_salesforce as tss
from tree_sitter import Parser

parser = Parser()

# ── Apex (.cls / .trigger) ──────────────────────────────────────────────────
parser.language = tss.apex()
tree = parser.parse(b"""
public with sharing class AccountService {
    public List<Account> getAccounts() {
        return [SELECT Id, Name FROM Account];
    }
}
""")
print(tree.root_node.sexp())

# ── Anonymous Apex (Developer Console / sf apex run) ────────────────────────
parser.language = tss.apex_anon()
tree = parser.parse(b"insert new Account(Name = 'Test');\nSystem.debug('done');")
print(tree.root_node.sexp())

# ── SOQL ────────────────────────────────────────────────────────────────────
parser.language = tss.soql()
tree = parser.parse(b"SELECT Id, Name FROM Account WHERE IsDeleted = false LIMIT 10")
print(tree.root_node.sexp())

# ── SOSL ────────────────────────────────────────────────────────────────────
parser.language = tss.sosl()
tree = parser.parse(b"FIND 'Acme*' IN ALL FIELDS RETURNING Account(Name), Contact(Email)")
print(tree.root_node.sexp())

# ── Formula Language ─────────────────────────────────────────────────────────
parser.language = tss.formula()
tree = parser.parse(b"IF(ISBLANK(Email__c), 'Required', Email__c & ' (' & $User.Name & ')')")
print(tree.root_node.sexp())
```

### Node.js

```sh
npm install tree-sitter tree-sitter-salesforce
```

```javascript
const Parser = require('tree-sitter');
const { apex, apexAnon, soql, sosl, formula } = require('tree-sitter-salesforce');

const parser = new Parser();

// Apex
parser.setLanguage(apex);
const apexTree = parser.parse(`public class T { }`);
console.log(apexTree.rootNode.toString());

// Anonymous Apex
parser.setLanguage(apexAnon);
const anonTree = parser.parse(`Account a = new Account(Name = 'T'); insert a;`);
console.log(anonTree.rootNode.toString());

// SOQL
parser.setLanguage(soql);
const soqlTree = parser.parse(`SELECT Id FROM Account WHERE Name = 'Acme'`);
console.log(soqlTree.rootNode.toString());

// SOSL
parser.setLanguage(sosl);
const soslTree = parser.parse(`FIND 'Acme*' IN ALL FIELDS RETURNING Account(Name)`);
console.log(soslTree.rootNode.toString());

// Formula Language
parser.setLanguage(formula);
const formulaTree = parser.parse(`IF(ISBLANK(Email__c), 'No Email', Email__c)`);
console.log(formulaTree.rootNode.toString());
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
| **Apex** | ✅ | ✅ | ✅ | ✅ SOQL + SOSL | ✅ |
| **Apex (Anonymous)** | ✅ | ✅ | ✅ (shared) | ✅ SOQL + SOSL | — |
| **SOQL** | ✅ | ✅ | ✅ | — | — |
| **SOSL** | ✅ | ✅ | ✅ | — | — |
| **Formula Language** | ✅ | ✅ | ✅ | — | — |

## Salesforce API Version

Targets **API v67 (Summer '25)**. See [SALESFORCE_API.md](SALESFORCE_API.md).

## Dynamic Query Support

| Scenario | SOQL | SOSL |
|---|---|---|
| Inline `[SELECT …]` / `[FIND …]` | ✅ Full parsing | ✅ Full parsing |
| `Database.query('SELECT …')` | ✅ String injection | — |
| `Database.queryWithBinds(…)` | ✅ String injection | — |
| `Database.countQuery(…)` | ✅ String injection | — |
| `Database.getQueryLocator(…)` | ✅ String injection | — |
| Concatenated query strings | ⚠️ Structural recognition | — |

## Roadmap

| Feature | Status |
|---|---|
| SFLog parser | 🔲 Future |
| Apex type-flow analysis queries (`locals.scm` for all grammars) | 🔲 Future |
| VS Code extension | 🔲 Future |

## Documentation

- [How Tree-Sitter Works](docs/00-how-tree-sitter-works.md)
- [Grammar DSL Cheatsheet](docs/02-grammar-dsl-cheatsheet.md)
- [Understanding Apex](docs/03-understanding-apex.md)
- [Understanding Anonymous Apex](docs/13-understanding-anonymous-apex.md)
- [Understanding SOQL](docs/04-understanding-soql.md)
- [Understanding SOSL](docs/11-understanding-sosl.md)
- [Understanding Formula Language](docs/12-understanding-formula.md)
- [Getting Started Tutorial](docs/09-getting-started-tutorial.md)
- [Adding a New Language](docs/05-adding-new-language.md)
- [Testing Guide](docs/06-testing-guide.md)
- [Release Process](docs/10-release-process.md)
- [Architecture](ARCHITECTURE.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE) for details.
