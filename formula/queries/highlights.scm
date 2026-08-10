; ============================================================================
; Formula Language Syntax Highlighting
; ============================================================================

; Function names
(function_call name: (function_name) @function.builtin)
(function_name (identifier) @function)

; Global context variables ($User, $Organization, etc.)
(global_variable "$" @operator (identifier) @variable.builtin)

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
