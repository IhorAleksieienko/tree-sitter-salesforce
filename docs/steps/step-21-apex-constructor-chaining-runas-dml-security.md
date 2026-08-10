# Step 21: Apex Statements — Constructor Chaining, `System.runAs`, and Modern DML Security Modes

> **Agent Checkpoint — Read This First**
>
> **Status**: COMPLETE.
> **Prerequisites**: Steps 19–20 are COMPLETE.
> - Apex grammar has baseline fixes and initializer support.
> - All corpus tests pass in `apex/`.
>
> **Design Flag ℹ️**:
> This step introduces three statement-level constructs:
> 1. `explicit_constructor_invocation` (`this(...)`, `super(...)`, and `primary.super(...)`) inside constructor bodies.
> 2. `run_as_statement` (`System.runAs(user) { ... }`) for Apex unit tests.
> 3. `as user` / `as system` security clauses on DML statements (API v54+ standard).
> Care must be taken so that `this(...)` and `super(...)` do not conflict with general method invocation expressions or `this.field` member access.

---

## Goal

Extend the statement grammar in `apex/grammar.js` to support:
1. Explicit constructor invocations (`this(...)` and `super(...)` with arguments).
2. Dedicated `System.runAs(...) { ... }` testing statement blocks.
3. Modern DML security modes: `insert as user acc;`, `update as system records;`.

---

## Background: Current State

