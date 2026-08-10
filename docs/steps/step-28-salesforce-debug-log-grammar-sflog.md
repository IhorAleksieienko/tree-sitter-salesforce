# Step 28: Salesforce Debug Log Grammar (`sflog`) — Execution Traces, Limits & Events

> **Agent Checkpoint — Read This First**
>
> **Status**: NOT STARTED.
> **Prerequisites**: Steps 10–17, 27 are COMPLETE.
> - Grammar repository infrastructure supports multi-grammar builds.
> - Node.js, Python, and Rust binding build scripts are operational.
>
> **Design Flag ℹ️**:
> This step introduces a new, independent Tree-sitter grammar `sflog` in `sflog/`:
> - Dedicated to parsing Salesforce Server Debug Logs (`.log` files produced by developer console, Apex test runs, and CLI log tailing).
> - Parses timestamped log event lines, execution units, SOQL/DML metrics, `USER_DEBUG` statements, and governor limit summaries.

---

## Goal

Create a dedicated Tree-sitter grammar `tree-sitter-sflog` (located at `sflog/grammar.js`) to parse raw Salesforce execution logs into structured AST nodes:
1. Parse log headers: API version, log category filters (e.g. `APEX_CODE,FINEST;DB,INFO`).
2. Parse timestamped log events: `HH:mm:ss.SSS (nano)|EVENT_NAME|[details]`.
3. Parse execution frames: `CODE_UNIT_STARTED` / `CODE_UNIT_FINISHED`, `METHOD_ENTRY` / `METHOD_EXIT`.
4. Parse database and debug lines: `SOQL_EXECUTE_BEGIN`, `DML_BEGIN`, `USER_DEBUG`.
5. Parse cumulative limit usage tables (SOQL queries: X/100, DML rows: Y/10000, Heap size: Z/6000000).

---

## Background: Current State

Salesforce debug logs are line-oriented structured logs produced during Apex transaction execution. Example format:
```log
67.0 APEX_CODE,FINEST;APEX_PROFILING,INFO;CALLOUT,INFO;DB,INFO;SYSTEM,DEBUG;VALIDATION,INFO;VISUALFORCE,INFO;WORKFLOW,INFO
14:32:01.042 (42105102)|USER_INFO|[EXTERNAL]|0055e000000xxxx|user@example.com|(GMT-07:00) Pacific Daylight Time (America/Los_Angeles)|GMT-07:00
14:32:01.043 (43100200)|EXECUTION_STARTED
14:32:01.043 (43201500)|CODE_UNIT_STARTED|[EXTERNAL]|01q5e000000xxxx|AccountTrigger on Account trigger event BeforeInsert
14:32:01.050 (50123000)|METHOD_ENTRY|[3]|01p5e000000yyyy|AccountService.validate()
14:32:01.052 (52301000)|USER_DEBUG|[5]|DEBUG|Processing 10 accounts
14:32:01.055 (55400000)|SOQL_EXECUTE_BEGIN|[12]|Aggregations:0|SELECT Id, Name FROM Account WHERE Id IN :tmpVar1
14:32:01.060 (60100000)|SOQL_EXECUTE_END|[12]|Rows:10
14:32:01.065 (65200000)|METHOD_EXIT|[3]|AccountService.validate()
14:32:01.070 (70000000)|CODE_UNIT_FINISHED|AccountTrigger on Account trigger event BeforeInsert
14:32:01.075 (75000000)|CUMULATIVE_LIMIT_USAGE
14:32:01.075 (75100000)|LIMIT_USAGE_FOR_NS|(default)|
  Number of SOQL queries: 1 out of 100
  Number of query rows: 10 out of 50000
  Number of DML statements: 0 out of 150
14:32:01.080 (80000000)|CUMULATIVE_LIMIT_USAGE_END
14:32:01.082 (82000000)|EXECUTION_FINISHED
```
Currently, developers and automated analyzer tools rely on brittle regular expressions to parse these logs. Creating a formal Tree-sitter grammar for `sflog` enables instant timeline visualization, flame-graph construction, limit violation detection, and editor folding in IDEs.

---

## Technical Design

### 1. Grammar Root & Header (`sflog/grammar.js`)
- **Where to look**: Create `sflog/grammar.js`.
- **What to touch**:
  - `source_file`: Sequence of `optional($.log_header)`, `repeat($._log_line)`.
  - `log_header`: Sequence matching API version (e.g. `67.0`) followed by category filter pairs (`CATEGORY,LEVEL;...`).
  - `category_filter`: Sequence of category identifier (e.g. `APEX_CODE`), `","`, and level identifier (e.g. `FINEST`).

### 2. Log Line & Event Structure (`sflog/grammar.js`)
- **What to touch**:
  - `_log_line`: Choice of `$.event_line`, `$.limit_usage_section`, or `$.raw_text_line`.
  - `event_line`: Sequence of:
    - `field("timestamp", $.timestamp)`: `HH:mm:ss.SSS`
    - `field("nanoseconds", $.nanoseconds)`: `(12345678)`
    - `"|"`
    - `field("event_type", $.event_type)`
    - `"|"`
    - `field("details", optional($.event_details))`
    - `/\r?\n/`

