# Step 14: Advanced `when` Clause Patterns — Multi-SObject Type Switching

> **Agent Checkpoint — Read This First**
>
> **Status**: COMPLETE.
> **Prerequisites**: Steps 10–13 are COMPLETE.
> - Apex grammar is fully functional with all existing corpus tests passing.
> - Anonymous Apex grammar exists in `apex-anon/`.
>
> **Design Flag ℹ️**: This is a targeted, low-risk change to a single rule in
> `apex/grammar.js`. However, the `when_clause` currently uses `commaJoined1($.expression)`
> for literal patterns, which shares the comma separator with the new multi-type pattern.
> The `choice()` between the two forms must be carefully precedence-ordered to avoid
> ambiguity. Read Sub-Task 14.1 carefully before editing.

---

## Goal

Extend the `when_clause` rule in `apex/grammar.js` to support comma-separated SObject type
patterns in a single `when` clause. Salesforce supports this for polymorphic SObject
switching:

```apex
// CURRENTLY FAILS TO PARSE CORRECTLY:
switch on genericSObject {
    when Account a, Contact c {
        System.debug('Account or Contact: ' + a?.Name ?? c?.Name);
    }
    when Opportunity o {
        System.debug('Opportunity');
    }
    when else {
        System.debug('Unknown type');
    }
}
```

---

## Background: Current State

