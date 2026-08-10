; ============================================================================
; Salesforce Debug Log (sflog) Highlighting Queries
; ============================================================================

; Timestamps & Numbers
(timestamp) @number
(nanoseconds) @number
(api_version) @number
(number) @number
(line_reference) @number
(frame_identifier) @constant

; Log Header & Categories
(category_identifier) @property
(log_level) @type.qualifier

; Event Types & Keywords
(event_identifier) @keyword
(dml_operation) @keyword
(dml_type) @type
(aggregations) @constant.numeric
(rows_count) @constant.numeric
(boolean_flag) @boolean

; Method Signatures & Identifiers
(method_signature) @function.method
(identifier) @variable
(type_identifier) @type
(memory_address) @constant

; Payloads & Messages
(debug_message) @string
(soql_query) @string.special
(code_unit_description) @string
(username) @string.special
(timezone) @string
(gmt_offset) @string
(exception_message) @string.special

; Limit Usage
(limit_name) @property
(limit_notes) @comment
(default_namespace) @constant

; Stack Traces & Raw
(stack_trace_line) @comment
(raw_line) @comment
