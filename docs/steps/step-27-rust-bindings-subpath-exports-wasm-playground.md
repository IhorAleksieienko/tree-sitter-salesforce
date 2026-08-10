# Step 27: Language Bindings & Tooling — Rust Crate, Subpath Node Exports, and WebAssembly Playground

> **Agent Checkpoint — Read This First**
>
> **Status**: NOT STARTED.
> **Prerequisites**: Steps 10–17, 19–26 are COMPLETE.
> - All grammars (`apex`, `apex-anon`, `soql`, `sosl`, `formula`) have generated C code (`src/parser.c`).
> - Node.js and Python bindings are operational.
>
> **Design Flag ℹ️**:
> This step introduces:
> 1. Native Rust bindings (`Cargo.toml`, `bindings/rust/`) compiling all 5 grammars into a single unified `tree-sitter-salesforce` crate.
> 2. Package manifest modernization with subpath exports in `package.json` (`require("tree-sitter-salesforce/apex")`).
> 3. An interactive client-side WebAssembly playground in `docs/playground/` for live in-browser AST visualization.

---

## Goal

Provide multi-ecosystem distribution and developer tooling for `tree-sitter-salesforce`:
1. Author standard `Cargo.toml` and Rust bindings allowing Rust consumers (`tree-sitter-salesforce` crate) to load all 5 grammars via `tree_sitter::Language`.
2. Add subpath exports to `package.json` for granular Node.js and TypeScript imports.
3. Build a zero-install WebAssembly interactive browser playground in `docs/playground/`.

---

## Background: Current State

1. **Rust Ecosystem Support Missing**:
   The repository currently only provides Node.js (`binding.gyp`, `index.js`) and Python (`pyproject.toml`, `bindings/python`) bindings. High-performance code intelligence tools, language servers (such as Rust-based LSPs), and search indexers require native `tree-sitter` Rust crate bindings.

2. **Package Subpath Exports Incomplete**:
   In `package.json`, consumers currently import the entire root module (`const tss = require('tree-sitter-salesforce')`). Modern bundlers and ESM projects benefit from direct subpath exports:
   `import apex from 'tree-sitter-salesforce/apex';`

3. **No Interactive Playground**:
   Users and grammar contributors must use the CLI `tree-sitter parse` to inspect trees. An interactive WASM playground allows immediate browser-based syntax testing, highlight inspection, and bug reproduction without local installation.

---

## Technical Design

### 1. Rust Crate Architecture (`Cargo.toml`, `bindings/rust/`)
- **Where to look**: Root repository and `bindings/rust/`.
- **What to touch**:
  - Create `Cargo.toml` at repository root declaring the `tree-sitter-salesforce` package:
    - Include `tree-sitter = "~0.22"` or `"~0.24"` dependency and `cc` build dependency.
  - Create `bindings/rust/build.rs`:
    - Use `cc::Build` to compile:
      - `apex/src/parser.c`
      - `apex-anon/src/parser.c`
      - `soql/src/parser.c`
      - `sosl/src/parser.c`
      - `formula/src/parser.c`
    - Include header search paths for `src/tree_sitter/parser.h`.
  - Create `bindings/rust/lib.rs`:
    - Expose extern C functions: `tree_sitter_apex()`, `tree_sitter_apex_anon()`, `tree_sitter_soql()`, `tree_sitter_sosl()`, `tree_sitter_formula()`.
    - Expose safe Rust wrapper functions:
      `pub fn language_apex() -> tree_sitter::Language`,
      `pub fn language_soql() -> tree_sitter::Language`, etc.
    - Expose node query strings (`HIGHLIGHTS_QUERY`, `TAGS_QUERY`).

### 2. Node.js Modern Subpath Exports (`package.json`)
- **Where to look**: `package.json` at root.
- **What to touch**:
  - Add `"exports"` map:
    - `".": "./index.js"`
    - `"./apex": "./apex/index.js"` (or direct binding loader)
    - `"./apex-anon": "./apex-anon/index.js"`
    - `"./soql": "./soql/index.js"`
    - `"./sosl": "./sosl/index.js"`
    - `"./formula": "./formula/index.js"`
    - `"./package.json": "./package.json"`
  - Provide corresponding TypeScript type declaration maps (`index.d.ts`, `apex/index.d.ts`, etc.).

