# Implementation Steps — Index

This directory contains implementation step stories for the `tree-sitter-salesforce` project.
Each file is a self-contained checkpoint document that any agent (or human contributor) can
pick up and execute independently, as long as the stated prerequisites have been met.

---

## Steps 1–9: Foundation (Completed)

These steps built the initial Apex and SOQL parsers, bindings, and documentation.

| Step | File | Summary |
|---|---|---|
| 01 | [step-01-environment-setup.md](step-01-environment-setup.md) | Dev environment, Node.js, tree-sitter CLI |
| 02 | [step-02-common-utilities.md](step-02-common-utilities.md) | Shared grammar helpers (`common.js`) |
| 03 | [step-03-soql-parser.md](step-03-soql-parser.md) | Complete SOQL grammar |
| 04 | [step-04-apex-core.md](step-04-apex-core.md) | Apex core: declarations, types, expressions |
| 05 | [step-05-apex-statements.md](step-05-apex-statements.md) | Apex statements: loops, DML, switch |
| 06 | [step-06-apex-advanced.md](step-06-apex-advanced.md) | Apex advanced: annotations, async, generics |
| 07 | [step-07-injection-and-queries.md](step-07-injection-and-queries.md) | Language injection, highlights, tags |
| 08 | [step-08-bindings.md](step-08-bindings.md) | Node.js and Python bindings |
| 09 | [step-09-documentation.md](step-09-documentation.md) | Documentation and guides |

---

## Steps 10–17: Enterprise Parser Blueprint

These steps implement the [ENTERPRISE_PARSER_BLUEPRINT.md](../ENTERPRISE_PARSER_BLUEPRINT.md),
extending the project with SOSL, Formula Language, Anonymous Apex, and production-grade distribution.

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

**Status key**: ✅ Complete | 🔧 In Progress | 🔲 Not Started | ❌ Blocked

---

## Execution Order & Dependencies

```
Step 10 (soql_expression fix)
    │
    ├──▶ Step 11 (SOQL expansion)
    │        │
    │        └──▶ Step 12 (SOSL grammar) ──┐
    │                                       │
    ├──▶ Step 13 (Anonymous Apex) ─────────┤
    │                                       │
    └──▶ Step 14 (when clause patterns) ───┤
                                           │
                                    Step 15 (Formula grammar)
                                           │
                                    Step 16 (Python bindings)  ← requires 10–15 all done
                                           │
                                    Step 17 (CI/CD + WASM)     ← requires 10–16 all done
                                           │
                                    Step 18 (Documentation)    ← requires 10–17 all done
```

**Rule**: Steps 10–15 can be parallelised once Step 10 is complete. Steps 16 and 17 must
wait for all grammar steps to finish. Step 18 (documentation) should be the last step,
but individual sub-tasks (e.g., new language docs) can be drafted in parallel with their
corresponding grammar steps.

---

## How Each Step File Is Structured

Every step story contains:

| Section | Purpose |
|---|---|
| **Agent Checkpoint** (header callout) | State of the world when this step begins; prerequisites |
| **Design Flags** | Known risks, breaking changes, or architectural decisions requiring extra care |
| **Goal** | One-paragraph statement of what this step achieves |
| **Background** | Why this change is needed; what the current code looks like |
| **Architecture Decision Record (ADR)** | (Where applicable) Table of options considered and rationale for the choice made |
| **Affected Files** | Table of every file that will be created or modified |
| **Sub-Tasks** | Step-by-step instructions with exact code to write |
| **How to Test** | Numbered test commands to run after completing each sub-task |
| **Success Criteria** | Table of pass/fail conditions — an agent can verify each mechanically |
| **Regression Risk** | What could break in *other* parts of the system and how to detect it |
| **API Contract Impact** | Whether node types, field names, or exports change (matters for `sf-rag-engine`) |
| **Documentation Updates** | Checklist of docs to update before the step is considered truly complete |

---

## Key Design Decisions (Summary)

These are the non-obvious choices baked into the step designs:

### Step 10 — `soql_expression` fix
The naive regex `seq("[", /[^\]]*/, "]")` is replaced with a recursive `_soql_content`
rule that allows nested brackets. The private helper rule is inlined and does not appear
in the public AST. Both `soql_expression` and a new `sosl_expression` are added together
in this step to prepare the injection hook for Step 12.

### Step 13 — Anonymous Apex (High Risk ⚠️)
The blueprint's suggested `choice(repeat1($.declaration), repeat1($.statement))` at the
root rule is **rejected** — it creates unresolvable GLR conflicts. Instead, a separate
`apex-anon/grammar.js` grammar is created with `source_file: $ => repeat1($.statement)`.
This eliminates conflicts by keeping the two modes in separate grammar files and lets
consumers (editors, tools) select the appropriate grammar by file context.

### Step 14 — `when` clause patterns
The existing `seq($._type, $.identifier)` single-type pattern is replaced with
`commaJoined1($.when_type_pattern)`. The `when_type_pattern` rule uses `prec(1, ...)` to
take priority over the `commaJoined1($.expression)` alternative, ensuring `Account a`
is always parsed as a type pattern, not two identifier expressions.

### Step 15 — Formula Language
The overloaded `&` operator (string concatenation in Formula Language, bitwise AND in Apex)
gets its own precedence level `PREC.CONCAT` placed between `PREC.COMPARE` and `PREC.ADD_SUB`.
This matches Salesforce's documented operator precedence table.

### Step 16 — Python Bindings (High Risk ⚠️)
The deprecated `Language(path, name)` constructor (removed in tree-sitter 0.24) is
replaced with per-grammar `_binding_*.pyd` C extension modules using the `PyCapsule` API.
The function signatures `apex()`, `soql()` etc. remain identical at the Python level —
only the implementation changes. The `sf-rag-engine` project must be regression-tested
after this change before publishing.
