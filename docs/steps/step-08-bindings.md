# Step 8: Bindings & Integration

> **Agent Handoff Context**: Steps 1-7 are COMPLETE.
> - Both Apex and SOQL parsers are feature-complete with tests passing
> - Query files (highlights, injections, locals, tags) are all in place
> - SOQL injection into Apex works end-to-end
> - `tree-sitter highlight` works for both languages

## Context

This step creates the **language bindings** — the bridge code that lets programs written in
Node.js, Python, and WebAssembly (browsers) use our parsers.

### What Are Bindings?

The tree-sitter grammar produces a C parser (`src/parser.c`). But most applications don't
call C directly. Bindings are thin wrapper layers that expose the parser to other languages:

```
grammar.js → tree-sitter generate → parser.c (C code)
                                       │
                          ┌────────────┼────────────┐
                          ▼            ▼            ▼
                    binding.cc    binding.c      .wasm
                    (Node.js)     (Python)       (Web)
                         │            │            │
                    npm package   pip package   WASM module
```

### How the `tree-sitter init` Command Helps

For standard single-grammar repos, `tree-sitter init` generates all binding files
automatically. For multi-grammar repos like ours, we need to create them manually since
each binding needs to expose BOTH the Apex and SOQL parsers.

## Prerequisites

- Steps 1-7 complete
- Both parsers generating and testing successfully
- Node.js, Python 3, and Emscripten (for WASM) available

## Objectives

After completing this step, you will have:

- [x] `binding.gyp` — Node.js native binding build config
- [x] `bindings/node/index.js` — Node.js exports (apex and soql parsers)
- [x] `bindings/node/index.d.ts` — TypeScript type declarations
- [x] `bindings/node/binding.cc` — C++ ↔ Node.js bridge
- [x] `pyproject.toml` and `setup.py` — Python package config
- [x] `bindings/python/tree_sitter_salesforce/__init__.py` — Python exports
- [x] `bindings/web/` — WASM binaries (built if Emscripten available)
- [x] Integration tests verifying each binding loads correctly

## Detailed Instructions

### 8.1 Create `binding.gyp`

This is the build configuration for Node.js native addons. It tells `node-gyp` how to
compile the C parsers into a shared library that Node.js can load.

Create `d:\Git\tree-sitter-salesforce\binding.gyp`:

```json
{
  "targets": [
    {
      "target_name": "tree_sitter_salesforce_binding",
      "dependencies": [
        "<!(node -p \"require('node-addon-api').targets\"):node_addon_api_except"
      ],
      "include_dirs": [
        "apex/src",
        "soql/src"
      ],
      "sources": [
        "bindings/node/binding.cc",
        "apex/src/parser.c",
        "soql/src/parser.c"
      ],
      "conditions": [
        ["OS!='win'", {
          "cflags_c": [
            "-std=c11",
            "-fvisibility=hidden"
          ]
        }, {
          "msvs_settings": {
            "VCCLCompilerTool": {
              "AdditionalOptions": ["/std:c11", "/utf-8"]
            }
          }
        }]
      ]
    }
  ]
}
```

> **What's happening here?**
>
> - `target_name`: The name of the compiled native module
> - `include_dirs`: Where to find the parser header files (`tree_sitter/parser.h`)
> - `sources`: The C/C++ files to compile:
>   - `binding.cc`: Our C++ bridge code
>   - `apex/src/parser.c`: The generated Apex parser
>   - `soql/src/parser.c`: The generated SOQL parser
> - `conditions`: Platform-specific compiler flags (C11 standard for both MSVC and GCC)

### 8.2 Create Node.js Binding

Create `d:\Git\tree-sitter-salesforce\bindings\node\binding.cc`:

