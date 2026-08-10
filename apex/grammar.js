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
    $.primary_expression,
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
  conflicts: ($) => [
    [$.type_identifier, $.expression],
    [$.scoped_type_identifier, $.expression],
    [$.generic_type, $.expression],
    [$.type_identifier, $.scoped_type_identifier],
    [$.type_identifier, $.generic_type],
    [$.scoped_type_identifier, $.generic_type],
    [$._type, $.generic_type],
    [$.scoped_type_identifier],
  ],

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
      optional(field("type_parameters", $.type_parameters)),
      optional($.superclass),
      optional($.interfaces),
      field("body", $.class_body)
    ),

    /**
     * Superclass clause — extends keyword.
     * Example: extends TriggerHandler
     */
    superclass: ($) => seq(ci("extends"), $._type),

    /**
     * Implements clause — one or more interface names.
     * Example: implements Queueable, Database.Batchable<sObject>
     */
    interfaces: ($) => seq(ci("implements"), commaJoined1($._type)),

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
      $.method_declaration,
      $.constructor_declaration,
      $.property_declaration,
      $.class_declaration,      // Inner classes
      $.interface_declaration,  // Inner interfaces
      $.enum_declaration,       // Inner enums
      ";",  // Empty statement (allowed in class body)
    ),

    // --- Method, Constructor, Property ---
    method_declaration: ($) => seq(
      optional($.modifiers),
      optional(field("type_parameters", $.type_parameters)),
      field("type", $._type),
      field("name", $.identifier),
      field("parameters", $.formal_parameters),
      choice(field("body", $.block), ";")  // abstract methods have no body
    ),

    constructor_declaration: ($) => seq(
      optional($.modifiers),
      field("name", $.identifier),
      field("parameters", $.formal_parameters),
      field("body", $.block)
    ),

    property_declaration: ($) => seq(
      optional($.modifiers),
      field("type", $._type),
      field("name", $.identifier),
      "{",
      optional($.getter),
      optional($.setter),
      "}"
    ),

    getter: ($) => seq(optional($.modifiers), ci("get"), choice($.block, ";")),
    setter: ($) => seq(optional($.modifiers), ci("set"), choice($.block, ";")),

    formal_parameters: ($) => seq("(", optional(commaJoined1($.formal_parameter)), ")"),
    formal_parameter: ($) => seq(
      optional($.modifiers),
      field("type", $._type),
      field("name", $.identifier)
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
      optional(field("type_parameters", $.type_parameters)),
      optional(seq(ci("extends"), commaJoined1($._type))),
      field("body", $.interface_body)
    ),

    interface_body: ($) => seq(
      "{",
      repeat(choice(
        $.field_declaration,
        $.method_declaration,
        $.class_declaration,
        $.interface_declaration,
        $.enum_declaration,
        ";",
      )),
      "}"
    ),

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
    modifiers: ($) => repeat1(choice($.annotation, $.modifier)),

    annotation: ($) => seq(
      "@",
      field("name", $._name),
      optional(field("arguments", $.annotation_arguments))
    ),

    annotation_arguments: ($) => seq(
      "(",
      choice(
        $._literal,
        seq(
          $.annotation_key_value,
          repeat(seq(optional(","), $.annotation_key_value))
        )
      ),
      ")"
    ),

    annotation_key_value: ($) => seq(
      field("key", $.identifier),
      "=",
      field("value", $.expression)
    ),

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

    type_parameters: ($) => seq(
      "<", commaJoined1($.type_parameter), ">"
    ),

    type_parameter: ($) => seq(
      field("name", $.identifier),
      optional(seq(ci("extends"), field("bound", $._type)))
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
      $.assignment_expression,
      $.binary_expression,
      $.unary_expression,
      $.update_expression,
      $.ternary_expression,
      $.null_coalescing_expression,
      $.cast_expression,
      $.instanceof_expression,
      $.new_expression,
      $.method_invocation,
      $.field_access,
      $.array_access,
      $.soql_expression,
      $.sosl_expression,
    ),

    _lhs_expression: ($) => choice(
      $.identifier,
      $.field_access,
      $.array_access
    ),

    assignment_expression: ($) => prec.right(PREC.ASSIGN, seq(
      field("left", $._lhs_expression),
      choice("=", "+=", "-=", "*=", "/=", "%=", "&=", "^=", "|=", "<<=", ">>=", ">>>="),
      field("right", $.expression)
    )),

    binary_expression: ($) => choice(
      ...[
        ["||", PREC.OR],
        ["&&", PREC.AND],
        ["|", PREC.BIT_OR],
        ["^", PREC.BIT_XOR],
        ["&", PREC.BIT_AND],
        ["==", PREC.EQUALITY],
        ["!=", PREC.EQUALITY],
        ["<>", PREC.EQUALITY],
        ["===", PREC.EQUALITY],
        ["!==", PREC.EQUALITY],
        ["<", PREC.REL],
        ["<=", PREC.REL],
        [">", PREC.REL],
        [">=", PREC.REL],
        ["<<", PREC.SHIFT],
        [">>", PREC.SHIFT],
        [">>>", PREC.SHIFT],
        ["+", PREC.ADD],
        ["-", PREC.ADD],
        ["*", PREC.MULT],
        ["/", PREC.MULT],
        ["%", PREC.MULT],
      ].map(([operator, precedence]) =>
        prec.left(precedence, seq(
          field("left", $.expression),
          operator,
          field("right", $.expression)
        ))
      )
    ),

    unary_expression: ($) => prec.left(PREC.UNARY, seq(
      choice("+", "-", "!", "~"),
      $.expression
    )),

    update_expression: ($) => prec.left(PREC.UNARY, choice(
      seq(choice("++", "--"), $.expression),
      seq($.expression, choice("++", "--"))
    )),

    ternary_expression: ($) => prec.right(PREC.TERNARY, seq(
      field("condition", $.expression),
      "?",
      field("consequence", $.expression),
      ":",
      field("alternative", $.expression)
    )),

    null_coalescing_expression: ($) => prec.right(PREC.NULL_COALESCE, seq(
      field("left", $.expression),
      "??",
      field("right", $.expression)
    )),

    cast_expression: ($) => prec.right(PREC.CAST, seq(
      "(", field("type", $._type), ")", field("value", $.expression)
    )),

    instanceof_expression: ($) => prec.left(PREC.REL, seq(
      field("left", $.expression),
      ci("instanceof"),
      field("right", $._type)
    )),

    new_expression: ($) => prec.right(PREC.OBJ_INST, seq(
      ci("new"),
      field("type", $._type),
      choice(
        field("arguments", $.argument_list),
        $.array_initializer,
        field("initializer", $.map_initializer),
      )
    )),

    argument_list: ($) => seq("(", optional(commaJoined1($.expression)), ")"),
    
    array_initializer: ($) => seq("{", optional(commaJoined1($.expression)), "}"),

    map_initializer: ($) => seq(
      "{",
      commaJoined1($.map_key_initializer),
      optional(","),
      "}"
    ),

    map_key_initializer: ($) => seq(
      field("key", $.expression),
      "=>",
      field("value", $.expression)
    ),

    method_invocation: ($) => prec.left(PREC.OBJ_ACCESS, seq(
      optional(seq(field("object", $.expression), choice(".", "?."))),
      field("name", $.identifier),
      field("arguments", $.argument_list)
    )),

    field_access: ($) => prec.left(PREC.OBJ_ACCESS, seq(
      field("object", $.expression),
      choice(".", "?."),
      field("field", $.identifier)
    )),

    array_access: ($) => prec.left(PREC.ARRAY, seq(
      field("array", $.expression),
      "[",
      field("index", $.expression),
      "]"
    )),

    /**
     * Inline SOQL expression — the [SELECT ... FROM ...] construct inside Apex.
     *
     * Uses balanced-bracket parsing via the private _soql_content rule so that
     * nested subqueries and expressions do not prematurely terminate the node.
     *
     * The _soql_content rule is private (underscore prefix) so it is inlined by
     * tree-sitter and never appears as a named node in the AST. Only
     * soql_expression is visible to consumers and injection rules.
     *
     * Examples:
     *   [SELECT Id FROM Account]
     *   [SELECT Id, (SELECT Name FROM Contacts) FROM Account]
     *   [SELECT Id FROM Account WHERE Id IN :idList]
     */
    soql_expression: ($) => seq(
      "[",
      field("query", seq(ci("select"), optional($._soql_content))),
      "]"
    ),

    /**
     * Inline SOSL expression — the [FIND ... RETURNING ...] construct inside Apex.
     *
     * Shares the same balanced-bracket content rule as soql_expression.
     * The SOSL grammar (Step 12) is injected into this node via injections.scm.
     *
     * Example:
     *   [FIND 'SearchTerm' IN ALL FIELDS RETURNING Account(Name)]
     */
    sosl_expression: ($) => seq(
      "[",
      field("query", seq(ci("find"), optional($._sosl_content))),
      "]"
    ),

    /**
     * Balanced bracket content — used inside soql_expression and sosl_expression.
     *
     * Matches any sequence of:
     *   - Characters that are NOT square brackets
     *   - Nested bracket pairs (for subqueries like `(SELECT ... FROM ...)`)
     *     Note: parentheses, not brackets, are used for SOQL subqueries.
     *     Square brackets can appear in bind variable map access: :myMap['key']
     *
     * WHY NOT USE A SIMPLE REGEX?
     * A regex cannot handle balanced delimiters. The grammar rule recurses to
     * handle any depth of nesting correctly without a hard limit.
     */
    _soql_content: ($) => repeat1(
      choice(
        /[^\[\]]+/,                       // any non-bracket characters
        seq("[", optional($._soql_content), "]")  // nested bracket pair
      )
    ),

    _sosl_content: ($) => $._soql_content,

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
    int: ($) => token(/[0-9]+(_[0-9]+)*/),
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
      $.if_statement,
      $.for_statement,
      $.enhanced_for_statement,
      $.while_statement,
      $.do_while_statement,
      $.switch_statement,
      $.try_statement,
      $.return_statement,
      $.break_statement,
      $.continue_statement,
      $.throw_statement,
      $.dml_statement,
    ),

    if_statement: ($) => prec.right(seq(
      ci("if"), "(", field("condition", $.expression), ")",
      field("consequence", $.statement),
      optional(seq(ci("else"), field("alternative", $.statement)))
    )),

    for_statement: ($) => seq(
      ci("for"), "(",
      field("init", choice($.local_variable_declaration, seq(optional(commaJoined1($.expression)), ";"))),
      field("condition", optional($.expression)), ";",
      field("update", optional(commaJoined1($.expression))),
      ")",
      field("body", $.statement)
    ),

    enhanced_for_statement: ($) => seq(
      ci("for"), "(",
      field("type", $._type),
      field("name", $.identifier),
      ":",
      field("value", $.expression),
      ")",
      field("body", $.statement)
    ),

    while_statement: ($) => seq(
      ci("while"), "(", field("condition", $.expression), ")",
      field("body", $.statement)
    ),

    do_while_statement: ($) => seq(
      ci("do"), field("body", $.statement),
      ci("while"), "(", field("condition", $.expression), ")", ";"
    ),

    switch_statement: ($) => seq(
      ci("switch on"), field("condition", $.expression), "{",
      repeat($.when_clause),
      optional($.when_else_clause),
      "}"
    ),
    
    /**
     * When clause — a single branch in a switch statement.
     *
     * Two forms are supported:
     *
     * 1. SOBJECT TYPE PATTERN (one or more):
     *    when Account a { }                  (single type)
     *    when Account a, Contact c { }       (multiple types — Salesforce extension)
     *
     * 2. LITERAL/ENUM PATTERN:
     *    when 'a', 'b', 'c' { }     (string literals)
     *    when 1, 2, 3 { }           (integer literals)
     *    when MyEnum.Value1 { }     (enum values)
     *
     * WHY prec(1) ON when_type_pattern?
     * Both forms start with an expression-like token. Without a precedence hint,
     * tree-sitter would try both alternatives and could produce an ambiguous parse.
     * Giving type patterns higher priority ensures `Account a` is always parsed as
     * a type+name pair, not as two expressions (`Account`, `a`).
     */
    when_clause: ($) => seq(
      ci("when"),
      choice(
        commaJoined1($.when_type_pattern),   // SObject type patterns (higher priority)
        commaJoined1($.expression),          // Literal and enum patterns
      ),
      field("body", $.block)
    ),

    /**
     * A single SObject type pattern inside a when clause.
     *
     * Syntax: TypeName variableName
     *
     * Examples:
     *   Account a
     *   Contact c
     *   Opportunity opp
     *
     * The variable name is bound within the when block body and can be used
     * directly without a cast.
     */
    when_type_pattern: ($) => prec(1, seq(
      field("type", $._type),
      field("name", $.identifier)
    )),

    when_else_clause: ($) => seq(
      ci("when else"), field("body", $.block)
    ),

    try_statement: ($) => seq(
      ci("try"), field("body", $.block),
      repeat($.catch_clause),
      optional($.finally_clause)
    ),

    catch_clause: ($) => seq(
      ci("catch"), "(", $.catch_formal_parameter, ")", field("body", $.block)
    ),

    catch_formal_parameter: ($) => seq(
      optional($.modifiers), field("type", $._type), field("name", $.identifier)
    ),

    finally_clause: ($) => seq(ci("finally"), field("body", $.block)),

    return_statement: ($) => seq(ci("return"), optional($.expression), ";"),
    throw_statement: ($) => seq(ci("throw"), $.expression, ";"),
    break_statement: ($) => seq(ci("break"), ";"),
    continue_statement: ($) => seq(ci("continue"), ";"),

    dml_statement: ($) => seq($.dml_type, $.expression, optional($.expression), ";"),
    dml_type: ($) => choice(
      ci("insert"), ci("update"), ci("upsert"),
      ci("delete"), ci("undelete"), ci("merge")
    ),

    expression_statement: ($) => seq(
      choice(
        $.assignment_expression,
        $.update_expression,
        $.method_invocation,
        $.new_expression
      ),
      ";"
    ),

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
