; ============================================================================
; SOSL Syntax Highlighting
; ============================================================================

; SObject names in RETURNING clause
(returning_clause sobject: (identifier) @type)

; Field paths
(field_path (identifier) @variable)

; Search string
(sosl_string) @string

; Bind variable
(bind_variable ":" @operator (identifier) @variable.other)

; Numbers
(integer) @number
(decimal) @number

; Booleans, Null, Date literals
(boolean) @constant.builtin
(null_literal) @constant.builtin
(date_literal) @constant.builtin

; Comparison operators
(comparison_operator) @operator

[
  "="
  "!="
  "<>"
  "<"
  "<="
  ">"
  ">="
  ":"
] @operator

; Punctuation
[
  "("
  ")"
  ","
  "."
] @punctuation
