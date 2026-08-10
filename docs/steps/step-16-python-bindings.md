# Step 16: Python Bindings Modernization — All Four Languages

> **Agent Checkpoint — Read This First**
>
> **Status**: COMPLETE.
> **Completed**: 2026-08-10.
> **Prerequisites**: Steps 10–15 are COMPLETE.
> - All four grammars are fully implemented and tested:
>   - `apex/` — Apex parser with balanced `soql_expression`, advanced `when` clauses
>   - `apex-anon/` — Anonymous Apex scripting mode
>   - `soql/` — Expanded SOQL parser
>   - `sosl/` — New SOSL parser
>   - `formula/` — New Formula Language parser
> - All corpus tests pass for all grammars.
>
> **⚠️ DESIGN FLAG — BREAKING API CHANGE. READ THIS SECTION BEFORE TOUCHING ANY CODE.**
>
> The current `bindings/python/tree_sitter_salesforce/__init__.py` uses the deprecated
> `Language(_SHARED_LIB, "name")` constructor (a path-based loading API removed in
> `tree-sitter >= 0.24`). This step migrates to the modern `nanobind`-based capsule API.
>
> This IS a breaking change for any downstream project using the old API form. Specifically:
> - **`sf-rag-engine`** at `d:\Git\sf-rag-engine` imports and calls `tss.apex()` and
>   `tss.soql()`. You MUST verify those continue to work BEFORE publishing.
> - The function signatures (`apex()`, `soql()`) remain the same.
> - The return type changes from the old `Language` capsule to the new `Language` object —
>   which is API-compatible at the Python level but requires `tree-sitter >= 0.22.0`.
>
> **Do not skip the `sf-rag-engine` regression test at the end of this step.**

---

## Goal

Modernize the Python packaging and binding layer to:

1. Expose all five grammar loaders: `apex()`, `apex_anon()`, `soql()`, `sosl()`, `formula()`.
2. Replace the deprecated shared-library path constructor with the modern `nanobind` C-extension capsule pattern.
3. Update `pyproject.toml` to declare `tree-sitter >= 0.22.0` as a runtime dependency.
4. Rebuild `binding.gyp` to compile all five parsers into the native extension.

---

## Background: The Deprecated API

The current `__init__.py` (lines 31–54) loads parsers via a path to a compiled shared library:

```python
# CURRENT — DEPRECATED (tree-sitter 0.22+, REMOVED in 0.24+)
from tree_sitter import Language

def apex():
    return Language(_SHARED_LIB, "apex")
```

The modern API uses a `PyCapsule` C object returned from the compiled C extension,
not a path string:

```python
# MODERN — Correct for tree-sitter >= 0.22
from tree_sitter import Language
from . import _binding_apex  # compiled C extension module

def apex():
    return Language(_binding_apex.language())
```

Each grammar has its own C extension (`_binding_apex.pyd`, `_binding_soql.pyd`, etc.)
that exports a single `language()` function returning the parser's `TSLanguage *` pointer
wrapped in a PyCapsule.

---

## Affected Files

| File | Change Type | Description |
|---|---|---|
| `pyproject.toml` | Modify | Declare `tree-sitter>=0.22.0` dependency, update build system |
| `bindings/python/tree_sitter_salesforce/__init__.py` | Modify | Replace all loaders with modern capsule API |
| `bindings/python/binding.c` (×5) | **New** | C binding source per grammar |
| `binding.gyp` | Modify | Add all 5 grammars and separate per-grammar targets |
| `setup.py` (optional) | New/Modify | If needed for setuptools extension discovery |

---

## Sub-Task 16.1 — Update `pyproject.toml`

### File: [`pyproject.toml`](file:///d:/Git/tree-sitter-salesforce/pyproject.toml)

```toml
[project]
name = "tree-sitter-salesforce"
version = "0.2.0"
description = "Salesforce Apex, SOQL, SOSL, and Formula grammars for tree-sitter"
license = {text = "MIT"}
requires-python = ">=3.9"
dependencies = [
    "tree-sitter>=0.22.0",
]
classifiers = [
    "License :: OSI Approved :: MIT License",
    "Programming Language :: Python :: 3",
    "Programming Language :: Python :: 3.9",
    "Programming Language :: Python :: 3.10",
    "Programming Language :: Python :: 3.11",
    "Programming Language :: Python :: 3.12",
    "Topic :: Software Development :: Compilers",
    "Topic :: Text Processing :: Linguistic",
    "Typing :: Typed",
]

[build-system]
requires = [
    "setuptools>=68",
    "wheel",
    "tree-sitter>=0.22.0",
]
build-backend = "setuptools.build_meta"

[tool.setuptools.packages.find]
where = ["bindings/python"]
```

