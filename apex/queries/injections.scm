; ============================================================================
; Apex Language Injection Queries
; ============================================================================
; Tells editors which parts of Apex should be parsed by a different parser.
;
; TIER 1 — Static inline queries:   [SELECT ...] and [FIND ...]
; TIER 2 — Dynamic string queries:  Database.query("SELECT ...")
; ============================================================================

; ─── TIER 1: Inline static SOQL ─────────────────────────────────────────────
((soql_expression) @injection.content
  (#set! injection.language "soql"))

; ─── TIER 1: Inline static SOSL ─────────────────────────────────────────────
; NOTE: sosl_expression is introduced in Step 10. The SOSL grammar itself
; is authored in Step 12. Until Step 12 is complete, this rule is a no-op
; (there is no registered "sosl" language to inject).
((sosl_expression) @injection.content
  (#set! injection.language "sosl"))

; ─── TIER 2: Database.* string literal methods ───────────────────────────────
; Covers the full set of Database methods that accept a SOQL string argument.
; The (#match?) predicate replaces four separate rules with one pattern.
((method_invocation
  object: (identifier) @_obj
  name: (identifier) @_method
  arguments: (argument_list
    (string_literal) @injection.content))
  (#eq? @_obj "Database")
  (#match? @_method "^(query|countQuery|getQueryLocator|queryWithBinds)$")
  (#set! injection.language "soql"))
