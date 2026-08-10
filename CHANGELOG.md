# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-08-10

### Changed (Breaking for Build Layer)
- **Python Bindings Modernization**: Migrated Python package architecture from deprecated `Language(_SHARED_LIB, name)` path-based loading to modern `PyCapsule` native C extension modules (`_binding_apex`, `_binding_apex_anon`, `_binding_soql`, `_binding_sosl`, `_binding_formula`).
- **Dependency Requirement**: Declared `tree-sitter>=0.22.0` as a mandatory Python runtime dependency.
- **Python Loader Returns**: Python loader functions (`tss.apex()`, `tss.apex_anon()`, `tss.soql()`, `tss.sosl()`, `tss.formula()`) now return `tree_sitter.Language` instances directly.

### Migration Guide (0.1.x to 0.2.0)
- **Pip Requirements**: Ensure your environment installs `tree-sitter>=0.22.0` (e.g. `pip install "tree-sitter>=0.22.0"`).
- **Python Code**:
  ```python
  # Before (0.1.x)
  from tree_sitter import Language, Parser
  import tree_sitter_salesforce as tss
  parser = Parser()
  parser.language = Language(tss.apex())

  # After (0.2.0)
  from tree_sitter import Parser
  import tree_sitter_salesforce as tss
  parser = Parser()
  parser.language = tss.apex()  # Returns Language object directly
  ```

### Fixed
- **Apex SOQL Expressions**: Replaced naive regex matching in `soql_expression` with recursive balanced-bracket parsing (`_soql_content`), supporting nested child subqueries (e.g. `(SELECT Name FROM Contacts)`) and map bind keys (`:map['key']`) without premature termination.

### Added
- **SOQL Grammar Expansion**: Expanded `soql/grammar.js` to support all 13 SOQL date functions (`CALENDAR_MONTH`, `CALENDAR_QUARTER`, `CALENDAR_YEAR`, `DAY_IN_MONTH`, `DAY_IN_WEEK`, `DAY_IN_YEAR`, `DAY_ONLY`, `FISCAL_MONTH`, `FISCAL_QUARTER`, `FISCAL_YEAR`, `HOUR_IN_DAY`, `WEEK_IN_MONTH`, `WEEK_IN_YEAR`), scalar functions (`FORMAT`, `convertCurrency`, `toLabel`, `GROUPING`), aggregate query extensions (`GROUP BY ROLLUP`, `GROUP BY CUBE`), and `WITH DATA CATEGORY` filtering.
- **SOQL Test Corpus**: Added dedicated corpus suites for aggregate queries (`GROUP BY ROLLUP/CUBE`, `HAVING`, `GROUPING()`), date functions, security clauses (`WITH USER_MODE/SYSTEM_MODE`, `WITH DATA CATEGORY`), and polymorphic `TYPEOF` queries.
- **Apex SOSL Expressions**: Added `sosl_expression` AST node type to `expression` supertype for `[FIND ...]` syntax.
- **Language Injections**: Expanded `apex/queries/injections.scm` to support `sosl_expression` and `Database.queryWithBinds(...)`.
- **SOSL Grammar**: Authored dedicated `sosl` Tree-sitter grammar (`sosl/grammar.js`) supporting full-text search statements (`FIND 'term' IN scope RETURNING SObjects(...) WITH clauses LIMIT n OFFSET n UPDATE TRACKING/VIEWSTAT`).
- **SOSL Test Corpus & Queries**: Added comprehensive corpus test suites (`basic_searches.txt`, `scoped_searches.txt`) and syntax highlight captures (`highlights.scm`).
- **SOSL Multi-Language Bindings**: Exposed `sosl` grammar via Node.js native bindings (`require('tree-sitter-salesforce').sosl`) and Python bindings (`tree_sitter_salesforce.sosl()`).
- **Anonymous Apex Grammar**: Authored dedicated `apex_anon` Tree-sitter grammar (`apex-anon/grammar.js`) extending shared Apex rules with `source_file: repeat($.statement)` for top-level script execution.
- **Anonymous Apex Test Corpus & Queries**: Added corpus test suite covering debug statements, DML, enhanced SOQL for loops, try-catch blocks, and switch patterns.
- **Anonymous Apex Multi-Language Bindings**: Exposed `apex_anon` grammar via Node.js native bindings (`require('tree-sitter-salesforce').apexAnon` / `.apex_anon`) and Python bindings (`tree_sitter_salesforce.apex_anon()`).
- **Apex Multi-SObject When Patterns**: Extended `when_clause` with `when_type_pattern` to support comma-separated polymorphic SObject type matching (`when Account a, Contact c { ... }`), with full support for pattern variable binding, highlighting, and local scope resolution.
- **Salesforce Formula Grammar**: Authored dedicated `formula` Tree-sitter grammar (`formula/grammar.js`) for Salesforce declarative formulas (Validation Rules, Formula Fields, Flow Decision Criteria, Process Builder).
- **Formula Test Corpus & Queries**: Added comprehensive corpus test suites (`validation_rules.txt`, `formula_fields.txt`, `flow_criteria.txt`) and syntax highlight captures (`highlights.scm`).
- **Formula Multi-Language Bindings**: Exposed `formula` grammar via Node.js native bindings (`require('tree-sitter-salesforce').formula`) and Python bindings (`tree_sitter_salesforce.formula()`).
- **Formula Documentation**: Added `docs/06b-understanding-formula.md` covering expression architecture, precedence rules, and function recognition.
- **CI/CD Build Matrix**: Implemented `.github/workflows/ci.yml` running across Ubuntu, macOS, and Windows runners for all 5 grammars and Python versions 3.9, 3.10, 3.11, and 3.12.
- **Automated Multi-Platform Release Pipeline**: Implemented `.github/workflows/release.yml` with `cibuildwheel` (Linux x86_64, Linux aarch64 via QEMU, macOS universal2/arm64, Windows x64), Emscripten WebAssembly compilation, trusted OIDC PyPI publishing, and automated npm publishing.
- **WebAssembly Bindings**: Added `bindings/web/index.js` loader exporting WASM binary paths for Apex, Anonymous Apex, SOQL, SOSL, and Formula parsers.
- **Build & Test Automation Scripts**: Added `scripts/generate-all.js`, `scripts/build-wasm.js`, `scripts/test-all.js`, and `scripts/test_bindings.py`.
- **Release Documentation**: Added `docs/10-release-process.md` detailing the end-to-end release process, artifact matrix, and rollback procedures.

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
