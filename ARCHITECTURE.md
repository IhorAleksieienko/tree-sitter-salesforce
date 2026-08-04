# Architecture Blueprint

## Repository Structure

```
tree-sitter-salesforce/
│
├── 📄 README.md                          # Project overview, quickstart, status
├── 📄 LICENSE                            # MIT
├── 📄 NOTICE                             # Third-party attributions
├── 📄 CONTRIBUTING.md                    # How to add a new language parser
├── 📄 ARCHITECTURE.md                    # High-level architecture overview
├── 📄 CHANGELOG.md                       # Version history with SF API mapping
├── 📄 SALESFORCE_API.md                  # API v67 compatibility matrix & feature inventory
│
├── 📄 package.json                       # Root npm config: scripts, devDependencies
├── 📄 tree-sitter.json                   # Tree-sitter multi-grammar manifest
├── 📄 pyproject.toml                     # Python package config
├── 📄 binding.gyp                        # Node.js native binding config
│
├── 📁 docs/                              # Educational documentation
│   ├── 📄 00-how-tree-sitter-works.md    # Conceptual guide: what is tree-sitter?
│   ├── 📄 01-project-setup.md            # Environment setup instructions
│   ├── 📄 02-grammar-dsl-cheatsheet.md   # Quick reference for grammar.js functions
│   ├── 📄 03-understanding-apex.md       # Apex language overview for parser authors
│   ├── 📄 04-understanding-soql.md       # SOQL language overview for parser authors
│   ├── 📄 05-adding-new-language.md      # Step-by-step guide to add a new parser
│   ├── 📄 06-testing-guide.md            # How to write and run tests
│   ├── 📄 07-queries-and-highlights.md   # How syntax highlighting queries work
│   ├── 📄 08-troubleshooting.md          # Common errors and how to fix them
│   └── 📁 steps/                         # Implementation step files
│
├── 📁 common/                            # Shared grammar utilities
│   ├── 📄 common.js                      # Reusable DSL helpers (ci, commaJoined, etc.)
│   └── 📄 salesforce-types.js            # Shared Salesforce type definitions
│
├── 📁 apex/                              # Apex parser
│   ├── 📄 grammar.js                     # Apex grammar definition
│   ├── 📁 src/                           # Auto-generated C parser
│   ├── 📁 test/                          # Test corpus
│   └── 📁 queries/                       # Highlights, tags, locals, injections
│
├── 📁 soql/                              # SOQL parser
│   ├── 📄 grammar.js                     # SOQL grammar definition
│   ├── 📁 src/                           # Auto-generated C parser
│   ├── 📁 test/                          # Test corpus
│   └── 📁 queries/                       # Highlights
│
└── 📁 bindings/                          # Language-specific bindings
    ├── 📁 node/                          # Node.js binding
    ├── 📁 python/                        # Python binding
    └── 📁 web/                           # WASM binding
```

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Grammar Definition Layer                 │
│                                                             │
│   common/common.js ──→ apex/grammar.js ──→ tree-sitter CLI │
│                    ──→ soql/grammar.js ──→ tree-sitter CLI │
└─────────────────────────┬───────────────────────────────────┘
                          │ tree-sitter generate
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Generated Parser Layer                   │
│                                                             │
│   apex/src/parser.c        (C code)                         │
│   soql/src/parser.c        (C code)                         │
└─────────────────────────┬───────────────────────────────────┘
                          │ compiled to
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Binding Layer                            │
│                                                             │
│   Node.js: bindings/node/binding.cc → index.js             │
│   Python:  bindings/python/binding.c → __init__.py         │
│   WASM:    bindings/web/*.wasm → index.js                  │
└─────────────────────────┬───────────────────────────────────┘
                          │ used by
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Consumer Layer                           │
│                                                             │
│   Editors (Neovim, VS Code, Helix, Zed)                    │
│   Code Analysis Tools (linters, formatters)                │
└─────────────────────────────────────────────────────────────┘
```

## Language Injection Model (Apex ↔ SOQL)

```
Apex Source Code:
┌──────────────────────────────────────────────────────────────┐
│  List<Account> accts = [SELECT Id FROM Account WHERE ...];   │
│                        ▲                                 ▲   │
│                        │    SOQL injection boundary      │   │
│                        └─────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘

Apex Parser sees:          soql_expression node (opaque)
                                   │
                           injections.scm query
                                   │
                                   ▼
SOQL Parser injects:       Full SOQL syntax tree inside the node
```

### Injection Tiers
- **Tier 1 (Static Inline):** Full SOQL injection into `soql_expression` nodes.
- **Tier 2 (Database.query):** Full SOQL injection into string literals inside `Database.query()` calls.
- **Tier 3 (Dynamic SOQL):** String highlighting pattern matching for SOQL keywords in concatenated string variables inside Database method calls.
