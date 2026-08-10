# Implementation Steps — Master Index

This directory contains self-contained implementation step stories for the `tree-sitter-salesforce` project.
Each file is a checkpoint document that any agent (or human contributor) can pick up and execute independently, as long as the stated prerequisites have been met.

---

## Steps 1–9: Foundation (Completed)

These steps built the initial Apex and SOQL parsers, bindings, and documentation.

| Step | File | Summary | Status |
|---|---|---|---|
| 01 | [step-01-environment-setup.md](step-01-environment-setup.md) | Dev environment, Node.js, tree-sitter CLI | ✅ Complete |
| 02 | [step-02-common-utilities.md](step-02-common-utilities.md) | Shared grammar helpers (`common.js`) | ✅ Complete |
| 03 | [step-03-soql-parser.md](step-03-soql-parser.md) | Complete SOQL grammar | ✅ Complete |
| 04 | [step-04-apex-core.md](step-04-apex-core.md) | Apex core: declarations, types, expressions | ✅ Complete |
| 05 | [step-05-apex-statements.md](step-05-apex-statements.md) | Apex statements: loops, DML, switch | ✅ Complete |
| 06 | [step-06-apex-advanced.md](step-06-apex-advanced.md) | Apex advanced: annotations, async, generics | ✅ Complete |
| 07 | [step-07-injection-and-queries.md](step-07-injection-and-queries.md) | Language injection, highlights, tags | ✅ Complete |
| 08 | [step-08-bindings.md](step-08-bindings.md) | Node.js and Python bindings | ✅ Complete |
| 09 | [step-09-documentation.md](step-09-documentation.md) | Documentation and guides | ✅ Complete |

---

## Steps 10–18: Enterprise Parser Blueprint

These steps implement the architecture and blueprints consolidated in [ARCHITECTURE.md](../../ARCHITECTURE.md), extending the project with SOSL, Formula Language, Anonymous Apex, and multi-language distribution.

| Step | File | Blueprint Phase | Risk | Status |
|---|---|---|---|---|
| 10 | [step-10-fix-soql-expression.md](step-10-fix-soql-expression.md) | Phase 1.1 / 1.3 | Medium | ✅ Complete |
| 11 | [step-11-soql-expansion.md](step-11-soql-expansion.md) | Phase 1.2 / 1.4 | Low | ✅ Complete |
| 12 | [step-12-sosl-grammar.md](step-12-sosl-grammar.md) | Phase 3.1 / 3.3–3.4 | Low | ✅ Complete |
| 13 | [step-13-anonymous-apex.md](step-13-anonymous-apex.md) | Phase 3.2 / 3.3 | **High** | ✅ Complete |
| 14 | [step-14-when-clause-patterns.md](step-14-when-clause-patterns.md) | Phase 1.1.3 | Low | ✅ Complete |
| 15 | [step-15-formula-grammar.md](step-15-formula-grammar.md) | Phase 2.1–2.4 | Low | ✅ Complete |
| 16 | [step-16-python-bindings.md](step-16-python-bindings.md) | Phase 4.2 | **High** | 🔲 Not started |
| 17 | [step-17-cicd-distribution.md](step-17-cicd-distribution.md) | Phase 4.1 / 4.3–4.4 | Low | 🔲 Not started |
| 18 | [step-18-documentation-update.md](step-18-documentation-update.md) | Cross-cutting | Low | 🔲 Not started |

---

## Steps 19–29: Gap Analysis & Ecosystem Parity Roadmap

These steps implement all fixes, syntax extensions, multi-ecosystem bindings, and downstream semantic ingestion pipelines specified in [gap-analysis.md](../gap-analysis.md).

