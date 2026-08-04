# Queries and Highlights

## What are Queries?
Tree-Sitter queries are written in a Lisp-like language (files with `.scm` extension). They allow you to search the syntax tree for specific patterns and assign metadata (like highlight groups or injection tags) to the matched nodes.

## Highlighting (`highlights.scm`)
Highlight queries map syntax nodes to standard highlight groups (e.g., `@keyword`, `@string`, `@type`). Editors use these groups to colorize the code.

Example:
```scheme
; Match any string_literal and tag it as a string
(string_literal) @string

; Match an identifier that acts as a class name
(class_declaration
  name: (identifier) @type.class)
```

## Language Injection (`injections.scm`)
Injection allows you to embed one language parser inside another. This is how we parse SOQL inside Apex.

Example:
```scheme
((soql_expression) @injection.content
  (#set! injection.language "soql"))
```
This tells the editor: "Find any `soql_expression` node. Treat its contents as source code for the `soql` language." The editor will then spin up the SOQL parser, parse the content, and merge the resulting tree into the main Apex tree.

## Locals (`locals.scm`)
Locals queries track variable scopes. This powers features like "Go to Definition" or "Rename Variable" within a single file.

Example:
```scheme
(method_declaration
  body: (block) @local.scope)

(local_variable_declaration
  declarator: (variable_declarator
    name: (identifier) @local.definition.var))
```

## Tags (`tags.scm`)
Tags queries extract structural symbols from the file (like a table of contents). This powers the "Outline" view in editors.

Example:
```scheme
(method_declaration
  name: (identifier) @name) @reference.method
```
