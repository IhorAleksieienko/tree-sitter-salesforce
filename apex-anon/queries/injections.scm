; ============================================================================
; Anonymous Apex Language Injection Queries
; ============================================================================
; Tells editors which parts of Anonymous Apex should be parsed by a different parser.
;
; TIER 1 — Static inline queries:   [SELECT ...] and [FIND ...]
; TIER 2 — Dynamic string queries:  Database.query("SELECT ...")
; ============================================================================

; ─── TIER 1: Inline static SOQL ─────────────────────────────────────────────
((soql_expression) @injection.content
  (#set! injection.language "soql"))

; ─── TIER 1: Inline static SOSL ─────────────────────────────────────────────
((sosl_expression) @injection.content
  (#set! injection.language "sosl"))

; ─── TIER 2: Database.* string literal methods ───────────────────────────────
((method_invocation
  object: (identifier) @_obj
  name: (identifier) @_method
  arguments: (argument_list
    (string_literal) @injection.content))
  (#eq? @_obj "Database")
  (#match? @_method "^(query|countQuery|getQueryLocator|queryWithBinds)$")
  (#set! injection.language "soql"))
