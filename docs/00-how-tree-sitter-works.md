# How Tree-Sitter Works — A Gentle Introduction

## What is a Parser?
A parser takes raw source code (text) and converts it into a structured data format called a tree. This tree represents the syntax and relationships between different parts of the code. Think of it like the HTML DOM for a web page, but for any programming language.

## What Makes Tree-Sitter Special?
- **Incremental:** It only re-parses the parts of the code that have changed, making it fast enough to run on every keystroke.
- **Error-tolerant:** Even if a file has syntax errors, Tree-Sitter produces a useful tree by skipping the bad parts, which is crucial for IDE features like autocomplete.
- **Fast:** Written in C, it's used in real-time text editors like Neovim, Atom, and VS Code.
- **Universal:** It provides a uniform API to interact with the syntax trees of any language.

## The Pipeline
1. You write a `grammar.js` file using a JavaScript DSL.
2. You run `tree-sitter generate`.
3. The CLI generates a `parser.c` file.
4. The C code is compiled into a shared library (`.so`, `.dll`, `.wasm`).
5. Applications load the library and use it to parse code.

## Key Concepts

### Concrete Syntax Tree (CST)
Unlike an Abstract Syntax Tree (AST), which drops "unnecessary" tokens like parentheses or commas, a CST retains *every single token* from the source code. This allows for precise code formatting and highlighting.

### Named vs Anonymous Nodes
- **Named nodes:** Represent significant language constructs and appear in the syntax tree with a specific name (e.g., `identifier`, `class_declaration`).
- **Anonymous nodes:** Represent literal tokens like `{`, `}`, or `public`. They appear in the tree as strings and are generally ignored during analysis.

### Fields
Fields are like named parameters for nodes. For example, a `class_declaration` might have a field called `name` that points to the class's `identifier`. This makes querying the tree much easier than relying on child indices.

### Extras
Extras are tokens that can appear anywhere in the source code without breaking the syntax. In most languages, this includes whitespace and comments.

### Precedence and Conflicts
When the grammar is ambiguous (e.g., `a + b * c`), Tree-Sitter uses precedence rules (`prec`, `prec.left`, `prec.right`) to decide which interpretation is correct. If the ambiguity is unresolvable statically, Tree-Sitter uses GLR parsing (via the `conflicts` array) to explore multiple branches at runtime.

## How Editors Use Tree-Sitter
- **Syntax highlighting:** Uses `highlights.scm` queries to map nodes to colors.
- **Code folding:** Uses block nodes to determine where folds should happen.
- **Indentation:** Uses the tree structure to determine scope depth.
- **Code navigation:** Uses `tags.scm` to find definitions and references.
- **Multi-language support:** Uses `injections.scm` to embed one language inside another (like SOQL inside Apex).
