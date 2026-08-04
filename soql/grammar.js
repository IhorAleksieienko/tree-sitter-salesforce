/**
 * @file SOQL (Salesforce Object Query Language) grammar for tree-sitter
 * @description Parses SOQL queries used to retrieve data from Salesforce
 * @license MIT
 *
 * SOQL is a query language similar to SQL but designed specifically for
 * querying Salesforce objects (sObjects). Key differences from SQL:
 *   - No wildcard SELECT * (must list fields explicitly)
 *   - Relationship queries (parent.field, child subqueries)
 *   - TYPEOF for polymorphic relationships
 *   - Bind variables (:apexVariable)
 *   - Date literals (YESTERDAY, LAST_N_DAYS:5, etc.)
 *   - WITH clauses (WITH USER_MODE, WITH SECURITY_ENFORCED)
 *
 * Target: Salesforce API v67 (Summer '25)
 *
 * @see https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// ============================================================================
// GRAMMAR DEFINITION
// ============================================================================
// This is a PLACEHOLDER grammar. It will be replaced in Step 3 with the
// full SOQL grammar. For now, it just validates that tree-sitter can generate
// a parser from this file.
// ============================================================================

module.exports = grammar({
  // The `name` must match the "name" field in tree-sitter.json
  name: 'soql',

  rules: {
    // Placeholder entry point. Will be replaced with real SOQL grammar.
    source_file: $ => 'hello'
  }
});