---

## Sub-Task 16.2 — Create Per-Grammar C Binding Sources

The modern tree-sitter Python binding pattern uses a small C shim that exports a
`language()` function. Create one for each grammar:

### Template: `bindings/python/binding_GRAMMAR.c`

```c
#include <Python.h>

// Declare the external TSLanguage function from the generated parser.c
// The function name follows the convention: tree_sitter_GRAMMAR()
typedef struct TSLanguage TSLanguage;
extern const TSLanguage *tree_sitter_apex(void);

// Python C extension entry point
// Returns the TSLanguage pointer as a PyCapsule
static PyObject *language(PyObject *self, PyObject *args) {
    return PyCapsule_New((void *)tree_sitter_apex(), "tree_sitter_apex.TSLanguage", NULL);
}

static PyMethodDef methods[] = {
    {"language", language, METH_NOARGS, "Return the Apex tree-sitter language."},
    {NULL, NULL, 0, NULL}
};

static struct PyModuleDef module = {
    PyModuleDef_HEAD_INIT,
    .m_name = "_binding_apex",
    .m_doc = NULL,
    .m_size = -1,
    .m_methods = methods,
};

PyMODINIT_FUNC PyInit__binding_apex(void) {
    return PyModule_Create(&module);
}
```

Create these 5 files (adjusting `tree_sitter_GRAMMAR`, `_binding_GRAMMAR`, and `PyInit_`
for each):

| File | Grammar function | Module name |
|---|---|---|
| `bindings/python/binding_apex.c` | `tree_sitter_apex` | `_binding_apex` |
| `bindings/python/binding_apex_anon.c` | `tree_sitter_apex_anon` | `_binding_apex_anon` |
| `bindings/python/binding_soql.c` | `tree_sitter_soql` | `_binding_soql` |
| `bindings/python/binding_sosl.c` | `tree_sitter_sosl` | `_binding_sosl` |
| `bindings/python/binding_formula.c` | `tree_sitter_formula` | `_binding_formula` |

---

## Sub-Task 16.3 — Update `binding.gyp`

### File: [`binding.gyp`](file:///d:/Git/tree-sitter-salesforce/binding.gyp)

Replace the existing single-target config with 5 separate targets, one per grammar:

```json
{
  "targets": [
    {
      "target_name": "_binding_apex",
      "include_dirs": ["<!@(python3 -c \"import tree_sitter; print(tree_sitter.get_include())\")"],
      "sources": ["bindings/python/binding_apex.c", "apex/src/parser.c"],
      "cflags": ["-std=c11"],
      "cflags_cc": ["-std=c++14"]
    },
    {
      "target_name": "_binding_apex_anon",
      "include_dirs": ["<!@(python3 -c \"import tree_sitter; print(tree_sitter.get_include())\")"],
      "sources": ["bindings/python/binding_apex_anon.c", "apex-anon/src/parser.c"],
      "cflags": ["-std=c11"]
    },
    {
      "target_name": "_binding_soql",
      "include_dirs": ["<!@(python3 -c \"import tree_sitter; print(tree_sitter.get_include())\")"],
      "sources": ["bindings/python/binding_soql.c", "soql/src/parser.c"],
      "cflags": ["-std=c11"]
    },
    {
      "target_name": "_binding_sosl",
      "include_dirs": ["<!@(python3 -c \"import tree_sitter; print(tree_sitter.get_include())\")"],
      "sources": ["bindings/python/binding_sosl.c", "sosl/src/parser.c"],
      "cflags": ["-std=c11"]
    },
    {
      "target_name": "_binding_formula",
      "include_dirs": ["<!@(python3 -c \"import tree_sitter; print(tree_sitter.get_include())\")"],
      "sources": ["bindings/python/binding_formula.c", "formula/src/parser.c"],
      "cflags": ["-std=c11"]
    }
  ]
}
```

---

## Sub-Task 16.4 — Rewrite `__init__.py`

### File: [`bindings/python/tree_sitter_salesforce/__init__.py`](file:///d:/Git/tree-sitter-salesforce/bindings/python/tree_sitter_salesforce/__init__.py)