1. **Constructor Chaining Blocked**:
   In [`apex/grammar.js`](file:///d:/Git/tree-sitter-salesforce/apex/grammar.js), `this` and `super` are modeled as primary expressions, but there is no dedicated `explicit_constructor_invocation` statement rule. In standard Apex constructors:
   ```apex
   public CustomException(String msg, Exception cause) {
       super(msg, cause);
   }
   public CustomException() {
       this('Default error', null);
   }
   ```
   Calling `this(...)` or `super(...)` at the statement level causes keyword conflict errors because `this` and `super` are reserved keywords, not standard identifiers in method invocations.

2. **`System.runAs` Testing Construct**:
   `System.runAs(user) { ... }` is a special Salesforce statement form used in test methods to execute code in the context of a specific user. Currently, it cannot parse as a method call because standard method calls in Apex cannot be directly followed by a `{ ... }` block without a semicolon or assignment.

3. **DML Security Modes (`as user` / `as system`)**:
   In [`apex/grammar.js`](file:///d:/Git/tree-sitter-salesforce/apex/grammar.js#L911), `dml_statement` only parses basic DML forms (`insert acc;`). Starting with Salesforce API v54.0+, Apex supports native user-mode and system-mode DML operations (`insert as user acc;`, `delete as system recordList;`). Currently, including `as user` causes a syntax error.

---

## Technical Design

### 1. Explicit Constructor Invocation (`apex/grammar.js`)
- **Where to look**: `statement` / `_block_statement` rules around lines 750–820.
- **What to touch**:
  - Define a new rule `explicit_constructor_invocation`:
    - Choice between:
      - `seq(optional(field("type_arguments", $.type_arguments)), choice($.this, $.super))`
      - `seq(field("object", $.primary_expression), ".", optional(field("type_arguments", $.type_arguments)), $.super)`
    - Followed by `field("arguments", $.argument_list)` and `";"`.
  - Add `$.explicit_constructor_invocation` to `statement` (or `_block_statement`).
  - Precedence: Ensure constructor invocation takes precedence over expression statements starting with `this` or `super`.

### 2. `System.runAs` Statement (`apex/grammar.js`)
- **Where to look**: `statement` rule around line 770.
- **What to touch**:
  - Define `run_as_statement`:
    - Sequence matching `ci("System.runAs")` (or `seq(ci("System"), ".", ci("runAs"))`), followed by `field("user", $.parenthesized_expression)` and `field("body", $.block)`.
  - Add `$.run_as_statement` to `statement`.
  - Ensure this statement is highlighted as a control flow / testing statement.

### 3. Modern DML Security Modes (`apex/grammar.js`)
- **Where to look**: Rule `dml_statement` around line 911.
- **What to touch**:
  - Define `dml_security_mode`:
    - Choice of `ci("user")` and `ci("system")`.
  - Update `dml_statement`:
    - `seq($.dml_type, optional(seq(ci("as"), field("access_level", $.dml_security_mode))), field("record", $.expression), optional(field("options", $.expression)), ";")`.
  - This supports `insert as user record;`, `update as system recordList;`, and `upsert as user record External_Id__c;`.

---

## Affected Files

| File | Change Type | Description |
|---|---|---|
| `apex/grammar.js` | Modify | Add `explicit_constructor_invocation`, `run_as_statement`, `dml_security_mode`, and update `dml_statement` and `statement`. |
| `apex/test/corpus/statements.txt` | Modify | Add test cases for constructor chaining (`this`/`super`), `System.runAs`, and user/system mode DML. |

---

## Sub-Tasks

### Sub-Task 21.1: Add `explicit_constructor_invocation`
- Define `explicit_constructor_invocation` in `apex/grammar.js`.
- Add `$.explicit_constructor_invocation` to `statement`.
- Verify `this(...)` and `super(...)` parse correctly inside constructor bodies.

### Sub-Task 21.2: Add `run_as_statement`
- Define `run_as_statement` supporting `System.runAs(...) { ... }` with user arguments and block body.
- Add `$.run_as_statement` to `statement`.

### Sub-Task 21.3: Update `dml_statement` with Security Modes
- Define `dml_security_mode` with `user` and `system` keywords.
- Update `dml_statement` to accept optional `as user` or `as system` clauses.

### Sub-Task 21.4: Author Test Corpus Entries
- In `apex/test/corpus/statements.txt`, add test cases for:
  - Constructor with `this(param1, param2);`.
  - Constructor with `super(message, cause);`.
  - Outer class constructor with `Outer.super();`.
  - Test method with `System.runAs(testUser) { insert as user acc; }`.
  - DML operations: `insert as user a;`, `update as system contacts;`, `upsert as user opps External_Id__c;`.

---

## How to Test This Step

### 1. Regenerate Apex Grammar
```cmd
cd d:\Git\tree-sitter-salesforce
npx tree-sitter generate --no-bindings apex/grammar.js
```
Verify that LR conflict counts remain within expected bounds.

### 2. Run Apex Corpus Tests
```cmd
cd d:\Git\tree-sitter-salesforce\apex
npx tree-sitter test
```
All statement tests in `statements.txt` must pass.

### 3. Parse Verification Snippets
Create `test_stmts.cls`:
```apex
public class AccountServiceTest {
    public class CustomError extends Exception {
        public CustomError(String msg) {
            super(msg);
        }
        public CustomError() {
            this('Unknown Error');
        }
    }

    @IsTest
    static void testUserModeDML() {
        User u = [SELECT Id FROM User WHERE IsActive = true LIMIT 1];
        System.runAs(u) {
            Account acc = new Account(Name = 'Test Corp');
            insert as user acc;
            acc.Name = 'Updated Corp';
            update as system acc;
            delete as user acc;
        }
    }
}
```
Run:
```cmd
npx tree-sitter parse test_stmts.cls --language apex/grammar.js
```
Confirm the CST contains `explicit_constructor_invocation`, `run_as_statement`, and `dml_statement` nodes without syntax errors.

---

## Success Criteria

| # | Criterion | Verification Method |
|---|---|---|
| 1 | `this(...)` and `super(...)` statements parse into `explicit_constructor_invocation` nodes | Corpus test: `statements.txt` |
| 2 | `System.runAs(user) { ... }` parses into `run_as_statement` with `user` and `body` fields | Corpus test: `statements.txt` |
| 3 | `insert as user acc;` and `update as system acc;` parse into `dml_statement` with `access_level` | Corpus test: `statements.txt` |
| 4 | Legacy DML statements (`insert acc;`) continue to parse without regression | Existing DML corpus tests |
| 5 | Full Apex corpus test suite passes with 0 regressions | `npx tree-sitter test` in `apex/` |

---

## Regression Risk & API Contract Impact

- **Regression Risk**: Low. Constructor calls are distinguished by statement-level position followed by parentheses. DML security mode is optional and backwards-compatible with existing DML nodes.
- **API Contract Impact**:
  - Adds `explicit_constructor_invocation` and `run_as_statement` node types.
  - `dml_statement` AST nodes now expose the optional `access_level` field (`user` or `system`).

---

## Documentation Updates Required

- [x] `SALESFORCE_API.md`: Document support for `System.runAs`, constructor chaining (`this`/`super`), and DML `as user`/`as system` security modes.
- [x] `docs/03-understanding-apex.md`: Update Statements and Testing sections with `runAs` and user-mode DML examples.
- [x] `CHANGELOG.md`: Record addition of explicit constructor chaining, `System.runAs`, and DML security mode support.
