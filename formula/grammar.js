/**
 * @file Salesforce Formula Language grammar for tree-sitter
 * @description
 * Parses Salesforce declarative formula expressions used in:
 *   - Validation Rules
 *   - Formula Fields (number, text, date, checkbox, etc.)
 *   - Flow Decision Criteria
 *   - Process Builder conditions
 *
 * A formula is a single expression — there are no statements or declarations.
 * This grammar's source_file rule is simply $._expression.
 *
 * Key characteristics:
 *   - All function names are case-insensitive
 *   - Field references use dot-notation: Object.Parent.Field
 *   - Global context uses $ prefix: $User.ProfileId, $Organization.Id
 *   - String concatenation uses & (not +, which is numeric addition)
 *   - Equality comparison uses = (single equals, unlike Apex's ==)
 *   - No statements, no blocks, no declarations
 *
 * Target: Salesforce API v67 (Summer '25)
 *
 * @see https://developer.salesforce.com/docs/atlas.en-us.salesforce_formula.meta/salesforce_formula/
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

"use strict";

const { ci, commaJoined, commaJoined1 } = require("../common/common.js");

// ─── OPERATOR PRECEDENCE ───────────────────────────────────────────────────
// Formula Language operator precedence (lowest to highest)
// Based on: https://help.salesforce.com/s/articleView?id=sf.customize_formula_operators.htm
const PREC = {
  OR:          1,   // ||, OR(...)
  AND:         2,   // &&, AND(...)
  NOT:         3,   // !, NOT(...)
  COMPARE:     4,   // =, ==, <>, !=, <, <=, >, >=
  CONCAT:      5,   // & (string concatenation)
  ADD_SUB:     6,   // +, -
  MUL_DIV:     7,   // *, /
  POWER:       8,   // ^
  UNARY:       9,   // -(negative), +(positive)
  FIELD_PATH: 10,   // Object.Field.SubField (highest — tightest binding)
};

module.exports = grammar({
  name: "formula",

  extras: ($) => [/\s/],   // whitespace is insignificant in Formula Language

  rules: {
    // ─────────────────────────────────────────────────────────────────────────
    // ENTRY POINT
    // A formula is exactly one expression.
    // ─────────────────────────────────────────────────────────────────────────
    source_file: ($) => $._expression,

    // ─────────────────────────────────────────────────────────────────────────
    // EXPRESSION — all possible formula values
    // ─────────────────────────────────────────────────────────────────────────
    _expression: ($) => choice(
      $.function_call,
      $.global_variable,
      $.field_reference,
      $.binary_expression,
      $.unary_expression,
      $.parenthesized_expression,
      $.string_literal,
      $.number,
      $.boolean_literal,
      $.null_literal,
      $.date_literal,
    ),

    // ─────────────────────────────────────────────────────────────────────────
    // FUNCTION CALLS
    // IF(condition, true_val, false_val), ISBLANK(field), REGEX(field, pattern)
    // ─────────────────────────────────────────────────────────────────────────
    function_call: ($) => seq(
      field("name", $.function_name),
      "(",
      field("arguments", commaJoined($._expression)),
      ")"
    ),

    function_name: ($) => choice(
      // ── Logical functions ──────────────────────────────────────────────────
      ci("IF"), ci("IFS"), ci("CASE"),
      ci("AND"), ci("OR"), ci("NOT"), ci("XOR"),
      // ── Null and blank checks ─────────────────────────────────────────────
      ci("ISBLANK"), ci("ISNULL"), ci("BLANKVALUE"), ci("NULLVALUE"),
      // ── Picklist functions ────────────────────────────────────────────────
      ci("ISPICKVAL"), ci("ISPICKVALMULTISELECT"), ci("TEXT"), ci("VALUE"),
      ci("INCLUDES"), ci("EXCLUDES"),
      // ── Field change detection ────────────────────────────────────────────
      ci("ISCHANGED"), ci("ISNEW"), ci("PRIORVALUE"),
      // ── Math functions ────────────────────────────────────────────────────
      ci("ABS"), ci("CEILING"), ci("FLOOR"), ci("ROUND"), ci("MCEILING"),
      ci("MFLOOR"), ci("MAX"), ci("MIN"), ci("MOD"), ci("SQRT"), ci("EXP"),
      ci("LN"), ci("LOG"), ci("POWER"),
      // ── Text functions ────────────────────────────────────────────────────
      ci("LEFT"), ci("RIGHT"), ci("MID"), ci("LEN"), ci("TRIM"),
      ci("SUBSTITUTE"), ci("FIND"), ci("CONTAINS"), ci("BEGINS"),
      ci("UPPER"), ci("LOWER"), ci("PROPER"),
      ci("RPAD"), ci("LPAD"), ci("REVERSE"),
      // ── Date and time functions ────────────────────────────────────────────
      ci("DATE"), ci("DATEVALUE"), ci("DATETIMEVALUE"), ci("TIMEVALUE"),
      ci("TODAY"), ci("NOW"), ci("YEAR"), ci("MONTH"), ci("DAY"),
      ci("HOUR"), ci("MINUTE"), ci("SECOND"),
      ci("ADDMONTHS"), ci("WEEKDAY"),
      // ── Conversion functions ──────────────────────────────────────────────
      ci("TEXT"), ci("VALUE"), ci("DATEVALUE"), ci("DATETIMEVALUE"),
      // ── Lookup functions ──────────────────────────────────────────────────
      ci("VLOOKUP"),
      // ── Format functions ──────────────────────────────────────────────────
      ci("FORMAT"),
      // ── Regex ─────────────────────────────────────────────────────────────
      ci("REGEX"),
      // ── Hyperlink and image (text formula fields) ─────────────────────────
      ci("HYPERLINK"), ci("IMAGE"),
      // Fallback: any identifier (custom functions, future functions)
      $.identifier,
    ),

    // ─────────────────────────────────────────────────────────────────────────
    // BINARY EXPRESSIONS
    // ─────────────────────────────────────────────────────────────────────────
    binary_expression: ($) => choice(
      // Boolean logic
      prec.left(PREC.OR,       seq($._expression, "||",   $._expression)),
      prec.left(PREC.AND,      seq($._expression, "&&",   $._expression)),
      // Equality and comparison
      prec.left(PREC.COMPARE,  seq($._expression, "=",    $._expression)),
      prec.left(PREC.COMPARE,  seq($._expression, "==",   $._expression)),  // alias
      prec.left(PREC.COMPARE,  seq($._expression, "<>",   $._expression)),
      prec.left(PREC.COMPARE,  seq($._expression, "!=",   $._expression)),  // alias
      prec.left(PREC.COMPARE,  seq($._expression, "<",    $._expression)),
      prec.left(PREC.COMPARE,  seq($._expression, "<=",   $._expression)),
      prec.left(PREC.COMPARE,  seq($._expression, ">",    $._expression)),
      prec.left(PREC.COMPARE,  seq($._expression, ">=",   $._expression)),
      // String concatenation — & is NOT bitwise AND in Formula Language
      prec.left(PREC.CONCAT,   seq($._expression, "&",    $._expression)),
      // Arithmetic
      prec.left(PREC.ADD_SUB,  seq($._expression, "+",    $._expression)),
      prec.left(PREC.ADD_SUB,  seq($._expression, "-",    $._expression)),
      prec.left(PREC.MUL_DIV,  seq($._expression, "*",    $._expression)),
      prec.left(PREC.MUL_DIV,  seq($._expression, "/",    $._expression)),
      prec.right(PREC.POWER,   seq($._expression, "^",    $._expression)),
    ),

    unary_expression: ($) => prec(PREC.UNARY, choice(
      seq("!", field("operand", $._expression)),
      seq("-", field("operand", $._expression)),
      seq("+", field("operand", $._expression)),
    )),

    parenthesized_expression: ($) => seq("(", $._expression, ")"),

    // ─────────────────────────────────────────────────────────────────────────
    // FIELD REFERENCES
    // Account.BillingCity, Owner.Profile.Name, CreatedDate
    // ─────────────────────────────────────────────────────────────────────────
    field_reference: ($) => prec.left(PREC.FIELD_PATH, seq(
      $.identifier,
      repeat(seq(".", $.identifier))
    )),

    // ─────────────────────────────────────────────────────────────────────────
    // GLOBAL CONTEXT VARIABLES — $User, $Organization, $CustomMetadata
    // $User.ProfileId
    // $CustomMetadata.Config__mdt.Default.Value__c
    // ─────────────────────────────────────────────────────────────────────────
    global_variable: ($) => prec.left(PREC.FIELD_PATH, seq(
      "$",
      $.identifier,                     // $User, $Organization, $UserRole, etc.
      repeat(seq(".", $.identifier))    // .ProfileId, .Config__mdt.Record.Field__c
    )),

    // ─────────────────────────────────────────────────────────────────────────
    // LITERALS
    // ─────────────────────────────────────────────────────────────────────────
    string_literal: ($) => choice(
      /'([^'\\]|\\.)*'/,
      /"([^"\\]|\\.)*"/
    ),
    number: ($) => /[0-9]+(\.[0-9]+)?/,
    boolean_literal: ($) => choice(ci("true"), ci("false")),
    null_literal: ($) => ci("null"),
    date_literal: ($) => choice(ci("today"), ci("now")),

    // ─────────────────────────────────────────────────────────────────────────
    // IDENTIFIER
    // Can include underscores and end with __c (custom field suffix)
    // ─────────────────────────────────────────────────────────────────────────
    identifier: ($) => /[A-Za-z][A-Za-z\d_]*/,
  },
});
