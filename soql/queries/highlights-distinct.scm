; ============================================================================
; SOQL Syntax Highlighting Queries (Standalone Only)
; ============================================================================
; Additional highlights that apply ONLY when parsing standalone .soql files,
; not when SOQL is embedded inside Apex.
;
; The difference: When SOQL is inside Apex, some nodes (like comments) are
; already highlighted by the Apex parser. Standalone SOQL needs its own
; comment highlighting.
;
; ============================================================================
(formatting_comment) @comment
(header_comment) @comment
