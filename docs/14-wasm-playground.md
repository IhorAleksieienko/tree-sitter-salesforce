# WebAssembly Interactive Playground Guide

The **Tree-sitter Salesforce WebAssembly Playground** is a client-side, browser-based AST visualization and syntax testing environment for all Salesforce grammars: **Apex**, **Anonymous Apex**, **SOQL**, **SOSL**, and **Formula Language**.

It allows developers, grammar contributors, and tool authors to inspect concrete syntax trees (CST), diagnose parse errors, experiment with queries, and test new syntax features in real time without local C/C++ compiler setup.

---

## 1. Quick Start: Launching the Playground Locally

The playground is located in [`docs/playground/`](file:///d:/Git/tree-sitter-salesforce/docs/playground/) and can be served locally with zero external npm dependencies.

### Option A: Using Built-in Node.js Server (Recommended — Zero Dependencies)

Run our zero-dependency static server included in the repository (uses only Node.js core modules `http`, `fs`, `path`):

```bash
npm run serve:playground
# or directly:
node scripts/serve-playground.js
```

Open `http://localhost:3000` in your browser.

### Option B: Using Python Standard Library (Zero Dependencies)

```bash
python -m http.server 3000 --directory docs/playground
```

Open `http://localhost:3000` in your browser.

### Option C: Using VS Code Live Server Extension

1. Open the repository in VS Code.
2. Right-click [`docs/playground/index.html`](file:///d:/Git/tree-sitter-salesforce/docs/playground/index.html) and select **"Open with Live Server"**.

> [!TIP]
> All options above require **zero external npm package downloads**, avoiding supply chain risks associated with dynamic CLI tool execution.

---

## 2. Building Local WebAssembly Binaries

The playground automatically loads native `.wasm` binaries when available.

### Prerequisites for Compiling WASM
- **Emscripten SDK (`emcc`)** installed and available in PATH (or **Docker**).

### Compilation Commands

Run the automated playground WASM build script:

```bash
npm run build:playground
```

Or build web bindings directly:

```bash
npm run build:wasm
```

This compiles all five grammar `.wasm` files:
- `tree-sitter-apex.wasm`
- `tree-sitter-apex_anon.wasm`
- `tree-sitter-soql.wasm`
- `tree-sitter-sosl.wasm`
- `tree-sitter-formula.wasm`

And places them in both [`bindings/web/`](file:///d:/Git/tree-sitter-salesforce/bindings/web/) and [`docs/playground/wasm/`](file:///d:/Git/tree-sitter-salesforce/docs/playground/wasm/).

> [!NOTE]
> In CI/CD pipelines, GitHub Actions automatically compiles all WASM binaries across platforms on every release tag.

---

## 3. Playground Features & User Interface

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ⚡ Tree-Sitter Salesforce Playground  [Apex] [SOQL] [SOSL] [Formula] [Reset] │
├──────────────────────────────────────┬──────────────────────────────────────┤
│  SOURCE CODE EDITOR                  │  PARSE TREE VIEWER (CST / AST)       │
│  1  public class AccountService {    │  ▼ (compilation_unit)                │
│  2    public static void run() {     │    ▼ (class_declaration)             │
│  3      insert as user accts;        │      name: (identifier "Account...") │
│  4    }                              │      ▼ body: (class_body)            │
│  5  }                                │        ▼ (method_declaration)        │
│                                      │          ▼ (dml_statement)           │
│                                      │            ▼ (dml_security_mode)     │
├──────────────────────────────────────┴──────────────────────────────────────┤
│  ⚡ 0.8 ms • 🌿 42 nodes • 📐 Depth: 7 • ✓ Valid CST                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1. Multi-Grammar Selection
Switch between the 5 supported Salesforce languages with a single click:
- **Apex**: Standard classes, interfaces, triggers, and enums.
- **Anonymous Apex**: Top-level scripts (`sf apex run` / Developer Console).
- **SOQL**: Query language (clauses, aggregates, `convertTimezone()`, `FORMULA()`, `ALL ROWS`).
- **SOSL**: Search language (`FIND {term}`, `RETURNING`, `WITH USER_MODE`, `SNIPPET`).
- **Formula**: Declarative formulas (Validation Rules, Formula Fields, Flow criteria).

### 2. Preloaded Canonical Samples
Each language includes curated code examples showcasing Salesforce API v67.0 (Summer '25) features:
- **Apex**: DML security modes (`as user` / `as system`), constructor chaining (`this()`, `super()`), triggers with inner member declarations, case-insensitive switch statements, and multi-line raw strings (`'''...'''`).
- **SOQL**: `GROUP BY ROLLUP/CUBE`, `convertTimezone()`, `USING LOOKUP ... BIND`, `WITH RecordVisibilityContext`, and dynamic formula filtering.
- **SOSL**: Curly brace delimiters (`FIND {term}`), `RETURNING` projection functions (`toLabel`, `convertCurrency`, `FORMAT`), and modern `WITH` clauses.
- **Formula**: `IMAGE()` expressions, geo-spatial functions (`DISTANCE`, `GEOLOCATION`), temporal functions (`ISOWEEK`, `TIMENOW`, `UNIXTIMESTAMP`), and platform global variables (`$RecordType`, `$Permission`, `$CustomMetadata`).

### 3. Interactive CST Tree View
- **Expand / Collapse**: Click the chevron (`▼` / `▶`) next to any node to expand or collapse subtrees. Use **Expand All** or **Collapse All** in the toolbar for quick navigation.
- **Field Highlighting**: Named syntax fields (e.g. `name:`, `condition:`, `body:`) are highlighted in amber.
- **Hover & Selection Sync**: Hovering over or clicking a node highlights the exact character range in the source editor and displays the node's line/column coordinates (`[row, col] - [row, col]`).
- **Show Anonymous Tokens**: Check **Show Tokens** to display structural punctuation and keywords (e.g. `;`, `{`, `}`, `class`, `SELECT`).

### 4. Real-time Node Search & Filtering
Type in the filter input (e.g. `where_clause`, `dml_security_mode`, `ERROR`) to instantly locate and highlight matching nodes in large AST trees. The tree automatically expands the ancestral path to matching nodes.

### 5. Multi-Format AST Export
- **Tree View**: Interactive graphical CST explorer.
- **S-Expression View**: Lisp-style S-expression text (compatible with `tree-sitter test` corpus fixtures).
- **JSON View**: Standard JSON AST object with positional coordinates and child node arrays.
- **Copy Action**: Click the **Copy** button in the header to copy the active representation directly to the clipboard.

### 6. Live Performance & Health Metrics
The bottom footer displays real-time telemetry:
- **⚡ Parse Time**: Keystroke parsing latency in milliseconds (typically < 2 ms).
- **🌿 Total Node Count**: Count of active AST nodes in the parsed document.
- **📐 Tree Depth**: Maximum hierarchy depth of the syntax tree.
- **✓ Status Badge**: Indicates whether the syntax is valid or contains `(ERROR)` / `(MISSING)` nodes.

---

## 4. Using WebAssembly Bindings in Your Own Applications

You can embed the compiled WebAssembly grammars in custom web applications or VS Code Web extensions:

```javascript
import Parser from 'web-tree-sitter';

async function parseApexCode(code) {
  // 1. Initialize WebAssembly runtime
  await Parser.init();
  const parser = new Parser();

  // 2. Load the Salesforce Apex WASM module
  const Apex = await Parser.Language.load('/path/to/tree-sitter-apex.wasm');
  parser.setLanguage(Apex);

  // 3. Parse code incrementally
  const tree = parser.parse(code);
  console.log(tree.rootNode.toString());
  return tree;
}
```

---

## 5. Troubleshooting & FAQ

### Why does the status bar show "Running with syntax parser"?
If you open `index.html` via `file:///` without running a local web server or before executing `npm run build:playground`, the playground operates in preview mode using its fallback parser. Run `npx serve docs/playground` with compiled `.wasm` files in `docs/playground/wasm/` for full native speed.

### How do I debug a syntax error?
1. Paste the failing Salesforce code into the editor.
2. Filter the tree view by typing `ERROR` in the search box.
3. Inspect the node immediately preceding the `(ERROR)` node to identify where the grammar expectation diverged.
