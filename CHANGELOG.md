# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
