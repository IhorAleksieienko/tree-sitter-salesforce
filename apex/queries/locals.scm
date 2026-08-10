; ============================================================================
; Apex Local Variable Scope Queries
; ============================================================================
; This file defines scope boundaries for local variable resolution.
; Editors use this for features like "go to definition" and "rename symbol"
; within a local scope.
;
; ============================================================================
(class_declaration body: (class_body) @local.scope)
(interface_declaration body: (interface_body) @local.scope)
(enum_declaration body: (enum_body) @local.scope)
(method_declaration body: (block) @local.scope)
(constructor_declaration body: (block) @local.scope)
(trigger_declaration body: (trigger_body) @local.scope)
(block) @local.scope
(for_statement body: (statement) @local.scope)
(enhanced_for_statement body: (statement) @local.scope)
(while_statement body: (statement) @local.scope)
(try_statement body: (block) @local.scope)
(catch_clause body: (block) @local.scope)

(variable_declarator name: (identifier) @local.definition)
(formal_parameter name: (identifier) @local.definition)
(catch_formal_parameter name: (identifier) @local.definition)
(enhanced_for_statement name: (identifier) @local.definition)
(when_type_pattern name: (identifier) @local.definition)

(identifier) @local.reference
