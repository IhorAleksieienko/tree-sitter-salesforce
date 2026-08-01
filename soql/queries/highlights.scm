; ============================================================================
; SOQL Syntax Highlighting Queries (Shared)
; ============================================================================
; Highlights for SOQL nodes that apply both when SOQL is standalone
; and when it's embedded inside Apex via injection.
; ============================================================================
; Keywords
[
  "SELECT" "FROM" "WHERE" "WITH" "GROUP_BY" "HAVING" "ORDER_BY"
  "LIMIT" "OFFSET" "FOR_UPDATE" "FOR_REFERENCE" "FOR_VIEW"
  "UPDATE_TRACKING" "UPDATE_VIEWSTAT" "USING_SCOPE"
  "ASC" "DESC" "NULLS_FIRST" "NULLS_LAST"
  "AND" "OR" "NOT" "LIKE" "IN" "INCLUDES" "EXCLUDES"
  "TYPEOF" "WHEN" "ELSE" "THEN" "END"
] @keyword

; Identifiers
(identifier) @variable

; Literals
(string_literal) @string
(boolean_literal) @constant.builtin
(null_literal) @constant.builtin
(number_literal) @number

; Operators
[
  "=" "!=" "<" "<=" ">" ">="
] @operator

; Punctuation
[
  "(" ")" "," ":"
] @punctuation
