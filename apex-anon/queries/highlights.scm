; ============================================================================
; Anonymous Apex Syntax Highlighting Queries
; ============================================================================
; This file defines how Anonymous Apex syntax tree nodes map to highlight groups.
; Editors use these groups to apply colors from the user's color scheme.
;
; Common highlight groups:
;   @keyword          - Language keywords (if, return, etc.)
;   @type             - Type names (String, Integer, Account, etc.)
;   @function         - Function/method names
;   @variable         - Variable names
;   @string           - String literals
;   @number           - Numeric literals
;   @comment          - Comments
;   @operator         - Operators (+, -, =, etc.)
;   @punctuation      - Brackets, semicolons, etc.
; ============================================================================

; Modifiers and DML
(modifiers) @keyword
(dml_type) @keyword

; Built-in Identifiers & Literals
(this) @variable.builtin
(super) @variable.builtin
(boolean) @constant.builtin
(null_literal) @constant.builtin
(void_type) @type.builtin

; Types
(type_identifier) @type
(scoped_type_identifier) @type

; Variables and Parameters
(variable_declarator name: (identifier) @variable)
(catch_formal_parameter name: (identifier) @variable)
(enhanced_for_statement name: (identifier) @variable)

; Properties and Fields
(field_access field: (identifier) @property)

; Method Invocations
(method_invocation name: (identifier) @function.call)

; Distinct Database.* invocations
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
