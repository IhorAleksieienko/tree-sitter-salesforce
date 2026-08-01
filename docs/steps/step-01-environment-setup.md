# Step 1: Environment Setup & Project Scaffold

> **Agent Handoff Context**: This is the FIRST step. No prior work has been done.
> The project `tree-sitter-salesforce` does not yet exist.

## Context

We are building a mono-repo of tree-sitter parsers for Salesforce languages (Apex, SOQL, and more
in the future). This step creates the project skeleton — all configuration files, directory
structure, and tooling — so that subsequent steps can focus purely on grammar development.

### What is Tree-Sitter? (Quick Primer)

Tree-sitter is a **parser generator** that produces fast, incremental parsers from grammar
definitions written in JavaScript. The workflow is:

1. You write `grammar.js` — a JavaScript file describing the language's syntax using a DSL
2. You run `tree-sitter generate` — this produces a C parser (`src/parser.c`)
3. The C parser is compiled into a shared library that editors/tools can load
4. The parser converts source code into a **Concrete Syntax Tree** (CST) — a structured
   representation of the code

> [!NOTE]
> The `tree-sitter` CLI tool handles steps 2-4 automatically. Your primary job as a grammar author is just step 1!

```mermaid
graph TD
    A[grammar.js (You write this)] -->|tree-sitter generate| B(parser.c)
    B -->|C Compiler| C{Shared Library}
    D[Source Code] -->|Parsed by| C
    C --> E[Concrete Syntax Tree]
```

## Prerequisites

Before starting, you need these tools installed:

