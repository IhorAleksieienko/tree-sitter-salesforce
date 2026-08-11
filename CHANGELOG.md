# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] — 2026-08-10

- **Test Parity & Regression Protection Suite** — Comprehensive test corpus expansion across Apex, SOQL, SOSL, and SFLOG grammars:
  - **Apex Operators Corpus** (`apex/test/corpus/operators.txt`): Exhaustive test coverage for compound assignment (`+=`, `-=`, `*=`, `/=`, `%=`, `&=`, `|=`, `^=`, `<<=`, `>>=`, `>>>=`), bitwise/shift operators (`&`, `|`, `^`, `~`, `<<`, `>>`, `>>>`), ternary conditionals, null-coalescing (`??`), and safe navigation (`?.`).
  - **Apex DML & Exception Handling** (`apex/test/corpus/statements.txt`): Tests for DML `merge` with array elements, `upsert` with schema field references, multi-catch exception blocks, and standalone `try-finally`.
  - **SOQL Exhaustive Date Literals** (`soql/test/corpus/date-literals.txt`): Comprehensive test suite for all platform date literal keywords (`TODAY`, `YESTERDAY`, `TOMORROW`, `LAST_N_DAYS:n`, `NEXT_N_WEEKS:n`, fiscal quarters/years) and ISO-8601 timezone offsets.
  - **SOQL Clauses & Multi-Queries** (`soql/test/corpus/clauses.txt`, `basic-queries.txt`, `aggregate_queries.txt`): Tests for individual `USING SCOPE` keywords (`delegated`, `everything`, `mine`, `my_territory`, `team`), `FOR VIEW, REFERENCE`, `UPDATE TRACKING/VIEWSTAT`, deep 5-level dotted relationships, and multi-subqueries.
  - **SOSL Search & Scope** (`sosl/test/corpus/scoped_searches.txt`): Tests for `IN ALL/NAME/EMAIL/PHONE/SIDEBAR FIELDS`, `UPDATE TRACKING/VIEWSTAT`, and `OFFSET`.
  - **Code Navigation Tag Test Fixtures** (`apex/test/tags/classes.cls`): Tag definition assertion suite for classes, interfaces, enums, triggers, and methods.
  - **Code Navigation Tag Tests & Sub-grammar Manifests**: Added `tree-sitter.json` manifests to all sub-grammars (`apex/`, `apex-anon/`, `soql/`, `sosl/`, `formula/`, `sflog/`) and enabled native tag testing (`apex/test/tags/`).
- **Salesforce Debug Log grammar (`sflog`)** (`sflog/grammar.js`) — Dedicated Tree-sitter parser for Salesforce execution debug logs (`.log`), parsing API version headers, category log filters, timestamped execution events (`USER_DEBUG`, `SOQL_EXECUTE_BEGIN`/`END`, `DML_BEGIN`/`END`, `METHOD_ENTRY`/`EXIT`, `CODE_UNIT_STARTED`/`FINISHED`, `USER_INFO`, `VARIABLE_SCOPE_BEGIN`, `VARIABLE_ASSIGNMENT`, `EXCEPTION_THROWN`, `FATAL_ERROR`), and cumulative governor limit summary tables.
- **`sflog` multi-language bindings and subpath exports** — Added `tree-sitter-salesforce/sflog` subpath export in Node.js, `tss.sflog()` loader in Python bindings, native N-API and C-API bindings, and playground WASM support.
- **Modern Node.js subpath exports** (`package.json`) — Support for direct granular imports (`tree-sitter-salesforce/apex`, `tree-sitter-salesforce/apex-anon`, `tree-sitter-salesforce/soql`, `tree-sitter-salesforce/sosl`, `tree-sitter-salesforce/formula`, `tree-sitter-salesforce/sflog`) in CommonJS and ESM with full TypeScript type declarations.
- **Interactive WebAssembly Playground** (`docs/playground/`) — Browser-based CST visualizer featuring live multi-grammar switching, real-time node filtering, S-Expression/JSON views, and preloaded Summer '25 sample snippets.
- **WebAssembly Playground Guide** (`docs/14-wasm-playground.md`) — Comprehensive guide for local playground execution, WASM compilation, and syntax debugging.
- **Playground build helper script** (`scripts/build-wasm-playground.js`) — Automated compilation and distribution pipeline for playground WASM assets.

- **SOSL grammar** (`sosl/grammar.js`) — Full Salesforce Object Search Language support:
  `FIND … IN … RETURNING … WITH …`, field scopes, per-object WHERE/ORDER/LIMIT, WITH clauses.
