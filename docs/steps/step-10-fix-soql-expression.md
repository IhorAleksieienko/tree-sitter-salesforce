# Step 10: Fix `soql_expression` — Balanced Brackets & Injection Hardening

> **Agent Checkpoint — Read This First**
>
> **Status**: COMPLETE.
> **Prerequisites**: Steps 1–9 (environment, grammars, bindings, documentation) are COMPLETE.
> The Apex and SOQL parsers are functional. However, the `soql_expression` rule in
> `apex/grammar.js` uses a naive regex that breaks on any SOQL containing nested subqueries.
> This step fixes that foundational bug and hardens the injection query coverage before
> new grammars are added.
>
> **Design Flag ⚠️**: This change modifies the internal structure of `soql_expression`.
> The node will still be named `soql_expression` in the AST, so consumers are not broken.
> However, a new private helper rule `_soql_content` is introduced as an inlined node.
> Run the full Apex corpus after every sub-task to catch regressions early.

---

## Goal

Replace the naive regex `seq("[", /[^\]]*/, "]")` in `apex/grammar.js` with a balanced-bracket
rule that allows nested expressions inside inline SOQL queries (e.g., subqueries like
`(SELECT Name FROM Contacts)`). Extend `injections.scm` to cover the full set of
`Database.*` methods and add a rule for `sosl_expression` (which will be fully authored in
Step 12).

---

## Background: What Is Broken and Why