```python
"""
tree-sitter-salesforce Python bindings.

Provides Apex, Anonymous Apex, SOQL, SOSL, and Formula Language parsers
for use with the tree-sitter Python library (>= 0.22.0).

Usage:
    import tree_sitter_salesforce as tss
    from tree_sitter import Language, Parser

    parser = Parser()
    parser.language = Language(tss.apex())
    tree = parser.parse(b"public class T { }")
    print(tree.root_node.sexp())

Available language loaders:
    tss.apex()       — Salesforce Apex (.cls, .trigger)
    tss.apex_anon()  — Anonymous Apex scripting mode (.apex)
    tss.soql()       — SOQL query language (.soql)
    tss.sosl()       — SOSL search language (.sosl)
    tss.formula()    — Salesforce Formula Language (.formula)

Requires: tree-sitter >= 0.22.0
"""


def apex():
    """
    Returns the Apex language capsule for tree-sitter.

    Parses .cls and .trigger files containing class, interface,
    enum, and trigger declarations.
    """
    from tree_sitter import Language
    from . import _binding_apex
    return Language(_binding_apex.language())


def apex_anon():
    """
    Returns the Anonymous Apex language capsule for tree-sitter.

    Parses anonymous Apex scripts (top-level statements without a class wrapper),
    as used by Developer Console Execute Anonymous and `sf apex run`.
    """
    from tree_sitter import Language
    from . import _binding_apex_anon
    return Language(_binding_apex_anon.language())


def soql():
    """
    Returns the SOQL language capsule for tree-sitter.

    Parses SOQL queries in standalone .soql files and (when injected)
    inside Apex [SELECT ...] expressions.
    """
    from tree_sitter import Language
    from . import _binding_soql
    return Language(_binding_soql.language())


def sosl():
    """
    Returns the SOSL language capsule for tree-sitter.

    Parses SOSL search queries in standalone .sosl files and (when injected)
    inside Apex [FIND ...] expressions.
    """
    from tree_sitter import Language
    from . import _binding_sosl
    return Language(_binding_sosl.language())


def formula():
    """
    Returns the Formula Language capsule for tree-sitter.

    Parses Salesforce Formula Language expressions used in Validation Rules,
    Formula Fields, and Flow Decision Criteria.
    """
    from tree_sitter import Language
    from . import _binding_formula
    return Language(_binding_formula.language())
```

> **Note on import style**: The `from . import _binding_*` pattern uses a relative import
> so the binding module is resolved from the installed package directory. This ensures
> the correct `.pyd`/`.so` file is found regardless of the working directory.

---

## Sub-Task 16.5 — Build and Install Locally

```cmd
pip install -e . --no-build-isolation
```

This compiles all 5 C extensions and installs the package in editable mode.

On **Windows**, if `node-gyp` or MSVC is not set up, use the Python build backend directly:
```cmd
pip install --upgrade pip build
python -m build --wheel
pip install dist\tree_sitter_salesforce-0.2.0-*.whl
```

---

## Sub-Task 16.6 — Regression Test Against `sf-rag-engine`

> **⚠️ This sub-task is mandatory.** The `sf-rag-engine` project is a known consumer of
> `tree_sitter_salesforce`. Its parser layer must continue to work after this upgrade.

### Locate the parser integration point in `sf-rag-engine`

```cmd
findstr /r /s "tree_sitter_salesforce\|tss\." d:\Git\sf-rag-engine\src
```

Note all files that import from `tree_sitter_salesforce`.

### Run `sf-rag-engine` parser tests

```cmd
cd d:\Git\sf-rag-engine
python -m pytest tests/ -k "parser" -v
```

All parser-related tests must pass unchanged.

### Manual smoke test

```python
# Run from sf-rag-engine directory or any directory after pip install
import tree_sitter_salesforce as tss
from tree_sitter import Language, Parser

# Apex
parser = Parser()
parser.language = Language(tss.apex())
tree = parser.parse(b"""
public with sharing class AccountService {
    public List<Account> getAccounts() {
        return [SELECT Id, Name FROM Account WHERE IsDeleted = false];
    }
}
""")
assert not tree.root_node.has_error, f"Apex ERROR: {tree.root_node.sexp()}"

# SOQL
parser.language = Language(tss.soql())
tree = parser.parse(b"SELECT Id, Name, (SELECT LastName FROM Contacts) FROM Account WHERE IsActive__c = true")
assert not tree.root_node.has_error, f"SOQL ERROR: {tree.root_node.sexp()}"

# SOSL
parser.language = Language(tss.sosl())
tree = parser.parse(b"FIND 'Acme' IN ALL FIELDS RETURNING Account(Name), Contact(FirstName)")
assert not tree.root_node.has_error, f"SOSL ERROR: {tree.root_node.sexp()}"

# Formula
parser.language = Language(tss.formula())
tree = parser.parse(b"IF(ISBLANK(Email__c), 'Required', Email__c)")
assert not tree.root_node.has_error, f"Formula ERROR: {tree.root_node.sexp()}"

print("All parsers: OK")
```

