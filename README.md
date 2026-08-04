# tree-sitter-salesforce

Tree-sitter grammars for Salesforce languages — **Apex** and **SOQL**.

> Providing fast, incremental, error-tolerant parsing for Salesforce development tools.

## Features

- 🚀 **Production-quality** Apex parser targeting Salesforce API v67 (Summer '25), ensuring compatibility with the latest platform features.
- 🔍 **SOQL parser** with full query syntax support to accurately analyze database operations.
- 🔗 **Language injection** — SOQL is highlighted correctly inside Apex code, improving readability and reducing syntax errors when writing inline database queries.
- 📦 **Multi-language bindings** — Node.js, Python, and WASM bindings allow these parsers to be integrated into any modern tooling ecosystem (e.g., linters, IDEs, CI/CD pipelines).
- 📚 **Educational** — Every grammar rule is documented with comments explaining *why* it exists, helping junior developers and open-source contributors understand the underlying parsing logic.
- 🧩 **Extensible** — Mono-repo architecture ready for SOSL, Anonymous Apex, and more, providing a unified foundation for all Salesforce language tooling.

## Quick Start

### Node.js

```sh
npm install tree-sitter tree-sitter-salesforce
```

```javascript
const Parser = require('tree-sitter');
const Salesforce = require('tree-sitter-salesforce');

const parser = new Parser();
parser.setLanguage(Salesforce.apex);

const tree = parser.parse(`
  public with sharing class AccountService {
      public List<Account> getAccounts() {
          return [SELECT Id, Name FROM Account];
      }
  }
`);

console.log(tree.rootNode.toString());
```

### Python

```sh
pip install tree-sitter-salesforce
```

```python
import tree_sitter_salesforce as tss
from tree_sitter import Language, Parser

parser = Parser()
parser.language = Language(tss.apex())
tree = parser.parse(b"public class T { }")
print(tree.root_node.sexp())
```

## Parser Status

| Parser | Grammar | Tests | Highlights | Injection | Tags |
|---|---|---|---|---|---|
| **Apex** | ✅ | ✅ | ✅ | ✅ SOQL | ✅ |
| **SOQL** | ✅ | ✅ | ✅ | — | — |

## Salesforce API Version

Targets **API v67 (Summer '25)**. See [SALESFORCE_API.md](SALESFORCE_API.md).

## Dynamic SOQL Support

| Scenario | Support Level |
|---|---|
| Inline `[SELECT ...]` | ✅ Full SOQL parsing |
| `Database.query('SELECT ...')` | ✅ SOQL parsing in string |
| Concatenated query strings | ⚠️ Structural recognition |

See [ARCHITECTURE.md](ARCHITECTURE.md) for details.

## Roadmap

| Language | Status |
|---|---|
| SOSL | 🔲 Planned |
| Anonymous Apex | 🔲 Planned |
| SFLog | 🔲 Future |

## Documentation

- [How Tree-Sitter Works](docs/00-how-tree-sitter-works.md)
- [Grammar DSL Cheatsheet](docs/02-grammar-dsl-cheatsheet.md)
- [Adding a New Language](docs/05-adding-new-language.md)
- [Testing Guide](docs/06-testing-guide.md)
- [Architecture](ARCHITECTURE.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE) for details.
