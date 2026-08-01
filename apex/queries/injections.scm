; ============================================================================
; Apex Language Injection Queries
; ============================================================================
; This file tells editors which parts of Apex code should be parsed by a
; DIFFERENT parser. For Apex, we inject the SOQL parser into inline queries.
;
; Example: In the Apex code below, the [SELECT ...] portion will be parsed
; by the SOQL parser, not the Apex parser:
;
;   List<Account> accts = [SELECT Id FROM Account];
;                         ^^^^^^^^^^^^^^^^^^^^^^^^
;                         This is parsed by SOQL parser
;
; ============================================================================
; TIER 1: Inline static SOQL — full injection
((soql_expression) @injection.content
  (#set! injection.language "soql"))

; TIER 2: Database.query() with simple string literal — full injection
((method_invocation
  object: (identifier) @_obj
  name: (identifier) @_method
  arguments: (argument_list
    (string_literal) @injection.content))
  (#eq? @_obj "Database")
  (#eq? @_method "query")
  (#set! injection.language "soql"))

((method_invocation
  object: (identifier) @_obj
  name: (identifier) @_method
  arguments: (argument_list
    (string_literal) @injection.content))
  (#eq? @_obj "Database")
  (#eq? @_method "countQuery")
  (#set! injection.language "soql"))

((method_invocation
  object: (identifier) @_obj
  name: (identifier) @_method
  arguments: (argument_list
    (string_literal) @injection.content))
  (#eq? @_obj "Database")
  (#eq? @_method "getQueryLocator")
  (#set! injection.language "soql"))
