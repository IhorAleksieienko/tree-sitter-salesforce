; ============================================================================
; SOQL Syntax Highlighting Queries (Shared)
; ============================================================================
; Highlights for SOQL nodes that apply both when SOQL is standalone
; and when it's embedded inside Apex via injection.
; ============================================================================

; Function Names
(date_function_name) @function.builtin
(scalar_function_name) @function.builtin
(function_expression function_name: (identifier) @function)

; Clause Types & Modifiers
[
  (for_type)
  (update_type)
  (using_scope_type)
  (fields_type)
  (order_direction)
  (order_null_direction)
  (with_type)
] @keyword

; SObject & Types
(storage_identifier (identifier) @type)
(date_literal) @constant.builtin

; Field Properties
(field_identifier (identifier) @property)
(field_identifier (dotted_identifier (identifier) @property))

; Identifiers (default)
(identifier) @variable

; Literals
(string_literal) @string
(boolean) @constant.builtin
(null_literal) @constant.builtin
(int) @number
(decimal) @number
(date) @number
(date_time) @number
(currency_literal) @number

; Operators
[
  "=" "!=" "<>" "<" "<=" ">" ">="
] @operator
(value_comparison_operator) @operator
(set_comparison_operator) @operator

; Punctuation
[
  "(" ")" "," ":" "."
] @punctuation

; Comments
(header_comment) @comment
(formatting_comment) @comment