```cpp
/**
 * @file Node.js native binding for tree-sitter-salesforce
 * @description
 * This C++ file creates a Node.js native addon that exposes the Apex and SOQL
 * parsers to JavaScript. It uses the Node-API (N-API) for ABI stability across
 * Node.js versions.
 *
 * HOW IT WORKS:
 * 1. Node.js loads this compiled .node file when you `require('tree-sitter-salesforce')`
 * 2. The Napi::Init function registers the `apex` and `soql` parser functions
 * 3. Each parser function returns a Language object that tree-sitter can use
 *
 * You don't need to modify this file unless you add a new parser to the repo.
 * To add a new parser (e.g., sosl):
 *   1. Add the extern declaration for tree_sitter_sosl()
 *   2. Add a new Napi::Function for "sosl" in the Init function
 */

#include <napi.h>

// These functions are defined in the generated parser.c files.
// The `extern "C"` tells the C++ compiler to use C-style name mangling
// so we can call functions defined in plain C files.
extern "C" {
  // Defined in apex/src/parser.c
  const void *tree_sitter_apex();
  // Defined in soql/src/parser.c
  const void *tree_sitter_soql();
}

/**
 * Creates a JavaScript Language object wrapping a tree-sitter parser.
 *
 * The returned object has properties that tree-sitter's Node.js binding
 * uses to identify and load the parser.
 */
namespace {

/**
 * Returns the Apex parser's Language pointer as a JavaScript external value.
 */
Napi::Value ApexLanguage(const Napi::CallbackInfo &info) {
  auto env = info.Env();
  auto language = Napi::External<void>::New(env,
    const_cast<void *>(tree_sitter_apex()));
  auto languageObject = Napi::Object::New(env);
  languageObject.Set("name", Napi::String::New(env, "apex"));
  languageObject.Set("language", language);
  return languageObject;
}

/**
 * Returns the SOQL parser's Language pointer as a JavaScript external value.
 */
Napi::Value SoqlLanguage(const Napi::CallbackInfo &info) {
  auto env = info.Env();
  auto language = Napi::External<void>::New(env,
    const_cast<void *>(tree_sitter_soql()));
  auto languageObject = Napi::Object::New(env);
  languageObject.Set("name", Napi::String::New(env, "soql"));
  languageObject.Set("language", language);
  return languageObject;
}

/**
 * Module initialization — registers all parser functions.
 * When Node.js loads this native module, this function is called once.
 */
Napi::Object Init(Napi::Env env, Napi::Object exports) {
  // Export each parser as a property of the module
  exports.Set("apex", Napi::Function::New(env, ApexLanguage));
  exports.Set("soql", Napi::Function::New(env, SoqlLanguage));
  return exports;
}

// Register the module init function with Node.js
NODE_API_MODULE(tree_sitter_salesforce_binding, Init)

} // namespace
```

Create `d:\Git\tree-sitter-salesforce\bindings\node\index.js`:

```javascript
/**
 * @file Node.js entry point for tree-sitter-salesforce
 * @description
 * This module exports the Apex and SOQL parsers for use with tree-sitter
 * in Node.js applications.
 *
 * Usage:
 *   const Parser = require('tree-sitter');
 *   const Salesforce = require('tree-sitter-salesforce');
 *
 *   const parser = new Parser();
 *
 *   // Parse Apex code
 *   parser.setLanguage(Salesforce.apex);
 *   const apexTree = parser.parse('public class T { }');
 *
 *   // Parse SOQL
 *   parser.setLanguage(Salesforce.soql);
 *   const soqlTree = parser.parse('SELECT Id FROM Account');
 */

// node-gyp-build automatically finds the correct prebuilt binary for
// the current platform (windows/mac/linux) and architecture (x64/arm64).
// If no prebuilt is found, it falls back to building from source.
const binding = require("node-gyp-build")(__dirname + "/../..");

// Export each parser.
// Usage: require('tree-sitter-salesforce').apex
module.exports = {
  /** Apex language parser */
  apex: binding.apex(),
  /** SOQL language parser */
  soql: binding.soql(),
};
```

Create `d:\Git\tree-sitter-salesforce\bindings\node\index.d.ts`:

```typescript
/**
 * TypeScript type declarations for tree-sitter-salesforce
 *
 * These types allow TypeScript projects to use tree-sitter-salesforce
 * with full type checking and IntelliSense support.
 */

import type { Language } from "tree-sitter";

/** Apex language parser for tree-sitter */
export const apex: Language;

/** SOQL language parser for tree-sitter */
export const soql: Language;
```

### 8.3 Create Python Binding

Create `d:\Git\tree-sitter-salesforce\bindings\python\tree_sitter_salesforce\__init__.py`:

