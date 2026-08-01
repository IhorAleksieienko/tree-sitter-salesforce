# tree-sitter-salesforce

> 🚧 **Under Construction** — This project is in active development.

Tree-sitter grammars for Salesforce languages, including:

- **Apex** — The server-side programming language for the Salesforce platform
- **SOQL** — Salesforce Object Query Language

- 🚀 **Production-quality** Apex parser targeting Salesforce API v67 (Summer '25), ensuring compatibility with the latest platform features.
- 🔍 **SOQL parser** with full query syntax support to accurately analyze database operations.
- 🔗 **Language injection** — SOQL is highlighted correctly inside Apex code, improving readability and reducing syntax errors when writing inline database queries.
- 📦 **Multi-language bindings** — Node.js, Python, and WASM bindings allow these parsers to be integrated into any modern tooling ecosystem (e.g., linters, IDEs, CI/CD pipelines).
- 📚 **Educational** — Every grammar rule is documented with comments explaining *why* it exists, helping junior developers and open-source contributors understand the underlying parsing logic.
- 🧩 **Extensible** — Mono-repo architecture ready for SOSL, Anonymous Apex, and more, providing a unified foundation for all Salesforce language tooling.

| Parser | Grammar | Tests | Highlights | Injections |
|---|---|---|---|---|
| Apex | 🔲 Planned | 🔲 | 🔲 | 🔲 |
| SOQL | 🔲 Planned | 🔲 | 🔲 | — |

## Salesforce API Version

This parser targets **Salesforce API v67 (Summer '25)**.
See [SALESFORCE_API.md](SALESFORCE_API.md) for the full compatibility matrix.

## License

MIT — see [LICENSE](LICENSE) for details.