Open [`apex/grammar.js`](file:///d:/Git/tree-sitter-salesforce/apex/grammar.js) at line 786.
The current `when_clause` rule is:

```javascript
when_clause: ($) => seq(
  ci("when"),
  choice(
    commaJoined1($.expression),                                    // literal/enum patterns
    seq(field("type", $._type), field("name", $.identifier))       // single SObject type
  ),
  field("body", $.block)
),
```

The problem: `seq(field("type", $._type), field("name", $.identifier))` only handles ONE
SObject type. The Salesforce Apex Developer Guide states that multiple SObject types can be
comma-separated in a `when` clause.

**Reference**: [Salesforce Apex Switch Statement docs](https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/langCon_apex_switch.htm)

---

## The Parsing Ambiguity

Consider:
```apex
when Account a, Contact c { }
```

After `when Account`, the parser sees `a` — which looks like an identifier. After that,
`, Contact` could be:
1. Another type pattern (`Contact c` — the new behavior)
2. A comma-separated expression list (`a`, `Contact` as identifiers, `c` as another)

This ambiguity between `commaJoined1($.expression)` and `commaJoined1($.when_type_pattern)`
is the key parsing challenge.

**Resolution strategy**: Give `when_type_pattern` higher precedence than the expression
form, and define `when_type_pattern` as `seq($._type, $.identifier)` — which requires an
identifier immediately after a type, not possible in a pure expression list like `1, 2, 3`.
Tree-sitter's GLR parser will prefer the type-pattern branch when the pattern `TYPE IDENTIFIER`
followed by `,` or `{` is seen.

---

## Affected Files

| File | Change Type | Description |
|---|---|---|
| `apex/grammar.js` | Modify | Replace `when_clause` and add `when_type_pattern` rule |
| `apex/test/corpus/statements.txt` | Modify | Add multi-type `when` test cases |

---

## Sub-Task 14.1 — Modify `when_clause` in `apex/grammar.js`

### File: [`apex/grammar.js`](file:///d:/Git/tree-sitter-salesforce/apex/grammar.js)

Locate the `when_clause` rule at approximately line 786. Replace the `when_clause` and
`when_else_clause` rules with the following:

```javascript
// ─── BEFORE ─────────────────────────────────────────────────────────────────
when_clause: ($) => seq(
  ci("when"),
  choice(
    commaJoined1($.expression),
    seq(field("type", $._type), field("name", $.identifier))
  ),
  field("body", $.block)
),

// ─── AFTER ──────────────────────────────────────────────────────────────────
/**
 * When clause — a single branch in a switch statement.
 *
 * Two forms are supported:
 *
 * 1. LITERAL/ENUM PATTERN:
 *    when 'a', 'b', 'c' { }     (string literals)
 *    when 1, 2, 3 { }           (integer literals)
 *    when MyEnum.Value1 { }     (enum values)
 *
 * 2. SOBJECT TYPE PATTERN (one or more):
 *    when Account a { }                  (single type)
 *    when Account a, Contact c { }       (multiple types — Salesforce extension)
 *
 * WHY prec(1) ON when_type_pattern?
 * Both forms start with an expression-like token. Without a precedence hint,
 * tree-sitter would try both alternatives and could produce an ambiguous parse.
 * Giving type patterns higher priority ensures `Account a` is always parsed as
 * a type+name pair, not as two expressions (`Account`, `a`).
 */
when_clause: ($) => seq(
  ci("when"),
  choice(
    commaJoined1($.when_type_pattern),   // SObject type patterns (higher priority)
    commaJoined1($.expression),          // Literal and enum patterns
  ),
  field("body", $.block)
),

/**
 * A single SObject type pattern inside a when clause.
 *
 * Syntax: TypeName variableName
 *
 * Examples:
 *   Account a
 *   Contact c
 *   Opportunity opp
 *
 * The variable name is bound within the when block body and can be used
 * directly without a cast.
 */
when_type_pattern: ($) => prec(1, seq(
  field("type", $._type),
  field("name", $.identifier)
)),
```

> **If `prec(1)` on `when_type_pattern` still causes conflicts**, try wrapping the rule in
> `prec.dynamic(1, ...)` or add the pair `[$.when_type_pattern, $.expression]` to the
> `conflicts` array in the grammar header, which enables GLR disambiguation.

### Add `when_type_pattern` to the grammar `supertypes` (optional but recommended)

Adding to supertypes makes it visible as an abstract category in `node-types.json`:
```javascript
supertypes: ($) => [
  $.expression,
  $.declaration,
  $.statement,
  $._type,
  $.when_type_pattern,   // NEW — optional, makes the node visible to consumers
],
```

---

## Sub-Task 14.2 — Add Corpus Test Cases

### File: `apex/test/corpus/statements.txt`

Add the following test cases at the end of the file:

```
====================================
Switch with multiple SObject type patterns
====================================
switch on obj {
    when Account a, Contact c {
        System.debug(a);
    }
    when Opportunity o {
        System.debug(o);
    }
    when else {
        System.debug('unknown');
    }
}
---
(source_file
  (switch_statement
    condition: (identifier)
    (when_clause
      (when_type_pattern
        type: (type_identifier)
        name: (identifier))
      (when_type_pattern
        type: (type_identifier)
        name: (identifier))
      body: (block
        (expression_statement)))
    (when_clause
      (when_type_pattern
        type: (type_identifier)
        name: (identifier))
      body: (block
        (expression_statement)))
    (when_else_clause
      body: (block
        (expression_statement)))))

====================================
Switch with single SObject type pattern (existing behavior, must not regress)
====================================
switch on record {
    when Account a {
        System.debug(a.Name);
    }
}
---
(source_file
  (switch_statement
    condition: (identifier)
    (when_clause
      (when_type_pattern
        type: (type_identifier)
        name: (identifier))
      body: (block
        (expression_statement)))))

====================================
Switch with literal patterns (existing behavior, must not regress)
====================================
switch on day {
    when 'Monday', 'Tuesday' {
        System.debug('weekday');
    }
    when else {
        System.debug('other');
    }
}
---
(source_file
  (switch_statement
    condition: (identifier)
    (when_clause
      (string_literal)
      (string_literal)
      body: (block))
    (when_else_clause
      body: (block))))
```

---

## How to Test This Step

### 1. Generate the grammar

```cmd
cd d:\Git\tree-sitter-salesforce
npx tree-sitter generate --no-bindings apex\grammar.js
```

Record the conflict count from this output. Compare it to the baseline (from before this step).
An increase of 0–2 conflicts is acceptable if they are the `when_clause` ambiguity resolved
by `prec(1)`. An increase of 5+ conflicts indicates a design problem — do not proceed.

### 2. Run the full Apex corpus

```cmd
cd d:\Git\tree-sitter-salesforce\apex
npx tree-sitter test
```

All existing tests AND the three new tests must pass. Zero regressions.

### 3. Parse a file with multi-type when clause

Create `test_when.cls`:
```apex
public class SwitchDemo {
    public static void process(SObject obj) {
        switch on obj {
            when Account a, Contact c {
                System.debug('Account or Contact');
            }
            when Opportunity o {
                System.debug(o.StageName);
            }
            when else {
                System.debug('Unknown');
            }
        }
    }
}
```

```cmd
npx tree-sitter parse test_when.cls --language apex\grammar.js
```

The first `when_clause` must produce two `when_type_pattern` children (`Account a` and
`Contact c`), not ERROR nodes or mismatched expression nodes.

### 4. Verify field access works inside the when block

The variable `a` bound in `when Account a, Contact c { }` must be accessible as an
identifier inside the block body. Parse:

```apex
when Account a, Contact c {
    System.debug(a.Name);
    System.debug(c.Email);
}
```

Both `a.Name` and `c.Email` must parse as `field_access` expressions with no ERROR nodes.

### 5. Regression test: literal patterns must still work

```apex
switch on num {
    when 1, 2, 3 { }
    when else { }
}
```

Must produce `expression` children under `when_clause` (not `when_type_pattern`).

---

## Success Criteria

| # | Criterion | How to Verify |
|---|---|---|
| 1 | `when Account a, Contact c { }` parses with two `when_type_pattern` nodes | Manual parse + corpus test |
| 2 | `when Account a { }` (single type) still produces one `when_type_pattern` node | Corpus test: "single SObject type pattern" |
| 3 | `when 'a', 'b' { }` (literals) still produces `expression` nodes | Corpus test: "literal patterns" |
| 4 | `when else { }` still parses as `when_else_clause` | Implicit in all switch tests |
| 5 | Grammar conflict count does not increase by more than 2 | Compare `tree-sitter generate` output |
| 6 | Zero regressions in full Apex corpus | `npx tree-sitter test` in `apex/` |
| 7 | `when_type_pattern` exposes `type` and `name` fields | Check via `node.childForFieldName("type")` |

---

## Conflict Count Baseline

Before making any changes, run:
```cmd
npx tree-sitter generate --no-bindings apex\grammar.js 2>&1 | findstr "conflict"
```

Note the number of conflicts reported. After your changes, this number should not increase
by more than 2.

If conflicts increase significantly, the following interventions are available:
1. Add `[$.when_type_pattern, $.expression]` to the `conflicts` array in the grammar header.
2. Change `prec(1, ...)` to `prec.dynamic(1, ...)` on `when_type_pattern`.
3. Add `when_type_pattern` to the `inline` array so tree-sitter inlines it and resolves
   the ambiguity at the call site.

---

## Regression Risk

**Low.** Only the `when_clause` rule is modified. The change is structural:
- `seq($._type, $.identifier)` → `commaJoined1($.when_type_pattern)` where `when_type_pattern`
  wraps the same `seq($._type, $.identifier)` pattern.
- The existing single-type case still works — `commaJoined1` with a single item is identical
  to the old `seq(...)` behavior.

**Edge case to watch**: `when null` is a valid Apex literal pattern. After this change,
`null` might be tried as a `when_type_pattern` (treating `null` as a type and the next
token as a variable name). Add a corpus test for `when null { }` to confirm it still
parses correctly as a literal expression.

---

## API Contract Impact

**Minor additive.** The `when_type_pattern` node type is new in `node-types.json`.
Consumers that previously matched `when_clause` children as a raw type + identifier pair
(without a named node) will now see `when_type_pattern` wrapper nodes. This could be a
breaking change for any code that walks the raw CST. Check `sf-rag-engine` parser code
if it inspects `when_clause` children directly.

---

## Documentation Updates Required After Completion

- [x] `SALESFORCE_API.md` — add note that multi-SObject `when` patterns are supported
- [x] `docs/03-understanding-apex.md` — add section on switch/when polymorphism
- [x] `CHANGELOG.md` — add entry for enhanced `when` clause
