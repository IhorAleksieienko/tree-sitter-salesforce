/**
 * @file Apex language grammar for tree-sitter
 * @description Parses Salesforce Apex source code (.cls, .trigger files)
 * @license MIT
 *
 * Apex is a strongly-typed, object-oriented language that runs on the
 * Salesforce platform. It is syntactically similar to Java but includes
 * Salesforce-specific features like:
 *   - Inline SOQL/SOSL queries: [SELECT Id FROM Account]
 *   - DML statements: insert, update, delete, upsert, undelete, merge
 *   - Trigger definitions: trigger MyTrigger on Account (before insert) { }
 *   - Sharing keywords: with sharing, without sharing, inherited sharing
 *   - Salesforce annotations: @AuraEnabled, @IsTest, etc.
 *
 * Target: Salesforce API v67 (Summer '25)
 *
 * @see https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// ============================================================================
// GRAMMAR DEFINITION
// ============================================================================
// This is a PLACEHOLDER grammar. It will be replaced in Steps 4-6 with the
// full Apex grammar. For now, it just validates that tree-sitter can generate
// a parser from this file.
// ============================================================================

module.exports = grammar({
  // The `name` must match the "name" field in tree-sitter.json
  name: 'apex',

  rules: {
    // The first rule is always the "entry point" — what the parser expects at
    // the top level of a file. For Apex, this will eventually be class/trigger
    // declarations. For now, just match the word "hello".
    source_file: $ => 'hello'
  }
});
