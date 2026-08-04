; ============================================================================
; SOQL Syntax Highlighting Queries (Shared)
; ============================================================================
; Highlights for SOQL nodes that apply both when SOQL is standalone
; and when it's embedded inside Apex via injection.
; ============================================================================
; Keywords
[
  "SELECT" "FROM" "WHERE" "WITH" "GROUP_BY" "HAVING" "ORDER_BY"
  "LIMIT" "OFFSET" "FOR" "UPDATE" "REFERENCE" "VIEW"
  "TRACKING" "VIEWSTAT" "USING" "SCOPE"
  "ASC" "DESC" "NULLS_FIRST" "NULLS_LAST"
  "AND" "OR" "NOT" "LIKE" "IN" "INCLUDES" "EXCLUDES"
  "TYPEOF" "WHEN" "ELSE" "THEN" "END"
] @keyword

; Identifiers
(identifier) @variable

; Literals
(string_literal) @string
(boolean) @constant.builtin
(null_literal) @constant.builtin
(int) @number
(decimal) @number

; Operators
[
  "=" "!=" "<" "<=" ">" ">="
] @operator

; Punctuation
[
  "(" ")" "," ":"
] @punctuation