- **SOSL brace search delimiters** (`sosl_brace_string`) — Support for curly brace search terms (`FIND {term}`) with wildcards, logical operators, and exact phrase patterns.
- **SOSL `RETURNING` projection functions** (`projection_function_call`) — Support for `toLabel()`, `convertCurrency()`, and `FORMAT()` inside `RETURNING` field lists.
- **Modern SOSL `WITH` clauses** — Support for `WITH USER_MODE`/`WITH SYSTEM_MODE` (`with_security_clause`), `WITH METADATA` (`with_metadata_clause`), `WITH NETWORK IN (...)` list syntax (`with_network_clause`), `WITH SNIPPET (TARGET_LENGTH = n)` (`with_snippet_clause`), and `:bindVariable` support in `WITH DIVISION` (`with_division_clause`).

- **Formula Language grammar** (`formula/grammar.js`) — Declarative formula expression parser
  for Validation Rules, Formula Fields, and Flow criteria. 50+ built-in functions, field-path
  references, global context variables (`$User`, `$CustomMetadata`).
- **Formula Geo-spatial & Date functions** — Added support for `GEOLOCATION`, `DISTANCE`, `TIMENOW`, `ISOWEEK`, `ISOYEAR`, and `UNIXTIMESTAMP` in `function_name`.
- **Structured Formula global variables** (`global_context`) — Explicit AST modeling for platform global namespaces (`$User`, `$Profile`, `$Organization`, `$RecordType`, `$Setup`, `$Permission`, `$CustomMetadata`, `$Label`, etc.) with `context` and `field` nodes.
- **Dedicated `IMAGE` expression node** (`image_expression`) — Dedicated node for `IMAGE(url, alt [, height, width])` exposing `image_url`, `alt_text`, `height`, and `width` named fields.
- **Scientific notation in Formula numbers** — Expanded `number` literal token regex to parse scientific notation decimals (`1.2e-5`, `3.0E+8`).
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
- **SOQL `USING LOOKUP ... BIND`** search filter clause (`using_lookup_clause`) in `soql/grammar.js`.
- **SOQL `WITH RecordVisibilityContext`** multi-parameter security clause (`record_visibility_context_clause`, `record_visibility_parameter`) in `soql/grammar.js`.
- **SOQL Time literals** (`time_literal`: `HH:mm:ss[.SSS][Z|+-HH:mm]`) and bind variables (`bind_variable`: `:varName`) in `soql/grammar.js`.
- **SOQL `convertTimezone()` function** (`convert_timezone_call`) supporting standalone, SELECT expressions, and nested date functions.
- **SOQL dynamic formula filtering** (`formula_expression`: `FORMULA('...')`) in `WHERE` and `HAVING` clauses.
- **SOQL `ALL ROWS` clause** (`all_rows_clause`) for soft-deleted and archived records.
- **Python loaders**: `tss.apex_anon()`, `tss.sosl()`, `tss.formula()`.
- **Map literal initializer syntax** (`map_initializer`, `map_key_initializer`) — Supports `new Map<K,V>{ key => value, ... }` with trailing comma support.
- **Interface member declarations** — Interface bodies now support method signatures, constants, inner classes, interfaces, and enums.
- **Generic inheritance clauses** — `extends` and `implements` clauses support `generic_type` (e.g. `extends BaseService<Account>`, `implements Database.Batchable<sObject>`) and `type_parameters` in class/interface/method declarations.
- **Static and instance initializers** (`static_initializer`, `instance_initializer`) — Support for `static { ... }` and bare `{ ... }` blocks in class bodies.
- **Trigger helper member declarations** — Allow helper methods, constants, fields, and inner types directly within `trigger_body`.
- **Explicit constructor chaining** (`explicit_constructor_invocation`) — Support for `this(...)`, `super(...)`, and outer-qualified `Outer.super(...)` constructor invocations.
- **`System.runAs(...)` test statement** (`run_as_statement`) — Dedicated construct for unit test context blocks with `user` and `body` fields.
- **Modern DML security modes** (`dml_security_mode`) — Support for `as user` and `as system` access levels across all DML statement forms (`insert`, `update`, `upsert`, `delete`, `undelete`, `merge`).
- **Case-insensitive switch keywords** — `switch on` and `when else` keywords match case-insensitively (`SWITCH ON`, `WHEN ELSE`, `Switch On`).
- **Summer '26 multi-line raw string literals** (`multi_line_string_literal`) — Triple single-quoted text block literals (`'''...'''`).
- **Array dimension sizing** (`array_creation_expression`) — Explicit dimension size allocations (`new String[10]`, `new Account[batchSize]`).
- **Extended literals** — Support for Long integers (`long_literal`: `100L`, `100l`), scientific decimals (`scientific_decimal`: `1.2e-5`), and class reflection tokens (`class_literal`: `Account.class`, `void.class`, `Database.Batchable.class`).
- **Highlighting queries** for `multi_line_string_literal`, `long_literal`, and `scientific_decimal`.
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
