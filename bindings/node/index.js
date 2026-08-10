/**
 * @file Node.js entry point for tree-sitter-salesforce
 * @description
 * This module exports the Apex and SOQL parsers for use with tree-sitter
 * in Node.js applications.
 *
 * Usage:
 *   const Parser = require('tree-sitter');
 *   const Salesforce = require('tree-sitter-salesforce');
 *
 *   const parser = new Parser();
 *
 *   // Parse Apex code
 *   parser.setLanguage(Salesforce.apex);
 *   const apexTree = parser.parse('public class T { }');
 *
 *   // Parse SOQL
 *   parser.setLanguage(Salesforce.soql);
 *   const soqlTree = parser.parse('SELECT Id FROM Account');
 */

let binding;
try {
  binding = require("node-gyp-build")(__dirname + "/../..");
} catch {
  binding = require("../../build/Release/tree_sitter_salesforce_binding.node");
}

// Export each parser.
// Usage: require('tree-sitter-salesforce').apex
module.exports = {
  /** Apex language parser */
  apex: binding.apex(),
  /** Anonymous Apex language parser */
  apexAnon: binding.apexAnon(),
  apex_anon: binding.apexAnon(),
  /** SOQL language parser */
  soql: binding.soql(),
  /** SOSL language parser */
  sosl: binding.sosl(),
  /** Formula language parser */
  formula: binding.formula(),
  /** Salesforce Debug Log parser */
  sflog: binding.sflog(),
};
