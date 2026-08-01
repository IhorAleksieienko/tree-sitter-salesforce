/**
 * @file Apex language grammar for tree-sitter — Core Structure
 * @description
 * Parses Salesforce Apex source code (.cls, .trigger files).
 *
 * This grammar covers:
 *   - Class, Interface, Enum, Trigger declarations
 *   - Type system (primitives, sObjects, generics, collections)
 *   - Access modifiers and sharing keywords
 *   - Field declarations
 *   - Basic expressions (literals, identifiers, member access)
 *   - Comments (line and block)
 *
 * Statements, methods, control flow, and annotations are added in Steps 5-6.
 *
 * Architecture note: This grammar is structured so that its rules can be
 * extracted to `common/apex-rules.js` in the future, enabling Anonymous Apex
 * as a separate grammar with a different entry point.
 *
 * Target: Salesforce API v67 (Summer '25)
 *
 * @see https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

"use strict";

const {
  ci,
  commaJoined,
  commaJoined1,
  joined,
} = require("../common/common.js");

const {
  PRIMITIVE_TYPES,
  COLLECTION_TYPES,
  VOID_TYPE,
} = require("../common/salesforce-types.js");

// ============================================================================
// OPERATOR PRECEDENCE TABLE
// ============================================================================
// Apex operator precedence, from lowest (1) to highest (18).
// Matches the official Salesforce documentation:
// https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/
//   langCon_apex_expressions_operators_precedence.htm
//
// WHY DEFINE THIS?
// When tree-sitter encounters an ambiguous expression like `a + b * c`,
// it needs to know that * binds tighter than +. We encode this via the
// `prec.left()` and `prec.right()` functions in grammar rules.
// ============================================================================
const PREC = {
  COMMENT: 0,       // //  /*  */
  ASSIGN: 1,        // =  +=  -=  *=  /=  %=  &=  ^=  |=  <<=  >>=  >>>=
  ELEMENT_VAL: 2,   // Element value in annotations
  TERNARY: 3,       // ? :
  NULL_COALESCE: 4, // ?? (API v59+)
  OR: 5,            // ||
  AND: 6,           // &&
  BIT_OR: 7,        // |
  BIT_XOR: 8,       // ^
  BIT_AND: 9,       // &
  EQUALITY: 10,     // ==  !=  <>
  REL: 11,          // <  <=  >  >=  instanceof
  SHIFT: 12,        // <<  >>  >>>
  ADD: 13,          // +  -
  MULT: 14,         // *  /  %
  CAST: 15,         // (Type)
  OBJ_INST: 15,     // new
  UNARY: 16,        // ++a  --a  a++  a--  +  -  !  ~
  ARRAY: 17,        // [Index]
  OBJ_ACCESS: 17,   // .  ?.
  PARENS: 18,       // (Expression)
};

// ============================================================================
// GRAMMAR DEFINITION
// ============================================================================

