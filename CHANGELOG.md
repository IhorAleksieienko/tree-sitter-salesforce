# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] — 2026-08-10

### Added

- **SOSL grammar** (`sosl/grammar.js`) — Full Salesforce Object Search Language support:
  `FIND … IN … RETURNING … WITH …`, field scopes, per-object WHERE/ORDER/LIMIT, WITH clauses.
- **Formula Language grammar** (`formula/grammar.js`) — Declarative formula expression parser
  for Validation Rules, Formula Fields, and Flow criteria. 50+ built-in functions, field-path
  references, global context variables (`$User`, `$CustomMetadata`).
- **Anonymous Apex grammar** (`apex-anon/grammar.js`) — Top-level statement parsing for
  Developer Console and `sf apex run` scripts.
- **`sosl_expression` node** in `apex/grammar.js` — Allows Apex `[FIND …]` blocks to be
  injected with the SOSL parser.
- **SOSL injection** in `apex/queries/injections.scm`.
- **`Database.queryWithBinds()` injection** in `apex/queries/injections.scm`.
- **`when_type_pattern` node** — Multi-SObject `when Account a, Contact c {}` syntax.
- **SOQL `GROUP BY ROLLUP/CUBE`** in `soql/grammar.js`.
- **SOQL date functions** (`CALENDAR_MONTH`, `FISCAL_YEAR`, etc.) in `soql/grammar.js`.
- **`WITH DATA CATEGORY`** clause in `soql/grammar.js`.
- **Python loaders**: `tss.apex_anon()`, `tss.sosl()`, `tss.formula()`.
- **Map literal initializer syntax** (`map_initializer`, `map_key_initializer`) — Supports `new Map<K,V>{ key => value, ... }` with trailing comma support.
- **Interface member declarations** — Interface bodies now support method signatures, constants, inner classes, interfaces, and enums.
- **Generic inheritance clauses** — `extends` and `implements` clauses support `generic_type` (e.g. `extends BaseService<Account>`, `implements Database.Batchable<sObject>`) and `type_parameters` in class/interface/method declarations.
- **Static and instance initializers** (`static_initializer`, `instance_initializer`) — Support for `static { ... }` and bare `{ ... }` blocks in class bodies.
- **Trigger helper member declarations** — Allow helper methods, constants, fields, and inner types directly within `trigger_body`.
- **Operator highlighting** for `=>` fat-arrow token in `apex/queries/highlights.scm`.
- **CI/CD workflow** — GitHub Actions build matrix (Windows / Linux / macOS / WASM).
- **WASM binaries** for all five grammars in `bindings/web/`.

### Changed

- **`soql_expression`** — Replaced naive regex with balanced-bracket rule that correctly
  handles nested subqueries.
- **Python bindings** — Migrated from deprecated `Language(path, name)` constructor to
  per-grammar `_binding_*.pyd` C extensions (requires `tree-sitter >= 0.22.0`).
- **`binding.gyp`** — Now compiles five separate C extension targets.
- **`pyproject.toml`** — Added `tree-sitter>=0.22.0` as a runtime dependency; bumped
  version to `0.2.0`.

### Migration Guide (0.1.x → 0.2.0)

**Python**: The function signatures (`apex()`, `soql()`) are unchanged and now return `Language` instances directly. You must upgrade `tree-sitter` to `>= 0.22.0`:

```sh
pip install "tree-sitter>=0.22.0" "tree-sitter-salesforce==0.2.0"
```

```python
# Python 0.2.0 usage:
import tree_sitter_salesforce as tss
from tree_sitter import Parser

parser = Parser()
parser.language = tss.apex()
```

**Node.js**: No breaking changes. New exports: `apexAnon`, `sosl`, `formula`.

---

## [0.1.0] - Initial Release

### Added
- **Apex Parser**: Complete grammar matching Salesforce API v67.
  - Supports all class, interface, enum, and trigger declarations.
  - Supports all methods, constructors, and properties.
  - Supports all statements, expressions, and type definitions.
  - Added support for Salesforce-specific features: DML operations, `System.runAs`, annotations.
  - Added support for v67 operators: Safe navigation (`?.`), Null coalescing (`??`).
- **SOQL Parser**: Complete grammar.
  - Supports all standard clauses: `SELECT`, `FROM`, `WHERE`, `WITH`, `GROUP BY`, `HAVING`, `ORDER BY`, `LIMIT`, `OFFSET`, `FOR`.
  - Supports subqueries, relationships, `TYPEOF`, date literals, and bind variables.
- **Language Injection**: SOQL parsing is automatically injected into Apex `[SELECT ...]` expressions and `Database.query('SELECT ...')` string literals.
- **Query Files**: Comprehensive `.scm` files for highlights, tags, locals, and injections.
- **Bindings**: Available for Node.js, Python, and WASM.
- **Documentation**: Extensive educational documentation under `docs/`.
