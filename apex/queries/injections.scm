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
; Will be populated in Step 7.
; ============================================================================