module.exports = grammar({
  name: "apex",

  // ---------------------------------------------------------------------------
  // EXTRAS — tokens that can appear anywhere (whitespace, comments)
  // ---------------------------------------------------------------------------
  extras: ($) => [$.line_comment, $.block_comment, /\s/],

  // ---------------------------------------------------------------------------
  // SUPERTYPES — abstract node categories
  // ---------------------------------------------------------------------------
  // Supertypes create abstract categories in the node-types.json file.
  // They help consumers understand that, for example, `class_declaration`,
  // `interface_declaration`, and `enum_declaration` are all types of
  // "declaration". This is purely informational — it doesn't affect parsing.
  // ---------------------------------------------------------------------------
  supertypes: ($) => [
    $.expression,
    $.declaration,
    $.statement,
    $._type,
  ],

  // ---------------------------------------------------------------------------
  // INLINE — rules that are replaced with their definition
  // ---------------------------------------------------------------------------
  // These rules exist in the grammar for readability but are "inlined" by
  // tree-sitter. Their nodes never appear in the syntax tree — they're replaced
  // by their children. This keeps the tree cleaner.
  // ---------------------------------------------------------------------------
  inline: ($) => [
    $._name,
    $._class_body_declaration,
    $._variable_initializer,
  ],

  // ---------------------------------------------------------------------------
  // WORD — the keyword extraction rule
  // ---------------------------------------------------------------------------
  // Tree-sitter uses this to optimize keyword matching. When the parser sees
  // a word token, it first checks if it's a keyword (class, if, return, etc.)
  // before falling back to the general `identifier` rule.
  // ---------------------------------------------------------------------------
  word: ($) => $.identifier,

  // ---------------------------------------------------------------------------
  // CONFLICTS — known ambiguities
  // ---------------------------------------------------------------------------
  // These tell tree-sitter that certain rule combinations are intentionally
  // ambiguous, and it should use GLR parsing to try all possibilities.
  // ---------------------------------------------------------------------------
  conflicts: ($) => [],

  // ---------------------------------------------------------------------------
  // RULES
  // ---------------------------------------------------------------------------
  rules: {
    // =========================================================================
    // ENTRY POINT
    // =========================================================================

    /**
     * The root rule — an Apex file contains one or more declarations.
     *
     * A .cls file typically contains exactly one top-level class or interface.
     * A .trigger file contains exactly one trigger declaration.
     *
     * Examples:
     *   // .cls file:
     *   public class AccountService { ... }
     *
     *   // .trigger file:
     *   trigger AccountTrigger on Account (before insert) { ... }
     */
    source_file: ($) => repeat($.declaration),

    // =========================================================================
    // DECLARATIONS
    // =========================================================================

    /**
     * A declaration is any top-level or nested construct that defines
     * a named entity: class, interface, enum, or trigger.
     */
    declaration: ($) => choice(
      $.class_declaration,
      $.interface_declaration,
      $.enum_declaration,
      $.trigger_declaration,
    ),

    // --- Class Declaration ---

    /**
     * Class declaration — the primary construct in Apex.
     *
     * Full syntax:
     *   [modifiers] class ClassName [extends SuperClass]
     *     [implements Interface1, Interface2] { body }
     *
     * Examples:
     *   public class AccountService { }
     *   public with sharing class SecureService extends BaseService
     *     implements Queueable { }
     *   global abstract class AbstractHandler { }
     */
    class_declaration: ($) => seq(
      optional($.modifiers),
      ci("class"),
      field("name", $.identifier),
      optional($.superclass),
      optional($.interfaces),
      field("body", $.class_body)
    ),

    /**
     * Superclass clause — extends keyword.
     * Example: extends TriggerHandler
     */
    superclass: ($) => seq(ci("extends"), $.type_identifier),

    /**
     * Implements clause — one or more interface names.
     * Example: implements Queueable, Database.Batchable
     */
    interfaces: ($) => seq(ci("implements"), commaJoined1($.type_identifier)),

    /**
     * Class body — contains field declarations, methods, inner classes, etc.
     */
    class_body: ($) => seq(
      "{",
      repeat($._class_body_declaration),
      "}"
    ),

    /**
     * Items that can appear inside a class body.
     */
    _class_body_declaration: ($) => choice(
      $.field_declaration,
      $.class_declaration,      // Inner classes
      $.interface_declaration,  // Inner interfaces
      $.enum_declaration,       // Inner enums
      // Methods, constructors, properties added in Step 5
      ";",  // Empty statement (allowed in class body)
    ),

    // --- Interface Declaration ---

    /**
     * Interface declaration.
     *
     * Example:
     *   public interface Notifiable {
     *     void notify(String message);
     *   }
     */
    interface_declaration: ($) => seq(
      optional($.modifiers),
      ci("interface"),
      field("name", $.identifier),
      optional(seq(ci("extends"), commaJoined1($.type_identifier))),
      field("body", $.interface_body)
    ),

    interface_body: ($) => seq("{", repeat(choice($.field_declaration, ";")), "}"),

    // --- Enum Declaration ---

    /**
     * Enum declaration — defines a fixed set of constants.
     *
     * Example:
     *   public enum Season { SPRING, SUMMER, FALL, WINTER }
     */
    enum_declaration: ($) => seq(
      optional($.modifiers),
      ci("enum"),
      field("name", $.identifier),
      field("body", $.enum_body)
    ),

    enum_body: ($) => seq(
      "{",
      optional(seq(
        $.enum_constant,
        repeat(seq(",", $.enum_constant)),
        optional(",")  // Trailing comma is allowed
      )),
      "}"
    ),

    enum_constant: ($) => $.identifier,

    // --- Trigger Declaration ---

    /**
     * Trigger declaration — Apex-specific construct for database event handling.
     *
     * Triggers fire automatically when DML operations occur on sObjects.
     * They CANNOT be called directly; they're invoked by the Salesforce platform.
     *
     * Syntax:
     *   trigger TriggerName on SObjectName (event1, event2, ...) { body }
     *
     * Valid events: before insert, after insert, before update, after update,
     *               before delete, after delete, after undelete
     *
     * Example:
     *   trigger AccountTrigger on Account (before insert, after insert) {
     *     // trigger logic
     *   }
     */
    trigger_declaration: ($) => seq(
      ci("trigger"),
      field("name", $.identifier),
      ci("on"),
      field("object", $.identifier),
      "(",
      commaJoined1($.trigger_event),
      ")",
      field("body", $.trigger_body)
    ),

    /**
     * Trigger event — combines timing (before/after) with DML operation.
     */
    trigger_event: ($) => seq(
      choice(ci("before"), ci("after")),
      choice(ci("insert"), ci("update"), ci("delete"), ci("undelete"))
    ),

    trigger_body: ($) => seq("{", repeat($.statement), "}"),

    // =========================================================================
    // MODIFIERS
    // =========================================================================

    /**
     * Modifiers — zero or more keywords that modify a declaration or member.
     *
     * Apex modifiers include:
     *   Access: public, private, protected, global
     *   Sharing: with sharing, without sharing, inherited sharing
     *   Other: static, final, override, virtual, abstract, transient, testMethod
     *
     * These are case-insensitive in Apex.
     */
    modifiers: ($) => repeat1($.modifier),

    modifier: ($) => choice(
      // Access modifiers
      ci("public"),
      ci("private"),
      ci("protected"),
      ci("global"),        // Apex-specific: visible across namespaces
      // Sharing modifiers (Apex-specific: control record-level security)
      ci("with sharing"),
      ci("without sharing"),
      ci("inherited sharing"),
      // Other modifiers
      ci("static"),
      ci("final"),
      ci("override"),
      ci("virtual"),       // Apex-specific: class/method can be extended/overridden
      ci("abstract"),
      ci("transient"),     // Apex-specific: field not serialized in Visualforce
      ci("testMethod"),    // Deprecated: use @IsTest annotation instead
    ),

    // =========================================================================
    // TYPE SYSTEM
    // =========================================================================

    /**
     * Type reference — used in variable declarations, method signatures, etc.
     * This is a hidden rule; one of its alternatives appears in the tree.
     */
    _type: ($) => choice(
      $.type_identifier,
      $.generic_type,
      $.array_type,
      $.void_type,
    ),

    /**
     * Type identifier — a simple or dotted type name.
     *
     * Examples:
     *   String              (primitive type)
     *   Account             (sObject type)
     *   Database.Batchable  (namespaced type)
     *   My_Custom__c        (custom sObject)
     */
    type_identifier: ($) => choice(
      $.identifier,
      $.scoped_type_identifier,
    ),

    /**
     * Scoped type — a dot-separated type path.
     *
     * Examples:
     *   Database.Batchable
     *   System.Label
     *   Schema.SObjectField
     */
    scoped_type_identifier: ($) => seq(
      $.identifier, repeat1(seq(".", $.identifier))
    ),

    /**
     * Generic type — a type with type parameters.
     *
     * Apex supports generics only for collection types (List, Set, Map)
     * and some system types (Iterable, Iterator).
     *
     * Examples:
     *   List<Account>
     *   Map<String, List<Contact>>
     *   Set<Id>
     */
    generic_type: ($) => seq(
      $.type_identifier,
      $.type_arguments
    ),

    type_arguments: ($) => seq(
      "<", commaJoined1($._type), ">"
    ),

    /**
     * Array type — Apex supports Java-style array syntax.
     *
     * Examples:
     *   String[]
     *   Account[]
     *   Integer[]
     *
     * Note: In practice, List<String> is preferred over String[] in Apex,
     * but both syntaxes are valid and must be parsed.
     */
    array_type: ($) => seq($._type, "[", "]"),

    /**
     * Void type — used as return type for methods that don't return a value.
     */
    void_type: ($) => ci("void"),

    // =========================================================================
    // FIELD DECLARATIONS
    // =========================================================================

    /**
     * Field declaration — a variable defined at the class level.
     *
     * Examples:
     *   private String name;
     *   public static Integer count = 0;
     *   private final Boolean IS_ACTIVE = true;
     *   List<Account> accounts = new List<Account>();
     */
    field_declaration: ($) => seq(
      optional($.modifiers),
      field("type", $._type),
      commaJoined1($.variable_declarator),
      ";"
    ),

    /**
     * Variable declarator — name with optional initializer.
     *
     * Examples:
     *   name                  (no initializer)
     *   count = 0             (with initializer)
     *   IS_ACTIVE = true      (with literal initializer)
     */
    variable_declarator: ($) => seq(
      field("name", $.identifier),
      optional(seq("=", field("value", $._variable_initializer)))
    ),

    _variable_initializer: ($) => $.expression,

    // =========================================================================
    // EXPRESSIONS
    // =========================================================================

    /**
     * Expression supertype — encompasses all possible expressions.
     * This will be expanded significantly in Steps 5-6.
     */
    expression: ($) => choice(
      $.primary_expression,
      // Binary, unary, ternary, assignment, etc. added in Steps 5-6
    ),

    /**
     * Primary expression — the simplest expressions.
     */
    primary_expression: ($) => choice(
      $.identifier,
      $._literal,
      $.this,
      $.super,
      $.parenthesized_expression,
    ),

    this: ($) => ci("this"),
    super: ($) => ci("super"),

    parenthesized_expression: ($) => seq("(", $.expression, ")"),

    // =========================================================================
    // LITERALS
    // =========================================================================

    _literal: ($) => choice(
      $.int,
      $.decimal,
      $.string_literal,
      $.boolean,
      $.null_literal,
    ),

    string_literal: ($) => /'(\\[nNrRtTbBfFuU"'_%\\]|[^\\'])*'/,
    int: ($) => token(joined(/_+/, /[0-9]+/)),
    decimal: ($) => /\d+\.\d+/,
    boolean: ($) => choice(ci("true"), ci("false")),
    null_literal: ($) => ci("null"),

    // =========================================================================
    // STATEMENTS (Placeholder — expanded in Step 5)
    // =========================================================================

    /**
     * Statement supertype — placeholder for Step 5.
     * Currently only allows expression statements and blocks.
     */
    statement: ($) => choice(
      $.expression_statement,
      $.block,
      $.local_variable_declaration,
    ),

    expression_statement: ($) => seq($.expression, ";"),

    block: ($) => seq("{", repeat($.statement), "}"),

    /**
     * Local variable declaration — inside a method or block.
     *
     * Example:
     *   String name = 'hello';
     *   Integer count = 0;
     */
    local_variable_declaration: ($) => seq(
      optional($.modifiers),
      field("type", $._type),
      commaJoined1($.variable_declarator),
      ";"
    ),

    // =========================================================================
    // IDENTIFIERS
    // =========================================================================

    /**
     * Identifier — matches class names, field names, method names, etc.
     * Must start with a letter, can contain letters, digits, and underscores.
     */
    identifier: ($) => /[A-Za-z][A-Za-z\d_]*/,

    _name: ($) => choice($.identifier, $.scoped_type_identifier),

    // =========================================================================
    // COMMENTS
    // =========================================================================

    /**
     * Comment supertype — both line and block comments.
     */
    comment: ($) => choice($.line_comment, $.block_comment),

    /**
     * Line comment — starts with // and continues to end of line.
     * Example: // This is a comment
     */
    line_comment: ($) => seq("//", /.*/),

    /**
     * Block comment — starts with /* and ends with *\/.
     * Can span multiple lines. Also used for JavaDoc (/** ... *\/).
     *
     * Example:
     *   /* multi-line
     *      comment *\/
     *
     *   /**
     *    * @description JavaDoc comment
     *    *\/
     */
    block_comment: ($) => seq(
      "/*",
      /[^*]*\*+([^/*][^*]*\*+)*/,
      "/"
    ),
  },
});
