; ============================================================================
; Apex Code Navigation Tags
; ============================================================================
; This file defines which nodes represent "symbols" for code navigation.
; Editors use these for features like the symbol outline, breadcrumbs,
; and "go to symbol" commands.
;
; Common tags:
;   @definition.class    - Class declarations
;   @definition.method   - Method declarations
;   @definition.function - Function declarations
;   @reference.call      - Method/function calls
;
; ============================================================================
(class_declaration name: (identifier) @name) @definition.class
(interface_declaration name: (identifier) @name) @definition.interface
(enum_declaration name: (identifier) @name) @definition.enum
(trigger_declaration name: (identifier) @name) @definition.function

(method_declaration name: (identifier) @name) @definition.method
(constructor_declaration name: (identifier) @name) @definition.method
