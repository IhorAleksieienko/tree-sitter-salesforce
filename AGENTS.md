# Salesforce Tree-Sitter Parser & Agent Rules

## Debugging & Diagnostic Workflow

When troubleshooting syntax parsing errors, Tree-sitter LR/GLR conflicts, grammar compilation failures, C scanner bugs, missing AST nodes, highlight query discrepancies, or test corpus regressions across Apex, SOQL, SOSL, or Formula Language grammars:

1. **Isolate the Failure Layer**:
   - **Grammar Definition Layer (`<grammar>/grammar.js`, `common/`)**: Check if the grammar DSL rule incorrectly defines precedence, associativity, optionality, or repeats, leading to ambiguous parse trees.
   - **Parser Generation & C Scanner Layer (`<grammar>/src/`, `<grammar>/src/scanner.c`)**: Verify if `tree-sitter generate` succeeds without unhandled shift/reduce or reduce/reduce conflicts. If an external scanner is used, verify lookahead token handling and state serialization (`serialize`/`deserialize`).
   - **Test Corpus Layer (`<grammar>/test/corpus/`)**: Run targeted tests via `npx tree-sitter test --filter "<test-name>"` to inspect the exact S-expression diff.
   - **Query & Injection Layer (`<grammar>/queries/`)**: Check whether syntax highlighting (`highlights.scm`), code navigation (`tags.scm`), or language injections (`injections.scm`) match expected node names and fields.
   - **Language Binding Layer (`bindings/`, `pyproject.toml`, `package.json`)**: Ensure native Node.js addons, Python packages (`py-tree-sitter`), and WASM builds compile cleanly and load the grammar symbols without runtime linkage errors.

2. **Reproduce with a Minimal Test Case**:
   - Add a minimal reproduction snippet directly to `<grammar>/test/corpus/<feature>.txt` before attempting any grammar modifications.
   - Run `npx tree-sitter test` (or `tree-sitter parse <file>`) to observe exact AST output and verify whether `(ERROR)` or `(MISSING)` nodes are generated.

3. **Inspect Generated Tables & State Machines**:
   - Examine generated parse tables in `<grammar>/src/parser.c` or use `tree-sitter generate` output to diagnose unresolved ambiguities rather than guessing.
   - Minimize entries in the `conflicts` array in `grammar.js`; resolve ambiguities using explicit precedence (`prec.left`, `prec.right`, `prec.dynamic`) whenever possible.

4. **Zero Speculative Churn**:
   - Never randomly reorder rules or add broad entries to `conflicts: $ => [...]` without understanding the underlying grammar ambiguity.
   - Fix the root cause in the grammar rule or external scanner, and verify with a targeted corpus test.

5. **Cross-Platform Determinism & Golden Snapshot Testing**:
   - Run the full corpus test suite (`npm test`) across platforms to ensure byte offsets, token boundaries, and AST trees are identical on Windows, Linux, macOS, and WASM.
   - Use normalized POSIX relative paths and normalized `\n` line endings in all test fixtures.

---

## Architectural & Spec Standards

1. **Architectural Guidelines**: When modifying or creating grammars, queries, or bindings, always consult [.agents/rules/tree-sitter-salesforce-architect.md](file:///d:/Git/tree-sitter-salesforce/.agents/rules/tree-sitter-salesforce-architect.md).
2. **Quality Gates**: Every change to grammar rules must include corresponding test corpus entries in `<grammar>/test/corpus/` and achieve a 0-`ERROR` node parsing benchmark on valid Salesforce syntax.
3. **Spec Alignment**: All language constructs must align with the official Salesforce Language Reference Manuals (API v67.0 Summer '25 baseline).

---

## Skill Adoption Guidance

This repository contains a growing library of custom agent skills (located in `.agents/skills/`). Before starting complex tasks—especially tasks involving auditing, reviewing, analyzing, or generating architectural documentation—you MUST:

1. **Discover Available Skills:** Always check the `.agents/skills/` directory to see if a skill exists that matches or relates to the user's request.
2. **Read the Instructions:** If a relevant skill exists, use the `view_file` tool to read its `SKILL.md` file in full before proceeding.
3. **Follow Skill Workflows:** Follow the instructions in the `SKILL.md` exactly as documented. If a skill requires prerequisites (such as generating another report first), verify those prerequisites exist. If they do not, invoke sub-agents or perform the prerequisite tasks yourself as directed by the skill's instructions.
4. **Prefer Existing Skills:** Always prioritize leveraging an established skill workflow over inventing a new ad-hoc process for a task.
5. **Don't Repeat Results:** If a skill produces an artifact (like `analysis.md`, `relationships.json`, or `capability-inventory.md`), do not ask the user to manually invoke a tool to "fetch" that artifact later. Your plan should include the necessary tool calls to retrieve and present all required data in a single turn if possible.
6. **Output Management:** When a skill requires generating a report or artifact, the skill's instructions will specify the *exact* filename and directory path. You must use the `write_file` tool to save the artifact to this location, ensuring it is saved *before* you attempt to read it or present it to the user.
