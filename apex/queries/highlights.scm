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
; ============================================================================
; Keywords
[
  "class" "interface" "enum" "trigger"
  "extends" "implements" "on"
  "public" "private" "protected" "global"
  "with_sharing" "without_sharing" "inherited_sharing"
  "static" "final" "override" "virtual" "abstract" "transient"
  "if" "else" "for" "while" "do" "switch_on" "when" "when_else"
  "try" "catch" "finally" "return" "throw" "break" "continue"
  "insert" "update" "upsert" "delete" "undelete" "merge"
  "new" "instanceof" "get" "set" "this" "super"
] @keyword

; Primitive Types & Void
[
  "void"
] @type.builtin

; Built-in Boolean & Null
[
  "true" "false" "null"
] @constant.builtin

; Types
(type_identifier) @type
(scoped_type_identifier) @type

; Method declarations
(method_declaration name: (identifier) @function)
(constructor_declaration name: (identifier) @constructor)

; Variables
(variable_declarator name: (identifier) @variable)
(formal_parameter name: (identifier) @parameter)
(catch_formal_parameter name: (identifier) @variable)
(enhanced_for_statement name: (identifier) @variable)

; Annotations
(annotation name: (identifier) @attribute)
(annotation name: (scoped_type_identifier) @attribute)
(annotation_key_value key: (identifier) @property)

; Properties and Fields
(field_declaration (variable_declarator name: (identifier) @property))
(property_declaration name: (identifier) @property)
(field_access field: (identifier) @property)

; Method invocations
(method_invocation name: (identifier) @function.call)

; TIER 3: Highlight Database.query/countQuery calls distinctly
((method_invocation
  object: (identifier) @type
  name: (identifier) @function.builtin)
  (#eq? @type "Database")
  (#any-of? @function.builtin "query" "countQuery" "getQueryLocator"))

; Literals
(string_literal) @string
(int) @number
(decimal) @number

; Comments
(line_comment) @comment
(block_comment) @comment

; Operators
[
  "+" "-" "*" "/" "%" "=" "+=" "-=" "*=" "/=" "%="
  "==" "!=" "<>" "===" "!==" "<" "<=" ">" ">="
  "&&" "||" "!" "<<" ">>" ">>>" "&" "|" "^"
  "++" "--" "?." "??" "?" ":"
] @operator

; Punctuation
[
  "(" ")" "{" "}" "[" "]" "." "," ";"
] @punctuation
