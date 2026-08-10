; ============================================================================
; Formula Language Syntax Highlighting
; ============================================================================

; Function names
(function_call name: (function_name) @function.builtin)
(function_name (identifier) @function)
(image_expression) @function.builtin

; Global context variables ($User, $Organization, etc.)
(global_variable "$" @operator)
(global_context) @variable.builtin
(global_variable field: (identifier) @variable)

; Field references
(field_reference (identifier) @variable)

; Operators
(binary_expression ["=" "==" "<>" "!=" "<" "<=" ">" ">=" "&" "+" "-" "*" "/" "^" "&&" "||"] @operator)
(unary_expression ["!" "-" "+"] @operator)

; Literals
(string_literal) @string
(number) @number
(boolean_literal) @constant.builtin
(null_literal) @constant.builtin
(date_literal) @constant.builtin

; Punctuation
"(" @punctuation.bracket
")" @punctuation.bracket
"," @punctuation.delimiter
"." @punctuation.delimiter