Open [`apex/grammar.js`](file:///d:/Git/tree-sitter-salesforce/apex/grammar.js) at line 678:

```javascript
soql_expression: ($) => seq(
  "[",
  /[^\]]*/,   // ← THIS IS THE BUG: stops at the FIRST ] character
  "]"
),
```

The regex `/[^\]]*/` matches any characters that are **not** a `]`. This means the moment
the SOQL parser encounters a subquery like `(SELECT Name FROM Contacts)` — which itself
contains no `]` — it works. But if you have `WHERE Id IN (SELECT AccountId FROM Contact)`
where the subquery closing `)` is fine, the issue triggers when something like a date
literal range or binding expression happens to include brackets. More critically, any
SOSL expression `[FIND 'test' RETURNING Account]` that we want to distinguish from SOQL
later cannot be handled at all.

**Affected code pattern:**
```apex
// This breaks the current parser:
List<Account> accts = [
  SELECT Id, (SELECT Name FROM Contacts) FROM Account WHERE Id IN :ids
];
```

---

## Affected Files

| File | Change Type | Description |
|---|---|---|
| `apex/grammar.js` | Modify | Replace `soql_expression`, add `sosl_expression` and shared `_soql_content` |
| `apex/queries/injections.scm` | Modify | Add `queryWithBinds`, SOSL injection |
| `apex/test/corpus/soql-injection.txt` | Modify | Add subquery and SOSL corpus cases |

---

## Sub-Task 10.1 — Fix `soql_expression` in `apex/grammar.js`

### File: `apex/grammar.js`

Locate the `soql_expression` rule at [line 678](file:///d:/Git/tree-sitter-salesforce/apex/grammar.js#L678-L682).
Replace the entire rule and add two new private helper rules immediately after it:

```javascript
// ─── BEFORE (broken) ────────────────────────────────────────────────────────
soql_expression: ($) => seq(
  "[",
  /[^\]]*/,
  "]"
),

// ─── AFTER (balanced bracket parsing) ───────────────────────────────────────
/**
 * Inline SOQL expression — the [SELECT ... FROM ...] construct inside Apex.
 *
 * Uses balanced-bracket parsing via the private _soql_content rule so that
 * nested subqueries and expressions do not prematurely terminate the node.
 *
 * The _soql_content rule is private (underscore prefix) so it is inlined by
 * tree-sitter and never appears as a named node in the AST. Only
 * soql_expression is visible to consumers and injection rules.
 *
 * Examples:
 *   [SELECT Id FROM Account]
 *   [SELECT Id, (SELECT Name FROM Contacts) FROM Account]
 *   [SELECT Id FROM Account WHERE Id IN :idList]
 */
soql_expression: ($) => seq(
  "[",
  field("query", $._soql_content),
  "]"
),

/**
 * Inline SOSL expression — the [FIND ... RETURNING ...] construct inside Apex.
 *
 * Shares the same balanced-bracket content rule as soql_expression.
 * The SOSL grammar (Step 12) is injected into this node via injections.scm.
 *
 * Example:
 *   [FIND 'SearchTerm' IN ALL FIELDS RETURNING Account(Name)]
 */
sosl_expression: ($) => seq(
  "[",
  field("query", $._sosl_content),
  "]"
),

/**
 * Balanced bracket content — used inside soql_expression and sosl_expression.
 *
 * Matches any sequence of:
 *   - Characters that are NOT square brackets
 *   - Nested bracket pairs (for subqueries like `(SELECT ... FROM ...)`)
 *     Note: parentheses, not brackets, are used for SOQL subqueries.
 *     Square brackets can appear in bind variable map access: :myMap['key']
 *
 * WHY NOT USE A SIMPLE REGEX?
 * A regex cannot handle balanced delimiters. The grammar rule recurses to
 * handle any depth of nesting correctly without a hard limit.
 */
_soql_content: ($) => repeat1(
  choice(
    /[^\[\]]+/,                       // any non-bracket characters
    seq("[", optional($._soql_content), "]")  // nested bracket pair
  )
),

_sosl_content: ($) => $._soql_content,  // SOSL uses same balanced rule
```

### Update `expression` supertype

Find the `expression` choice rule (around line 550) and add `$.sosl_expression`:

```javascript
// ─── BEFORE ─────────────────────────────────────────────────────────────────
expression: ($) => choice(
  // ... other choices ...
  $.soql_expression,
),

// ─── AFTER ──────────────────────────────────────────────────────────────────
expression: ($) => choice(
  // ... other choices ...
  $.soql_expression,
  $.sosl_expression,   // NEW — will be injected with SOSL grammar in Step 12
),
```

### Generate and verify

```cmd
cd d:\Git\tree-sitter-salesforce
npx tree-sitter generate --no-bindings apex\grammar.js
```

Expected output: zero errors, zero new conflicts beyond the existing baseline.

---

## Sub-Task 10.2 — Expand `injections.scm`

### File: `apex/queries/injections.scm`

The current file ([line 29-46](file:///d:/Git/tree-sitter-salesforce/apex/queries/injections.scm#L29-L46))
handles `query` and `countQuery` separately. Replace the entire file with:

```scheme
; ============================================================================
; Apex Language Injection Queries
; ============================================================================
; Tells editors which parts of Apex should be parsed by a different parser.
;
; TIER 1 — Static inline queries:   [SELECT ...] and [FIND ...]
; TIER 2 — Dynamic string queries:  Database.query("SELECT ...")
; ============================================================================

; ─── TIER 1: Inline static SOQL ─────────────────────────────────────────────
((soql_expression) @injection.content
  (#set! injection.language "soql"))

; ─── TIER 1: Inline static SOSL ─────────────────────────────────────────────
; NOTE: sosl_expression is introduced in Step 10. The SOSL grammar itself
; is authored in Step 12. Until Step 12 is complete, this rule is a no-op
; (there is no registered "sosl" language to inject).
((sosl_expression) @injection.content
  (#set! injection.language "sosl"))

; ─── TIER 2: Database.* string literal methods ───────────────────────────────
; Covers the full set of Database methods that accept a SOQL string argument.
; The (#match?) predicate replaces four separate rules with one pattern.
((method_invocation
  object: (identifier) @_obj
  name: (identifier) @_method
  arguments: (argument_list
    (string_literal) @injection.content))
  (#eq? @_obj "Database")
  (#match? @_method "^(query|countQuery|getQueryLocator|queryWithBinds)$")
  (#set! injection.language "soql"))
```

---

## Sub-Task 10.3 — Update Apex Corpus

### File: `apex/test/corpus/soql-injection.txt`

Add two new test cases to the end of the file:

```
========================
SOQL with nested subquery
========================
List<Account> accts = [SELECT Id, (SELECT Name FROM Contacts) FROM Account WHERE Id IN :ids];

---

(source_file
  (class_declaration))
```

> **Note for agent**: The corpus test format uses `---` to separate input from expected AST.
> The expected tree for injection tests is intentionally minimal — we assert the surrounding
> Apex structure, not the injected SOQL internals (those are tested in `soql/test/corpus/`).
> The critical assertion is the absence of `ERROR` nodes.

Add a new file `apex/test/corpus/sosl-injection.txt`:

```
========================
SOSL expression in Apex (placeholder)
========================
List<List<SObject>> results = [FIND 'San Jose' IN ALL FIELDS RETURNING Account(Name)];

---

(source_file
  (class_declaration))
```

---

## How to Test This Step

### 1. Generate the grammar

```cmd
cd d:\Git\tree-sitter-salesforce
npx tree-sitter generate --no-bindings apex\grammar.js
```

Watch for: `Conflicts: N` — count must not increase from the baseline (check the current
count by running this command on the unmodified grammar first and noting the number).

### 2. Run the full Apex corpus

```cmd
cd d:\Git\tree-sitter-salesforce\apex
npx tree-sitter test
```

Expected: all existing tests pass + the 2 new injection tests pass.

### 3. Parse a file with a nested SOQL subquery

Create a temp file `test_subquery.cls`:
```apex
public class T {
    public void run() {
        List<Account> accts = [SELECT Id, (SELECT Name FROM Contacts) FROM Account];
    }
}
```

```cmd
npx tree-sitter parse test_subquery.cls --language apex\grammar.js
```

Manually inspect the output. The `soql_expression` node must contain the entire
`[SELECT Id, (SELECT Name FROM Contacts) FROM Account]` string with **no ERROR nodes**.

### 4. Verify injection query matches

```cmd
npx tree-sitter query apex\queries\injections.scm test_subquery.cls --language apex\grammar.js
```

Expected output: one match for the `soql_expression` capture.

### 5. Verify injection highlight (if editor integration is available)

```cmd
npx tree-sitter highlight test_subquery.cls --language apex\grammar.js
```

The `SELECT`, `FROM`, `WHERE` keywords inside `[...]` must receive SOQL highlight tokens
(e.g., `keyword.other.soql`), not Apex tokens.

---

## Success Criteria

| # | Criterion | How to Verify |
|---|---|---|
| 1 | `soql_expression` correctly captures nested subqueries | Parse `test_subquery.cls`, confirm no ERROR nodes |
| 2 | `sosl_expression` node exists and captures `[FIND ...]` | Parse file with SOSL expression, confirm node name |
| 3 | Zero regressions in existing Apex corpus | `npx tree-sitter test` — 100% pass |
| 4 | Grammar conflict count ≤ baseline | Compare conflict numbers before and after |
| 5 | `queryWithBinds` string injection fires | Injection query matches `Database.queryWithBinds("SELECT ...")` |
| 6 | `injections.scm` uses `#match?` for all 4 Database methods in one rule | Read the file and verify the pattern |

---

## Regression Risk

**Medium.** The `soql_expression` rule is used directly in the `expression` supertype. Any
change to how it tokenises brackets could affect adjacent rules (`array_access` also uses
`[` and `]`). The tree-sitter parser resolves the ambiguity by priority — `array_access`
needs an `expression` before the `[`, while `soql_expression` starts directly with `[`.
This disambiguation already exists and is not affected by this change.

**What to watch for**: if any expression like `myMap['key']` (map access via brackets in
Apex) starts parsing as a `soql_expression`, there is a priority conflict. Fix by adding
`prec` to `soql_expression` that is lower than `array_access`.

---

## API Contract Impact

**None for consumers.** The node type `soql_expression` retains the same name and position
in the tree. The internal `_soql_content` rule is private (inlined) and never appears in
`node-types.json`. The new `sosl_expression` node type is **additive** — no existing
consumers reference it yet.

---

## Documentation Updates Required After Completion

- [x] `SALESFORCE_API.md` — add a note under SOQL that nested subqueries are fully parsed
- [x] `apex/queries/injections.scm` — ensure all comments are up to date
- [x] `README.md` parser status table — update the "Injection" column for Apex row
- [x] `CHANGELOG.md` — add entry for this fix