### 3. WebAssembly Playground (`docs/playground/`)
- **Where to look**: `docs/playground/`.
- **What to touch**:
  - Create `docs/playground/index.html`: Responsive UI layout with editor pane, language selector, and interactive AST viewer pane.
  - Create `docs/playground/app.js`: Loads `web-tree-sitter.wasm`, dynamically initializes the selected language WASM module (`tree-sitter-apex.wasm`, `tree-sitter-soql.wasm`, etc.), parses editor content on keystroke, and renders an expandable CST tree view.
  - Create `docs/playground/style.css`: Clean, dark-mode styling aligned with modern Salesforce Lightning Design System aesthetic.

---

## Affected Files

| File | Change Type | Description |
|---|---|---|
| `Cargo.toml` | **New** | Manifest for the `tree-sitter-salesforce` Rust crate. |
| `bindings/rust/build.rs` | **New** | C compilation build script for all 5 grammars in Rust. |
| `bindings/rust/lib.rs` | **New** | Rust FFI declarations and safe `tree_sitter::Language` loaders. |
| `package.json` | Modify | Add modern `"exports"` map and subpath typings. |
| `docs/playground/index.html` | **New** | WebAssembly playground page. |
| `docs/playground/app.js` | **New** | Client-side `web-tree-sitter` driver and AST tree renderer. |
| `docs/playground/style.css` | **New** | Playground styling. |

---

## Sub-Tasks

### Sub-Task 27.1: Author Rust Bindings
- Create `Cargo.toml` with crate metadata, dependencies, and build requirements.
- Author `bindings/rust/build.rs` to compile all 5 parser C files.
- Author `bindings/rust/lib.rs` with safe `language_*()` getters and query constants.
- Author unit tests in `bindings/rust/lib.rs` verifying each language loads and parses a test string.

### Sub-Task 27.2: Configure `package.json` Subpath Exports
- Update `package.json` with `"exports"` field mapping root and per-grammar subpaths.
- Verify both CommonJS `require('tree-sitter-salesforce/apex')` and ESM `import ...` resolve correctly.

### Sub-Task 27.3: Create Interactive WASM Playground
- Implement `docs/playground/index.html`, `app.js`, and `style.css`.
- Add build helper script `scripts/build-wasm-playground.js` to compile `.wasm` binaries via `tree-sitter build --wasm` and copy them to `docs/playground/wasm/`.

---

## How to Test This Step

### 1. Test Rust Crate Compilation & Tests
```cmd
cargo test --manifest-path Cargo.toml
```
Verify that all 5 grammar symbols load and parse sample code in Rust.

### 2. Test Node.js Subpath Exports
Run a quick Node evaluation script:
```cmd
node -e "const apex = require('./apex'); const soql = require('./soql'); console.log('Apex:', typeof apex, 'SOQL:', typeof soql);"
```
Verify both submodule exports load successfully.

### 3. Test WASM Playground Locally
```cmd
npx serve docs/playground
```
Open `http://localhost:3000` in a browser. Select "Apex", type `public class Test {}`, and verify the live CST updates instantly without errors.

---

## Success Criteria

| # | Criterion | Verification Method |
|---|---|---|
| 1 | `cargo test` compiles all 5 parsers and passes Rust integration tests | `cargo test` |
| 2 | `require('tree-sitter-salesforce/apex')` resolves directly via subpath exports | Node evaluation |
| 3 | WASM playground compiles and renders interactive parse tree in browser | Browser manual test |
| 4 | Query constants (`HIGHLIGHTS_QUERY`, etc.) accessible from Rust crate | Rust unit test |

---

## Regression Risk & API Contract Impact

- **Regression Risk**: Zero. Rust bindings and playground files are additive and do not modify grammar definitions.
- **API Contract Impact**:
  - Adds Rust crate package `tree-sitter-salesforce`.
  - Enables modern `package.json` subpath exports for npm consumers.

---

## Documentation Updates Required

- [ ] `README.md`: Add Rust installation snippet (`cargo add tree-sitter-salesforce`), subpath import examples, and link to WASM playground.
- [ ] `docs/01-project-setup.md`: Document Rust build prerequisites and WASM build workflow.
- [ ] `CHANGELOG.md`: Record addition of Rust bindings, subpath exports, and WASM interactive playground.