### 3. Event Types & Specialized Payloads (`sflog/grammar.js`)
- **What to touch**:
  - `event_type`: Categorized event keywords:
    - Code Units: `CODE_UNIT_STARTED`, `CODE_UNIT_FINISHED`, `EXECUTION_STARTED`, `EXECUTION_FINISHED`
    - Methods: `METHOD_ENTRY`, `METHOD_EXIT`, `CONSTRUCTOR_ENTRY`, `CONSTRUCTOR_EXIT`
    - SOQL/SOSL: `SOQL_EXECUTE_BEGIN`, `SOQL_EXECUTE_END`, `SOSL_EXECUTE_BEGIN`, `SOSL_EXECUTE_END`
    - DML: `DML_BEGIN`, `DML_END`
    - Debug: `USER_DEBUG`, `SYSTEM_DEBUG`, `EXCEPTION_THROWN`, `FATAL_ERROR`
    - Flow & Workflow: `FLOW_START_INTERVIEW_BEGIN`, `WF_RULE_EVAL_BEGIN`
  - Specialized detail nodes for `user_debug_details` (`[line]|LEVEL|message`), `soql_details` (`[line]|aggregations|query`), and `code_unit_details`.

### 4. Cumulative Limit Usage Block (`sflog/grammar.js`)
- **What to touch**:
  - `limit_usage_section`: Sequence starting with `CUMULATIVE_LIMIT_USAGE`, containing namespace limit blocks `limit_usage_for_ns` and individual metric lines (`Number of SOQL queries: 1 out of 100`), terminating with `CUMULATIVE_LIMIT_USAGE_END`.

---

## Affected Files

| File | Change Type | Description |
|---|---|---|
| `sflog/grammar.js` | **New** | Tree-sitter grammar specification for Salesforce execution logs. |
| `sflog/package.json` | **New** | Package metadata for `tree-sitter-sflog`. |
| `sflog/test/corpus/events.txt` | **New** | Corpus tests for standard execution, method, and SOQL events. |
| `sflog/test/corpus/limits.txt` | **New** | Corpus tests for limit usage and governor limit summaries. |
| `binding.gyp` | Modify | Add `sflog` target to Node.js native addon build. |
| `pyproject.toml` | Modify | Add `sflog` extension target to Python bindings build. |
| `Cargo.toml` | Modify | Add `sflog` module to Rust crate build. |

---

## Sub-Tasks

### Sub-Task 28.1: Initialize `sflog` Grammar
- Create directory `sflog/` with `package.json` and `grammar.js`.
- Define tokens for timestamps `[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}`, nano durations, and pipe delimiters.

### Sub-Task 28.2: Implement Event Rules and Payloads
- Implement rules for header, event types, frame entry/exit markers, debug lines, and limit sections.
- Implement highlights query in `sflog/queries/highlights.scm`.

### Sub-Task 28.3: Update Multi-Language Binding Configurations
- Register `sflog` in `binding.gyp` and `index.js`.
- Register `sflog` in `pyproject.toml` and Python `__init__.py`.
- Register `sflog` in `bindings/rust/` and `Cargo.toml`.

### Sub-Task 28.4: Author Test Corpus Entries
- In `sflog/test/corpus/events.txt`, add sample traces with `USER_DEBUG`, `METHOD_ENTRY`/`EXIT`, and `SOQL_EXECUTE_BEGIN`/`END`.
- In `sflog/test/corpus/limits.txt`, add cumulative limit usage tables and exception stack traces.

---

## How to Test This Step

### 1. Generate `sflog` Parser
```cmd
cd d:\Git\tree-sitter-salesforce
npx tree-sitter generate sflog/grammar.js
```
Verify zero conflict errors.

### 2. Run `sflog` Corpus Tests
```cmd
cd d:\Git\tree-sitter-salesforce\sflog
npx tree-sitter test
```
Verify all corpus tests in `sflog/test/corpus/` pass.

### 3. Parse Real Salesforce Debug Log
Create `sample.log` with standard execution output. Run:
```cmd
npx tree-sitter parse sample.log --language sflog/grammar.js
```
Verify the entire log parses into structured `event_line` and `limit_usage_section` nodes with 0 `(ERROR)` nodes.

---

## Success Criteria

| # | Criterion | Verification Method |
|---|---|---|
| 1 | `sflog/grammar.js` generates clean C parser without shift/reduce conflicts | `tree-sitter generate` |
| 2 | Standard timestamped log lines parse into `event_line` with `timestamp` and `event_type` | Corpus test: `events.txt` |
| 3 | `USER_DEBUG` lines expose debug level and message content | Corpus test: `events.txt` |
| 4 | Limit usage tables parse into `limit_usage_section` with metric key/value pairs | Corpus test: `limits.txt` |
| 5 | Node.js, Python, and Rust bindings successfully load `sflog()` language | Bindings test suites |

---

## Regression Risk & API Contract Impact

- **Regression Risk**: Zero for existing languages. `sflog` is an independent grammar in its own directory.
- **API Contract Impact**:
  - Adds `tree-sitter-sflog` grammar and language loader functions (`tss.sflog()`) to all bindings.

---

## Documentation Updates Required

- [ ] `README.md`: Add `sflog` to supported languages table and quick-start examples.
- [ ] `docs/05-adding-new-language.md`: Reference `sflog` as a case study for domain-specific logging grammars.
- [ ] `CHANGELOG.md`: Record addition of `tree-sitter-sflog` debug log parser.
