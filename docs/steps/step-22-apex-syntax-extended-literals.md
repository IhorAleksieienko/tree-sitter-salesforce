# Step 22: Apex Syntax & Extended Literals — Case-Insensitivity, Multi-Line Strings, Array Sizing, and Type Literals

> **Agent Checkpoint — Read This First**
>
> **Status**: COMPLETE.
> **Prerequisites**: Steps 19–21 are COMPLETE.
> - Apex grammar has core declarations, initializers, and statements in place.
> - All corpus tests pass in `apex/`.
>
> **Design Flag ℹ️**:
> This step introduces:
> 1. Case-insensitivity for `switch on` and `when else` keywords.
> 2. Summer '26 multi-line string literals (`'''...'''`).
> 3. Array instantiation with explicit dimension sizing (`new String[10]`).
> 4. Extended literals: Long integers (`100L`), scientific notation decimals (`1.2e-5`), and class reflection literals (`Account.class`, `void.class`).
> 5. Signed numbers and qualified enum identifiers in switch `when` branches.

---

## Goal

Bring the Apex expression, literal, and switch syntax up to full parity with Salesforce platform syntax and upcoming Summer '26 language specifications:
1. Ensure `switch on` and `when else` match case-insensitively (`SWITCH ON`, `Switch On`, `WHEN ELSE`).
2. Add support for Summer '26 multi-line raw string literals (`'''...'''`).
3. Support dimensioned array instantiation: `new String[size]`.
4. Support Long literals (`100L`, `100l`), scientific decimals (`1.2e-5`), and class literals (`Account.class`, `void.class`).
5. Ensure signed numbers (`when -1, +2`) and qualified enums (`when MyEnum.VAL`) parse in `when` pattern expressions.

---

## Background: Current State

1. **Hardcoded Switch Keywords**:
   In [`apex/grammar.js`](file:///d:/Git/tree-sitter-salesforce/apex/grammar.js#L833), `switch_statement` uses `"switch on"` and `when_else_clause` uses `"when else"`. Apex is case-insensitive, but uppercase variants like `SWITCH ON` fail to parse.

2. **Single-Line Strings Only**:
   Currently, strings in Apex only match single-quoted single-line literals (`'text'`). Summer '26 introduces multi-line strings (`'''multi\nline'''`), matching modern Java text blocks.

3. **Array Creation Lacks Dimension Sizing**:
   `new_expression` only supports un-dimensioned array initializers like `new String[]{'a', 'b'}`. Instantiations like `new String[10]` (allocating an array of 10 elements) fail to parse because `[size]` is not supported after the type.

4. **Extended Literals Missing**:
   Apex supports Long integer suffixes (`10000000000L`), scientific notation floating points (`1.25e-3`), and Java-style class reflection tokens (`Account.class`, `void.class`). Currently, `100L` causes a syntax error, `1.2e-5` splits into tokens, and `.class` is parsed as a regular field access on a type.

---

## Technical Design

### 1. Case-Insensitive Switch Statement (`apex/grammar.js`)
- **Where to look**: `switch_statement` and `when_else_clause` rules around lines 830–860.
- **What to touch**:
  - Replace literal `"switch on"` with `seq(ci("switch"), ci("on"))`.
  - Replace literal `"when else"` with `seq(ci("when"), ci("else"))`.

### 2. Summer '26 Multi-Line String Literal (`apex/grammar.js`)
- **Where to look**: `_literal` and `string_literal` rules around lines 490–520.
- **What to touch**:
  - Define `multi_line_string_literal`:
    - Sequence of `token(seq("'''", repeat(choice(/[^'\\]/, /'[^'\\]/, /''[^'\\]/, /\\./)), "'''"))`.
  - Add `$.multi_line_string_literal` to `_literal`.

### 3. Array Dimension Creation (`apex/grammar.js`)
- **Where to look**: `new_expression` around lines 450–480.
- **What to touch**:
  - Define `array_creation_expression`:
    - Sequence of `ci("new")`, `field("type", $._type)`, `"["`, `field("size", $.expression)`, `"]"`.
  - Add `$.array_creation_expression` to the choices of `new_expression` / primary expressions.

### 4. Extended Literals & Class Literals (`apex/grammar.js`)
- **Where to look**: Rules for `_literal`, numbers, and `primary_expression`.
- **What to touch**:
  - Define `long_literal`:
    - Token regex: `token(seq(/[0-9]+(_[0-9]+)*/, choice("L", "l")))`.
  - Define `scientific_decimal`:
    - Token regex: `token(seq(/[0-9]+(\.[0-9]+)?[eE][+-]?[0-9]+/))`.
  - Define `class_literal`:
    - Sequence: `seq(choice($._type, ci("void")), ".", ci("class"))`.
  - Add `$.long_literal`, `$.scientific_decimal`, and `$.class_literal` to `_literal` or `primary_expression`.

### 5. Switch `when` Pattern Enhancements (`apex/grammar.js`)
- **Where to look**: `when_clause` and `_when_expression` pattern rules.
- **What to touch**:
  - Ensure unary signed expressions (`-1`, `+5`) and dotted identifiers (`Status.ACTIVE`, `MyEnum.VALUE`) are accepted in literal pattern lists without ambiguities.

---

## Affected Files

| File | Change Type | Description |
|---|---|---|
| `apex/grammar.js` | Modify | Update switch rules with `ci()`, add `multi_line_string_literal`, `array_creation_expression`, `long_literal`, `scientific_decimal`, and `class_literal`. |
| `apex/test/corpus/expressions.txt` | Modify | Add tests for multi-line strings, sized arrays, long literals, scientific decimals, and class literals. |
| `apex/test/corpus/statements.txt` | Modify | Add tests for case-insensitive `SWITCH ON`, signed numbers in `when`, and qualified enum patterns. |

---

## Sub-Tasks

### Sub-Task 22.1: Update Switch Keywords for Case-Insensitivity
- Modify `switch_statement` to use `ci("switch")` and `ci("on")`.
- Modify `when_else_clause` to use `ci("when")` and `ci("else")`.

### Sub-Task 22.2: Add Multi-Line String Literals
- Define `multi_line_string_literal` matching triple-quoted text blocks.
- Add to `_literal` choices.

### Sub-Task 22.3: Add Sized Array Instantiation
- Define `array_creation_expression` for `new Type[size]`.
- Wire into `new_expression`.

### Sub-Task 22.4: Add Long, Scientific, and Class Literals
- Define `long_literal` (`100L`, `100l`).
- Define `scientific_decimal` (`1.2e-5`).
- Define `class_literal` (`Account.class`, `void.class`, `List<String>.class`).
- Wire them into `_literal` and `primary_expression`.

### Sub-Task 22.5: Author Test Corpus Entries
- In `apex/test/corpus/expressions.txt`, add test cases for:
  - Multi-line strings: `'''line 1\nline 2'''`.
  - Array allocation: `new String[10]`, `new Account[batchSize]`.
  - Long literals: `10000000000L`, `42l`.
  - Scientific decimals: `1.234e-4`, `5.0E+10`.
  - Class literals: `Account.class`, `void.class`, `Database.Batchable.class`.
- In `apex/test/corpus/statements.txt`, add test cases for:
  - `SWITCH ON status { when 'a' {} }` (uppercase).
  - `switch on num { when -1, +2, 0 {} }` (signed numbers).
  - `switch on state { when Stage.OPEN, Stage.CLOSED {} }` (enum values).

---

## How to Test This Step

### 1. Regenerate Apex Grammar
```cmd
cd d:\Git\tree-sitter-salesforce
npx tree-sitter generate --no-bindings apex/grammar.js
```
Verify that LR conflict counts remain clean.

### 2. Run Apex Corpus Tests
```cmd
cd d:\Git\tree-sitter-salesforce\apex
npx tree-sitter test
```
Verify that all new and existing expression/statement tests pass.

### 3. Parse Verification Snippets
Create `test_literals.cls`:
```apex
public class LiteralVerification {
    public static void testAll() {
        Long bigNum = 9223372036854775807L;
        Double sci = 1.25e-8;
        Type t = Account.class;
        Type v = void.class;
        String[] items = new String[25];
        String multi = '''
            SELECT Id, Name
            FROM Account
        ''';

        SWITCH ON bigNum {
            when -100L, +100L {
                System.debug('Matched signed long');
            }
            WHEN ELSE {
                System.debug('Default');
            }
        }
    }
}
```
Run:
```cmd
npx tree-sitter parse test_literals.cls --language apex/grammar.js
```
Confirm zero `(ERROR)` nodes.

---

## Success Criteria

| # | Criterion | Verification Method |
|---|---|---|
| 1 | `SWITCH ON`, `Switch On`, and `WHEN ELSE` parse identically to lowercase forms | Corpus test: `statements.txt` |
| 2 | Triple-quoted strings parse into `multi_line_string_literal` nodes | Corpus test: `expressions.txt` |
| 3 | `new String[10]` parses into `array_creation_expression` with `type` and `size` fields | Corpus test: `expressions.txt` |
| 4 | `100L` and `1.2e-5` parse into `long_literal` and `scientific_decimal` nodes | Corpus test: `expressions.txt` |
| 5 | `Account.class` and `void.class` parse into `class_literal` nodes | Corpus test: `expressions.txt` |
| 6 | Signed numbers and qualified enums parse in `when` pattern branches | Corpus test: `statements.txt` |
| 7 | Full Apex corpus passes with 0 failures | `npx tree-sitter test` in `apex/` |

---

## Regression Risk & API Contract Impact

- **Regression Risk**: Low. `class_literal` takes precedence over general field access when the selector is `.class`.
- **API Contract Impact**:
  - Adds `multi_line_string_literal`, `array_creation_expression`, `long_literal`, `scientific_decimal`, and `class_literal` to the node types.
  - Improves syntax highlighting and symbol indexing for type reflections and text blocks.

---

## Documentation Updates Required

- [x] `SALESFORCE_API.md`: Document Summer '26 multi-line strings, sized array creations, and extended literals.
- [x] `docs/03-understanding-apex.md`: Update Expressions and Control Flow sections with new literal types and case-insensitive switch examples.
- [x] `CHANGELOG.md`: Record addition of multi-line strings, array dimension sizing, extended literals, and class literals.