| Step | File | Gap Analysis Area | Priority | Status |
|---|---|---|---|---|
| 19 | [step-19-apex-interface-generics-maps.md](step-19-apex-interface-generics-maps.md) | Apex Interface methods, generic `implements`/`extends`, Map literals (`key => val`) | **P0** | ✅ Complete |
| 20 | [step-20-apex-initializers-and-trigger-helpers.md](step-20-apex-initializers-and-trigger-helpers.md) | Apex `static { ... }`, instance `{ ... }`, Trigger helper declarations | **P1** | ✅ Complete |
| 21 | [step-21-apex-constructor-chaining-runas-dml-security.md](step-21-apex-constructor-chaining-runas-dml-security.md) | Apex `this(...)`/`super(...)`, `System.runAs(...)`, DML `as user`/`as system` | **P1** | ✅ Complete |
| 22 | [step-22-apex-syntax-extended-literals.md](step-22-apex-syntax-extended-literals.md) | Switch case-insensitivity, Summer '26 `'''...'''`, `new String[10]`, `100L`, `1.2e-5`, `Type.class` | **P1/P2** | ✅ Complete |
| 23 | [step-23-soql-formula-and-all-rows.md](step-23-soql-formula-and-all-rows.md) | SOQL Summer '26 `FORMULA(...)` in `WHERE`, SOQL `ALL ROWS` clause | **P1** | ✅ Complete |
| 24 | [step-24-soql-using-lookup-record-visibility-and-time.md](step-24-soql-using-lookup-record-visibility-and-time.md) | SOQL `USING LOOKUP … BIND`, `WITH RecordVisibilityContext(...)`, `TimeLiteral` & `convertTimezone()` | **P2** | ✅ Complete |
| 25 | [step-25-sosl-delimiters-with-clauses-and-projections.md](step-25-sosl-delimiters-with-clauses-and-projections.md) | SOSL `{brace}` search terms, modern `WITH` clauses (`USER_MODE`, `METADATA`), `RETURNING` projections | **P1/P2** | ✅ Complete |
| 26 | [step-26-formula-functions-globals-and-image-node.md](step-26-formula-functions-globals-and-image-node.md) | Formula Geo/Date functions (`GEOLOCATION`, `TIMENOW`), `$RecordType`/`$Setup` globals, `IMAGE()` node, scientific decimals | **P1/P2** | ✅ Complete |
| 27 | [step-27-rust-bindings-subpath-exports-wasm-playground.md](step-27-rust-bindings-subpath-exports-wasm-playground.md) | Modern `package.json` subpath exports, WASM browser playground | **P2** | ✅ Complete |
| 28 | [step-28-salesforce-debug-log-grammar-sflog.md](step-28-salesforce-debug-log-grammar-sflog.md) | Dedicated `sflog` Tree-sitter grammar for Salesforce execution logs & governor limits | **P2** | ✅ Complete |
| 29 | [step-29-downstream-semantic-ingestion-sf-rag-engine.md](step-29-downstream-semantic-ingestion-sf-rag-engine.md) | Downstream XML metadata ingestor, LWC JS/TS controller analyzer, LWC HTML template analyzer (`sf-rag-engine`) | **P1/P2** | 🔲 Not started |

**Status key**: ✅ Complete | 🔧 In Progress | 🔲 Not Started | ❌ Blocked

---

## Full Execution Order & Dependency Graph

```
[Phase 1 & 2 Grammars]
Step 10 (soql_expression fix)
    ├──▶ Step 11 (SOQL expansion) ────────▶ Step 23 (SOQL FORMULA + ALL ROWS) ──▶ Step 24 (SOQL LOOKUP/Time)
    │        │
    │        └──▶ Step 12 (SOSL grammar) ──▶ Step 25 (SOSL Delimiters & Modern WITH)
    │
    ├──▶ Step 13 (Anonymous Apex)
    │
    ├──▶ Step 14 (when clause patterns)
    │        │
    │        └──▶ Step 19 (Apex P0: Interfaces, Generics, Maps)
    │                 │
    │                 ├──▶ Step 20 (Apex P1: Initializers & Trigger Helpers)
    │                 ├──▶ Step 21 (Apex P1: Constructor Chaining, runAs, DML Security)
    │                 └──▶ Step 22 (Apex P1/P2: Switch ci, Multi-line Strings, Sized Arrays, Literals)
    │
    └──▶ Step 15 (Formula grammar) ───────▶ Step 26 (Formula Functions, Globals, IMAGE Node)
                                                  │
                                          [Bindings & Tooling]
                                          Step 16 (Python bindings)
                                                  │
                                          Step 27 (Rust bindings, Subpaths, WASM Playground)
                                                  │
                                          Step 28 (sflog grammar)
                                                  │
                                          Step 17 (CI/CD + Distribution)
                                                  │
                                          [Semantic Layer & Final Docs]
                                          Step 29 (sf-rag-engine Semantic Ingestion)
                                                  │
                                          Step 18 (Master Documentation Update)
```

---

## How Each Step File Is Structured

Every step story in this directory follows a strict checkpoint architecture:

| Section | Purpose |
|---|---|
| **Agent Checkpoint** (header callout) | State of the world when this step begins; exact prerequisites and risk flags |
| **Goal** | Concise statement of what this step achieves |
| **Background & Current State** | Exact lines and grammar definitions explaining why the change is required |
| **Technical Design** | Grammar rules, AST node structures, precedence/GLR considerations, and what to touch (without code snippet dumps) |
| **Affected Files** | Table of every file to create or modify |
| **Sub-Tasks** | Numbered task breakdown for incremental implementation |
| **How to Test** | Numbered CLI commands, test corpus creation, and verification steps |
| **Success Criteria** | Mechanically verifiable pass/fail condition table |
| **Regression Risk & API Contract Impact** | Conflict checks, CST stability, and downstream impact |
| **Documentation Updates** | Checklist of documentation to update before marking the step complete |
