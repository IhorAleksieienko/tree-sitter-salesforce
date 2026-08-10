/**
 * @file Anonymous Apex grammar for tree-sitter
 * @description
 * Parses "anonymous Apex" scripts — top-level executable statements without a
 * class or trigger wrapper. Used by:
 *   - Salesforce Developer Console "Execute Anonymous"
 *   - `sf apex run` / `sfdx force:apex:execute`
 *   - CI test scripts and data migration scripts
 *
 * This grammar shares all rules with apex/grammar.js except for the entry point.
 * The entry point here is repeat($.statement) instead of repeat($.declaration).
 *
 * WHY A SEPARATE GRAMMAR?
 * Merging both modes into one grammar at the source_file level introduces
 * fundamental GLR conflicts that cause unpredictable parse behavior.
 * A separate grammar with a clear entry point is the correct tree-sitter pattern.
 *
 * Target: Salesforce API v67 (Summer '25)
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

"use strict";

const apexGrammar = require("../apex/grammar.js");

module.exports = grammar(apexGrammar, {
  name: "apex_anon",

  rules: {
    /**
     * Anonymous Apex entry point — zero or more top-level statements.
     *
     * This overrides apex/grammar.js's source_file rule which requires declarations.
     * All other rules (statement, expression, type, etc.) are inherited unchanged.
     *
     * Examples of valid anonymous scripts:
     *   System.debug('Hello');
     *   Account a = new Account(Name = 'Test');
     *   insert a;
     */
    source_file: ($) => repeat($.statement),
  },
});