| Tool | Why | Install Command |
|---|---|---|
| **Node.js** (v18+) | Tree-sitter grammars are written in JavaScript. Node.js runs them. | [Download](https://nodejs.org/) or `winget install OpenJS.NodeJS.LTS` |
| **npm** | Comes with Node.js. Manages JavaScript dependencies. | Bundled with Node.js |
| **C/C++ Compiler** | Tree-sitter generates C code that must be compiled. | On Windows: Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with "Desktop development with C++" workload |
| **tree-sitter CLI** | The command-line tool that generates and tests parsers. | `npm install -g tree-sitter-cli` (or `cargo install tree-sitter-cli --locked`) |
| **Git** | Version control. | `winget install Git.Git` |

### Verify Prerequisites

Run each of these commands. If any fail, install the missing tool before proceeding.

```powershell
# Check Node.js (expected: v18.x or higher)
node --version

# Check npm (expected: v9.x or higher)
npm --version

# Check tree-sitter CLI (expected: tree-sitter 0.25.x or higher)
tree-sitter --version

# Check C compiler (expected: shows MSVC version info or gcc version)
# On Windows with MSVC:
# Visual Studio intentionally does not add the compiler to your system PATH to avoid conflicts.
# To use a regular cmd window - run Microsoft's environment script first to load the variables.
# In cmd window, run the vcvars64.bat script.
"C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
# It will print a message saying the environment is initialized.
# Type cl to verify the compiler is now active in that specific window.
cl
# For Tree-sitter, remember that whenever you run commands like tree-sitter generate or tree-sitter test (which require a C compiler to build the parser), you must do it inside a command prompt where cl is recognized.
# On Windows with GCC/MinGW:
gcc --version

# Check Git
git --version
```

## Objectives

After completing this step, you will have:

- [x] A `d:\Git\tree-sitter-salesforce\` directory with the full project skeleton
- [x] A working `package.json` with all necessary npm scripts
- [x] A `tree-sitter.json` manifest declaring two grammars (apex, soql)
- [x] MIT license and NOTICE files
- [x] `SALESFORCE_API.md` tracking API v67 compatibility
- [x] `CHANGELOG.md` with initial entry
- [x] `.gitignore` and `.editorconfig` for consistent development
- [x] An initialized git repository with the first commit
- [x] `npm install` runs successfully
- [x] `tree-sitter` CLI is available in the project

## Detailed Instructions

### 1.1 Create the Project Directory

```powershell
# Create the project root directory
mkdir d:\Git\tree-sitter-salesforce
cd d:\Git\tree-sitter-salesforce
```

### 1.2 Initialize Git Repository

```powershell
cd d:\Git\tree-sitter-salesforce
git init
```

### 1.3 Create `.gitignore`

Create `d:\Git\tree-sitter-salesforce\.gitignore`:

```gitignore
# ============================================================================
# tree-sitter-salesforce .gitignore
# ============================================================================
# This file tells Git which files to ignore (not track in version control).
# Generated files, dependencies, and build artifacts should NOT be committed.
# ============================================================================

# --- Node.js Dependencies ---
# The node_modules/ directory contains ALL npm packages installed by
# `npm install`. It can be hundreds of MB and is always recreatable from
# package.json + package-lock.json. NEVER commit this.
node_modules/

# --- Build Artifacts ---
# When tree-sitter compiles parsers for testing, it creates shared libraries
# in a build/ directory. These are platform-specific binaries.
build/

# --- Tree-sitter Generated Files ---
# The `tree-sitter generate` command creates these files in each parser's
# src/ directory. They are auto-generated from grammar.js and should not
# be manually edited. However, they ARE typically committed to the repo
# because consumers need them (they won't have tree-sitter-cli installed).
# We comment these out intentionally — we WANT to commit generated parser files.
# !apex/src/parser.c
# !apex/src/grammar.json
# !apex/src/node-types.json
# !soql/src/parser.c

# --- WASM Build Outputs ---
# Generated WASM files for web bindings. Large binary files.
*.wasm

# --- OS-Specific Files ---
# macOS creates .DS_Store in every directory you open in Finder
.DS_Store
# Windows creates Thumbs.db for image thumbnails
Thumbs.db
# Windows desktop.ini files
desktop.ini

# --- Editor/IDE Files ---
# VS Code settings (each developer has their own preferences)
.vscode/
# JetBrains IDEs (IntelliJ, WebStorm, etc.)
.idea/
# Vim swap files
*.swp
*.swo
*~

# --- Logs ---
*.log
npm-debug.log*

# --- Prebuilt Binaries ---
# Platform-specific prebuilt native bindings
prebuilds/
```

### 1.4 Create `.editorconfig`

Create `d:\Git\tree-sitter-salesforce\.editorconfig`:

```editorconfig
# ============================================================================
# EditorConfig — Ensures consistent coding style across ALL editors
# ============================================================================
# EditorConfig is a file format that tells editors/IDEs how to format files.
# Most editors (VS Code, IntelliJ, Vim, etc.) support it natively or via plugin.
# See: https://editorconfig.org/
#
# WHY: When multiple people (or AI agents) edit the project, inconsistent
# indentation, line endings, and trailing whitespace create noisy git diffs.
# This file prevents that.
# ============================================================================

# This is the top-level EditorConfig file (don't look in parent directories)
root = true

# Default settings for ALL files
[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

# Markdown files: trailing spaces are significant (they create line breaks)
[*.md]
trim_trailing_whitespace = false

# Makefiles REQUIRE tabs for indentation (it's part of the Make syntax)
[Makefile]
indent_style = tab

# Python files use 4-space indentation by convention (PEP 8)
[*.py]
indent_size = 4

# C files generated by tree-sitter — we don't edit these, but keep consistent
[*.c]
indent_size = 4

[*.h]
indent_size = 4
```

### 1.5 Create `package.json`

Create `d:\Git\tree-sitter-salesforce\package.json`:

```json
{
  "name": "tree-sitter-salesforce",
  "version": "0.1.0",
  "description": "Tree-sitter grammars for Salesforce languages: Apex, SOQL, and more",
  "homepage": "https://github.com/YOUR_USERNAME/tree-sitter-salesforce",
  "license": "MIT",
  "author": {
    "name": "YOUR_NAME"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USERNAME/tree-sitter-salesforce.git"
  },
  "keywords": [
    "tree-sitter",
    "parser",
    "salesforce",
    "apex",
    "soql",
    "incremental",
    "parsing"
  ],
  "dependencies": {
    "node-addon-api": "^8.7.0",
    "node-gyp-build": "^4.8.0"
  },
  "peerDependencies": {
    "tree-sitter": "^0.22.4"
  },
  "peerDependenciesMeta": {
    "tree-sitter": {
      "optional": true
    }
  },
  "devDependencies": {
    "tree-sitter-cli": "^0.25.0"
  },
  "main": "bindings/node",
  "scripts": {
    "build": "npm run build-generate",
    "build-generate": "npm run build-soql && npm run build-apex",
    "build-apex": "cd apex && npx tree-sitter generate",
    "build-soql": "cd soql && npx tree-sitter generate",
    "test": "npm run test-soql && npm run test-apex",
    "test-apex": "cd apex && npx tree-sitter test",
    "test-soql": "cd soql && npx tree-sitter test",
    "install": "node-gyp-build"
  },
  "files": [
    "*/queries/*",
    "*/src/grammar.json",
    "*/src/node-types.json",
    "*/src/parser.c",
    "*/src/tree_sitter/parser.h",
    "bindings/node/*.js",
    "bindings/node/*.ts",
    "bindings/node/binding.cc",
    "binding.gyp",
    "prebuilds/**"
  ]
}
```

> **What's happening here?**
>
> - `dependencies`: Packages needed at runtime by consumers of the parser
>   - `node-addon-api`: Bridge between C++ and Node.js (native addons)
>   - `node-gyp-build`: Loads prebuilt native bindings
> - `peerDependencies`: The `tree-sitter` runtime that consumers must install separately
> - `devDependencies`: Tools needed only during development
>   - `tree-sitter-cli`: The CLI tool that generates parsers from grammar.js
> - `scripts`: npm commands that automate common tasks
>   - `build-apex`: Runs `tree-sitter generate` inside the apex/ directory
>   - `test-apex`: Runs `tree-sitter test` inside the apex/ directory
> - `files`: Controls what gets published to npm (only ship generated parsers + queries)

### 1.6 Create `tree-sitter.json`

This is the **tree-sitter manifest** — it tells the `tree-sitter` CLI about all the grammars
in this repository, their file associations, and their query files.

Create `d:\Git\tree-sitter-salesforce\tree-sitter.json`:

```json
{
  "metadata": {
    "version": "0.1.0",
    "license": "MIT",
    "description": "Tree-sitter grammars for Salesforce's Apex and SOQL languages",
    "authors": [
      {
        "name": "YOUR_NAME"
      }
    ],
    "links": {
      "repository": "https://github.com/YOUR_USERNAME/tree-sitter-salesforce.git"
    }
  },
  "grammars": [
    {
      "name": "apex",
      "camelcase": "Apex",
      "scope": "source.apex",
      "path": "apex",
      "file-types": ["cls", "trigger", "apex"],
      "highlights": [
        "apex/queries/highlights.scm"
      ],
      "injections": [
        "apex/queries/injections.scm"
      ],
      "locals": [
        "apex/queries/locals.scm"
      ],
      "tags": [
        "apex/queries/tags.scm"
      ]
    },
    {
      "name": "soql",
      "camelcase": "Soql",
      "scope": "source.soql",
      "path": "soql",
      "file-types": ["soql"],
      "highlights": [
        "soql/queries/highlights-distinct.scm",
        "soql/queries/highlights.scm"
      ]
    }
  ],
  "bindings": {
    "c": false,
    "go": false,
    "java": false,
    "kotlin": false,
    "node": true,
    "python": true,
    "rust": false,
    "swift": false
  }
}
```

> **What's happening here?**
>
> - `grammars`: Array of grammar declarations. Each entry tells tree-sitter:
>   - `name`: Internal name (used in generated code, must match `grammar.js` name)
>   - `scope`: TextMate-style scope identifier (used by editors for theme matching)
>   - `path`: Directory containing this grammar's `grammar.js`
>   - `file-types`: File extensions this parser handles
>   - `highlights`/`injections`/`locals`/`tags`: Paths to `.scm` query files
> - `bindings`: Which language bindings to generate. We enable Node.js and Python.

### 1.7 Create Directory Structure

```powershell
cd d:\Git\tree-sitter-salesforce

# Parser directories (each gets grammar.js, src/, test/corpus/, queries/)
mkdir apex
mkdir apex\test
mkdir apex\test\corpus
mkdir apex\queries
mkdir soql
mkdir soql\test
mkdir soql\test\corpus
mkdir soql\queries

# Shared utilities
mkdir common

# Language bindings
mkdir bindings
mkdir bindings\node
mkdir bindings\python
mkdir bindings\python\tree_sitter_salesforce
mkdir bindings\web

# Documentation
mkdir docs
mkdir docs\steps

# Build scripts
mkdir scripts
```

### 1.8 Create Minimal Parser Package Files

Each parser directory needs a minimal `package.json` so tree-sitter knows it's a parser.

Create `d:\Git\tree-sitter-salesforce\apex\package.json`:

```json
{
  "name": "tree-sitter-apex"
}
```

Create `d:\Git\tree-sitter-salesforce\soql\package.json`:

```json
{
  "name": "tree-sitter-soql"
}
```

### 1.9 Create Placeholder Grammar Files

These are minimal "hello world" grammars that tree-sitter can generate from. They will be
replaced with real grammars in Steps 3-6.

Create `d:\Git\tree-sitter-salesforce\apex\grammar.js`:

```javascript
/**
 * @file Apex language grammar for tree-sitter
 * @description Parses Salesforce Apex source code (.cls, .trigger files)
 * @license MIT
 *
 * Apex is a strongly-typed, object-oriented language that runs on the
 * Salesforce platform. It is syntactically similar to Java but includes
 * Salesforce-specific features like:
 *   - Inline SOQL/SOSL queries: [SELECT Id FROM Account]
 *   - DML statements: insert, update, delete, upsert, undelete, merge
 *   - Trigger definitions: trigger MyTrigger on Account (before insert) { }
 *   - Sharing keywords: with sharing, without sharing, inherited sharing
 *   - Salesforce annotations: @AuraEnabled, @IsTest, etc.
 *
 * Target: Salesforce API v67 (Summer '25)
 *
 * @see https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// ============================================================================
// GRAMMAR DEFINITION
// ============================================================================
// This is a PLACEHOLDER grammar. It will be replaced in Steps 4-6 with the
// full Apex grammar. For now, it just validates that tree-sitter can generate
// a parser from this file.
// ============================================================================

module.exports = grammar({
  // The `name` must match the "name" field in tree-sitter.json
  name: 'apex',

  rules: {
    // The first rule is always the "entry point" — what the parser expects at
    // the top level of a file. For Apex, this will eventually be class/trigger
    // declarations. For now, just match the word "hello".
    source_file: $ => 'hello'
  }
});
```

Create `d:\Git\tree-sitter-salesforce\soql\grammar.js`:

```javascript
/**
 * @file SOQL (Salesforce Object Query Language) grammar for tree-sitter
 * @description Parses SOQL queries used to retrieve data from Salesforce
 * @license MIT
 *
 * SOQL is a query language similar to SQL but designed specifically for
 * querying Salesforce objects (sObjects). Key differences from SQL:
 *   - No wildcard SELECT * (must list fields explicitly)
 *   - Relationship queries (parent.field, child subqueries)
 *   - TYPEOF for polymorphic relationships
 *   - Bind variables (:apexVariable)
 *   - Date literals (YESTERDAY, LAST_N_DAYS:5, etc.)
 *   - WITH clauses (WITH USER_MODE, WITH SECURITY_ENFORCED)
 *
 * Target: Salesforce API v67 (Summer '25)
 *
 * @see https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// ============================================================================
// GRAMMAR DEFINITION
// ============================================================================
// This is a PLACEHOLDER grammar. It will be replaced in Step 3 with the
// full SOQL grammar. For now, it just validates that tree-sitter can generate
// a parser from this file.
// ============================================================================

module.exports = grammar({
  // The `name` must match the "name" field in tree-sitter.json
  name: 'soql',

  rules: {
    // Placeholder entry point. Will be replaced with real SOQL grammar.
    source_file: $ => 'hello'
  }
});
```

### 1.10 Create Placeholder Query Files

Tree-sitter expects these query files to exist (they're referenced in `tree-sitter.json`).
Create them as empty files with explanatory comments.

Create `d:\Git\tree-sitter-salesforce\apex\queries\highlights.scm`:

```scheme
; ============================================================================
; Apex Syntax Highlighting Queries
; ============================================================================
; This file defines how Apex syntax tree nodes map to highlight groups.
; Editors use these groups to apply colors from the user's color scheme.
;
; Format: (node_type) @highlight.group
;
; Common highlight groups:
;   @keyword          - Language keywords (if, class, return, etc.)
;   @type             - Type names (String, Integer, Account, etc.)
;   @function         - Function/method names
;   @variable         - Variable names
;   @string           - String literals
;   @number           - Numeric literals
;   @comment          - Comments
;   @operator         - Operators (+, -, =, etc.)
;   @punctuation      - Brackets, semicolons, etc.
;
; Will be populated in Step 7.
; ============================================================================
```

Create `d:\Git\tree-sitter-salesforce\apex\queries\injections.scm`:

```scheme
; ============================================================================
; Apex Language Injection Queries
; ============================================================================
; This file tells editors which parts of Apex code should be parsed by a
; DIFFERENT parser. For Apex, we inject the SOQL parser into inline queries.
;
; Example: In the Apex code below, the [SELECT ...] portion will be parsed
; by the SOQL parser, not the Apex parser:
;
;   List<Account> accts = [SELECT Id FROM Account];
;                         ^^^^^^^^^^^^^^^^^^^^^^^^
;                         This is parsed by SOQL parser
;
; Will be populated in Step 7.
; ============================================================================
```

Create `d:\Git\tree-sitter-salesforce\apex\queries\locals.scm`:

```scheme
; ============================================================================
; Apex Local Variable Scope Queries
; ============================================================================
; This file defines scope boundaries for local variable resolution.
; Editors use this for features like "go to definition" and "rename symbol"
; within a local scope.
;
; Will be populated in Step 7.
; ============================================================================
```

Create `d:\Git\tree-sitter-salesforce\apex\queries\tags.scm`:

```scheme
; ============================================================================
; Apex Code Navigation Tags
; ============================================================================
; This file defines which nodes represent "symbols" for code navigation.
; Editors use these for features like the symbol outline, breadcrumbs,
; and "go to symbol" commands.
;
; Common tags:
;   @definition.class    - Class declarations
;   @definition.method   - Method declarations
;   @definition.function - Function declarations
;   @reference.call      - Method/function calls
;
; Will be populated in Step 7.
; ============================================================================
```

Create `d:\Git\tree-sitter-salesforce\soql\queries\highlights.scm`:

```scheme
; ============================================================================
; SOQL Syntax Highlighting Queries (Shared)
; ============================================================================
; Highlights for SOQL nodes that apply both when SOQL is standalone
; and when it's embedded inside Apex via injection.
;
; Will be populated in Step 7.
; ============================================================================
```

Create `d:\Git\tree-sitter-salesforce\soql\queries\highlights-distinct.scm`:

```scheme
; ============================================================================
; SOQL Syntax Highlighting Queries (Standalone Only)
; ============================================================================
; Additional highlights that apply ONLY when parsing standalone .soql files,
; not when SOQL is embedded inside Apex.
;
; The difference: When SOQL is inside Apex, some nodes (like comments) are
; already highlighted by the Apex parser. Standalone SOQL needs its own
; comment highlighting.
;
; Will be populated in Step 7.
; ============================================================================
```

### 1.11 Create LICENSE File (MIT)

Create `d:\Git\tree-sitter-salesforce\LICENSE`:


### 1.12 Create NOTICE File

Create `d:\Git\tree-sitter-salesforce\NOTICE`:

```
tree-sitter-salesforce
Copyright 2025 YOUR_NAME

This product references patterns from tree-sitter-java
(https://github.com/tree-sitter/tree-sitter-java), which is licensed under the
MIT License:

  Copyright (c) 2017 Ayman Nadeem

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
```

### 1.13 Create SALESFORCE_API.md

Create `d:\Git\tree-sitter-salesforce\SALESFORCE_API.md`:

```markdown
# Salesforce API Compatibility — v67 (Summer '25)

This document tracks which Salesforce language features the parser supports,
organized by the API version that introduced each feature.

## Target Version

| Property | Value |
|---|---|
| **API Version** | v67.0 |
| **Release Name** | Summer '25 |
| **Release Date** | June 2025 |

## Apex Language Features

### Core Features (Available Since Early Versions)

| Feature | API Version | Parser Status | Notes |
|---|---|---|---|
| Classes and Interfaces | v7+ | 🔲 Planned | |
| Enums | v7+ | 🔲 Planned | |
| Triggers | v7+ | 🔲 Planned | |
| Try/Catch/Finally | v7+ | 🔲 Planned | |
| DML Statements (insert, update, delete, upsert, undelete, merge) | v7+ | 🔲 Planned | |
| SOQL For Loops | v7+ | 🔲 Planned | |
| Static Methods/Variables | v7+ | 🔲 Planned | |
| Access Modifiers (public, private, protected, global) | v7+ | 🔲 Planned | |
| Sharing Keywords (with sharing, without sharing) | v7+ | 🔲 Planned | |
| Collections (List, Set, Map) | v7+ | 🔲 Planned | |
| Enhanced For Loops | v20+ | 🔲 Planned | |
| Annotations (@IsTest, @Future, etc.) | v24+ | 🔲 Planned | |

### Modern Features

| Feature | API Version | Parser Status | Notes |
|---|---|---|---|
| Switch/When Statements | v43 (Summer '18) | 🔲 Planned | |
| @InvocableMethod / @InvocableVariable | v31+ | 🔲 Planned | |
| inherited sharing | v44 (Winter '19) | 🔲 Planned | |
| @SuppressWarnings | v36+ | 🔲 Planned | |
| Safe Navigation Operator `?.` | v50 (Spring '21) | 🔲 Planned | |
| Null Coalescing Operator `??` | v59 (Winter '24) | 🔲 Planned | |

## SOQL Features

| Feature | Parser Status | Notes |
|---|---|---|
| SELECT, FROM, WHERE | 🔲 Planned | |
| Aggregate Functions (COUNT, SUM, AVG, MIN, MAX) | 🔲 Planned | |
| GROUP BY, HAVING | 🔲 Planned | |
| ORDER BY, LIMIT, OFFSET | 🔲 Planned | |
| Relationship Queries (Parent.Field) | 🔲 Planned | |
| Child Subqueries | 🔲 Planned | |
| TYPEOF (Polymorphic Relationships) | 🔲 Planned | |
| Date Literals (YESTERDAY, LAST_N_DAYS:n, etc.) | 🔲 Planned | |
| Bind Variables (:apexVariable) | 🔲 Planned | |
| FOR UPDATE / FOR REFERENCE / FOR VIEW | 🔲 Planned | |
| WITH USER_MODE / WITH SYSTEM_MODE | 🔲 Planned | |
| WITH SECURITY_ENFORCED | 🔲 Planned | |

## Backward Compatibility

This parser will successfully parse code written for **ANY** Salesforce API
version ≤ v67. Older code simply won't use newer features — the parser handles
this naturally because newer features are defined as `optional()` grammar rules.

Code using features from API versions > v67 may produce `ERROR` nodes in the
syntax tree.

## Limitations

- Custom annotations from managed packages are parsed as generic annotations
  (the parser recognizes the `@` prefix but doesn't validate annotation names)
- Apex does NOT have string interpolation — if you see it in your code, it's not
  standard Apex
- The parser does not validate semantic constraints (e.g., it won't reject a
  `global` method inside a non-`global` class — that's a compiler-level check)

## Status Key

| Icon | Meaning |
|---|---|
| ✅ | Implemented and tested |
| 🔧 | Work in progress |
| 🔲 | Planned but not started |
| ❌ | Will not implement (out of scope or not applicable) |
```

### 1.14 Create CHANGELOG.md

Create `d:\Git\tree-sitter-salesforce\CHANGELOG.md`:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project scaffold with mono-repo structure
- Placeholder Apex grammar (`apex/grammar.js`)
- Placeholder SOQL grammar (`soql/grammar.js`)
- Shared utilities framework (`common/`)
- MIT license
- Salesforce API v67 compatibility tracking (`SALESFORCE_API.md`)
- Educational documentation framework (`docs/`)
- Build scripts for multi-parser workflow
```

### 1.15 Create Placeholder README.md

Create `d:\Git\tree-sitter-salesforce\README.md`:

```markdown
# tree-sitter-salesforce

> 🚧 **Under Construction** — This project is in active development.

Tree-sitter grammars for Salesforce languages, including:

- **Apex** — The server-side programming language for the Salesforce platform
- **SOQL** — Salesforce Object Query Language

## Status

| Parser | Grammar | Tests | Highlights | Injections |
|---|---|---|---|---|
| Apex | 🔲 Planned | 🔲 | 🔲 | 🔲 |
| SOQL | 🔲 Planned | 🔲 | 🔲 | — |

## Salesforce API Version

This parser targets **Salesforce API v67 (Summer '25)**.
See [SALESFORCE_API.md](SALESFORCE_API.md) for the full compatibility matrix.

## License

MIT — see [LICENSE](LICENSE) for details.
```

### 1.16 Install Dependencies

```powershell
cd d:\Git\tree-sitter-salesforce
npm install
```

### 1.17 Verify Tree-Sitter Can Generate Parsers

```powershell
# Generate the placeholder Apex parser
cd d:\Git\tree-sitter-salesforce\apex
npx tree-sitter generate

# Generate the placeholder SOQL parser
cd d:\Git\tree-sitter-salesforce\soql
npx tree-sitter generate
```

Each `generate` command should:
1. Read `grammar.js`
2. Create a `src/` directory containing `parser.c`, `grammar.json`, `node-types.json`, and `tree_sitter/parser.h`
3. Exit without errors

### 1.18 Verify Parsers Work

```powershell
# Create a test file for the Apex parser
cd d:\Git\tree-sitter-salesforce\apex
echo hello > example-file.txt
npx tree-sitter parse example-file.txt
# Expected output: (source_file [0, 0] - [1, 0])

# Create a test file for the SOQL parser
cd d:\Git\tree-sitter-salesforce\soql
echo hello > example-file.txt
npx tree-sitter parse example-file.txt
# Expected output: (source_file [0, 0] - [1, 0])

# Clean up test files
del d:\Git\tree-sitter-salesforce\apex\example-file.txt
del d:\Git\tree-sitter-salesforce\soql\example-file.txt
```

### 1.19 Initial Git Commit

```powershell
cd d:\Git\tree-sitter-salesforce
git add .
git commit -m "chore: initial project scaffold

- Mono-repo structure for Apex and SOQL parsers
- MIT license
- Salesforce API v67 compatibility tracking
- Placeholder grammars that validate toolchain works
- npm scripts for build and test workflows"
```

## Verification Checklist

- [ ] `d:\Git\tree-sitter-salesforce\` exists and contains all files listed above
- [ ] `npm install` completes without errors
- [ ] `cd apex && npx tree-sitter generate` creates `apex/src/parser.c`
- [ ] `cd soql && npx tree-sitter generate` creates `soql/src/parser.c`
- [ ] `npx tree-sitter parse example-file.txt` outputs `(source_file ...)` in both parsers
- [ ] `git log` shows the initial commit
- [ ] The directory structure matches the architecture blueprint in the implementation plan

## Checkpoint State

After completing this step:

```
tree-sitter-salesforce/
├── .editorconfig           ✅ Created
├── .gitignore              ✅ Created
├── CHANGELOG.md            ✅ Created
├── LICENSE                 ✅ MIT
├── NOTICE                  ✅ Third-party attributions
├── README.md               ✅ Placeholder
├── SALESFORCE_API.md       ✅ v67 feature inventory
├── package.json            ✅ Configured with scripts
├── package-lock.json       ✅ Generated by npm install
├── tree-sitter.json        ✅ Multi-grammar manifest
├── node_modules/           ✅ Dependencies installed
├── apex/
│   ├── grammar.js          ✅ Placeholder
│   ├── package.json        ✅ Minimal
│   ├── src/                ✅ Generated (parser.c, grammar.json, etc.)
│   └── queries/            ✅ Empty placeholder .scm files
├── soql/
│   ├── grammar.js          ✅ Placeholder
│   ├── package.json        ✅ Minimal
│   ├── src/                ✅ Generated
│   └── queries/            ✅ Empty placeholder .scm files
├── common/                 📁 Empty (populated in Step 2)
├── bindings/               📁 Empty subdirectories (populated in Step 8)
├── docs/                   📁 Empty (populated in Step 9)
│   └── steps/              📁 Step files stored here
└── scripts/                📁 Empty (populated later)
```

**Next step:** Step 2 — Common Utilities & Shared Infrastructure