```python
"""
tree-sitter-salesforce Python bindings.

Provides Apex and SOQL parsers for use with the tree-sitter Python library.

Usage:
    import tree_sitter_salesforce as tss

    # Get language objects
    apex_lang = tss.apex()
    soql_lang = tss.soql()

    # Use with tree-sitter
    from tree_sitter import Language, Parser

    parser = Parser()
    parser.language = Language(apex_lang)
    tree = parser.parse(b"public class T { }")
    print(tree.root_node.sexp())
"""

from importlib.resources import files as _files

# Path to the compiled shared library containing both parsers
_SHARED_LIB = str(
    _files("tree_sitter_salesforce")
    .joinpath("")  # Package directory
)


def apex():
    """
    Returns the Apex language object for tree-sitter.

    Use this with tree_sitter.Language to create a parser:
        lang = Language(tree_sitter_salesforce.apex())
        parser = Parser()
        parser.language = lang
    """
    from tree_sitter import Language
    return Language(_SHARED_LIB, "apex")


def soql():
    """
    Returns the SOQL language object for tree-sitter.

    Use this with tree_sitter.Language to create a parser:
        lang = Language(tree_sitter_salesforce.soql())
        parser = Parser()
        parser.language = lang
    """
    from tree_sitter import Language
    return Language(_SHARED_LIB, "soql")
```

Update `d:\Git\tree-sitter-salesforce\pyproject.toml`:

```toml
[project]
name = "tree-sitter-salesforce"
version = "0.1.0"
description = "Salesforce Apex and SOQL grammars for tree-sitter"
license = {text = "MIT"}
requires-python = ">=3.9"
classifiers = [
    "License :: OSI Approved :: MIT License",
    "Programming Language :: Python :: 3",
    "Topic :: Software Development :: Compilers",
    "Topic :: Text Processing :: Linguistic",
    "Typing :: Typed",
]

[build-system]
requires = ["setuptools>=42", "wheel"]
build-backend = "setuptools.build_meta"
```

### 8.4 Test Node.js Binding

```powershell
cd d:\Git\tree-sitter-salesforce

# Build the native binding
npm run build

# Test that both parsers load correctly
node -e "
const s = require('./bindings/node');
console.log('Apex parser name:', s.apex.name);
console.log('SOQL parser name:', s.soql.name);
console.log('All bindings loaded successfully!');
"
```

### 8.5 Build WASM (Optional — Requires Emscripten)

```powershell
# Only if Emscripten is installed (emsdk)
# Build WASM for Apex
cd d:\Git\tree-sitter-salesforce\apex
npx tree-sitter build --wasm

# Build WASM for SOQL
cd d:\Git\tree-sitter-salesforce\soql
npx tree-sitter build --wasm

# Copy WASM files to bindings/web/
copy d:\Git\tree-sitter-salesforce\apex\tree-sitter-apex.wasm d:\Git\tree-sitter-salesforce\bindings\web\
copy d:\Git\tree-sitter-salesforce\soql\tree-sitter-soql.wasm d:\Git\tree-sitter-salesforce\bindings\web\
```

> **Note**: WASM builds require the Emscripten SDK. If it's not installed, skip this step.
> WASM bindings can be added later without affecting Node.js or Python bindings.

### 8.6 Git Commit

```powershell
cd d:\Git\tree-sitter-salesforce
git add .
git commit -m "feat: Node.js, Python, and WASM bindings

- binding.gyp: Node.js native addon build config
- bindings/node: JavaScript entry point, TypeScript types, C++ bridge
- bindings/python: Python package with tree-sitter integration
- pyproject.toml: Python package metadata
- Both parsers loadable from Node.js and Python
- WASM builds (if Emscripten available)"
```

## Verification Checklist

- [ ] `binding.gyp` is valid and includes both parser C files
- [ ] `bindings/node/binding.cc` compiles (via `npm run build` or `node-gyp rebuild`)
- [ ] `require('./bindings/node').apex.name` returns `"apex"`
- [ ] `require('./bindings/node').soql.name` returns `"soql"`
- [ ] `bindings/node/index.d.ts` has TypeScript declarations
- [ ] `bindings/python/tree_sitter_salesforce/__init__.py` exports `apex()` and `soql()`
- [ ] `pyproject.toml` has correct metadata
- [ ] Git commit exists for this step

## Checkpoint State

After this step, the parsers are usable from Node.js, Python, and (optionally) the browser.

**Next step:** Step 9 — Documentation & Polish