---

## How to Test This Step

### 1. Verify tree-sitter version

```cmd
python -c "import tree_sitter; print(tree_sitter.__version__)"
```

Must be `>= 0.22.0`. If not:
```cmd
pip install "tree-sitter>=0.22.0"
```

### 2. Build the package

```cmd
cd d:\Git\tree-sitter-salesforce
pip install -e . --no-build-isolation
```

Watch for compilation errors in each grammar's `parser.c`.

### 3. Verify all five loaders

```python
import tree_sitter_salesforce as tss
for fn in [tss.apex, tss.apex_anon, tss.soql, tss.sosl, tss.formula]:
    lang = fn()
    print(f"{fn.__name__}: {type(lang).__name__}")
```

Each must print `Language` without raising an ImportError or AttributeError.

### 4. Verify no deprecation warnings

```cmd
python -W error::DeprecationWarning -c "import tree_sitter_salesforce as tss; tss.apex()"
```

Must exit with code 0 (no deprecation warnings promoted to errors).

### 5. Run sf-rag-engine regression tests

(See Sub-Task 16.6 above.)

---

## Success Criteria

| # | Criterion | How to Verify |
|---|---|---|
| 1 | `tss.apex()` returns `Language` without deprecation warning | `python -W error` smoke test |
| 2 | `tss.apex_anon()` returns `Language` | Smoke test |
| 3 | `tss.soql()` returns `Language` | Smoke test |
| 4 | `tss.sosl()` returns `Language` | Smoke test |
| 5 | `tss.formula()` returns `Language` | Smoke test |
| 6 | No `Language(path, name)` pattern remains in `__init__.py` | Read the file (grep for `_SHARED_LIB`) |
| 7 | `sf-rag-engine` parser tests pass unchanged | Run pytest in sf-rag-engine |
| 8 | `pip install .` succeeds on Python 3.9, 3.11, 3.12 | CI matrix (or manual test on available versions) |
| 9 | `tree-sitter>=0.22.0` declared in `pyproject.toml` | Read the file |

---

## Regression Risk

**High for downstream consumers** (especially `sf-rag-engine`) if:
- The `_binding_*` C extension is not compiled or not found on the path.
- The `tree-sitter` version installed in the consuming project is < 0.22.

**Mitigation**: Add a version check at the top of `__init__.py`:
```python
import tree_sitter as _ts
if tuple(int(x) for x in _ts.__version__.split(".")[:2]) < (0, 22):
    raise ImportError(
        f"tree-sitter-salesforce 0.2.0+ requires tree-sitter>=0.22.0. "
        f"Found: {_ts.__version__}. Run: pip install 'tree-sitter>=0.22.0'"
    )
```

---

## API Contract Impact

**Breaking change in the build layer** (new C extension architecture), but **backward
compatible at the Python call level**:

| Aspect | Before | After |
|---|---|---|
| Function signatures | `apex()`, `soql()` | `apex()`, `apex_anon()`, `soql()`, `sosl()`, `formula()` |
| Return type | `Language` (old capsule) | `Language` (new capsule) |
| Min `tree-sitter` version | Unspecified | `>= 0.22.0` |
| Shared library path | Single `.pyd` for all grammars | One `.pyd` per grammar |
| `_SHARED_LIB` variable | Present | Removed |

---

## Documentation Updates Required After Completion

- [x] `README.md` — Update Quick Start to show all 5 language loaders
- [x] `README.md` — Add `tree-sitter>=0.22.0` to prerequisites
- [x] `pyproject.toml` — Version bump to `0.2.0`
- [x] `CHANGELOG.md` — Add migration guide for consumers upgrading from `0.1.x`
- [x] `docs/step-08-bindings.md` — Note that this step supersedes it for the new grammars
