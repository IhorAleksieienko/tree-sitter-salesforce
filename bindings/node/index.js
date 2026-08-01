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

// node-gyp-build automatically finds the correct prebuilt binary for
// the current platform (windows/mac/linux) and architecture (x64/arm64).
// If no prebuilt is found, it falls back to building from source.
const binding = require("node-gyp-build")(__dirname + "/../..");

// Export each parser.
// Usage: require('tree-sitter-salesforce').apex
module.exports = {
  /** Apex language parser */
  apex: binding.apex(),
  /** SOQL language parser */
  soql: binding.soql(),
};
