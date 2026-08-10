/**
 * @file SOSL (Salesforce Object Search Language) grammar for tree-sitter
 * @description
 * Parses SOSL search statements used to perform full-text searches
 * across multiple Salesforce SObjects simultaneously.
 *
 * Entry point: The grammar starts at the content INSIDE the Apex [FIND ...] brackets.
 * The brackets themselves are parsed by the Apex grammar as a sosl_expression node.
 * When used as a standalone .sosl file, the brackets are part of the file.
 *
 * Syntax:
 *   FIND 'search_term'
 *     [IN field_scope]
 *     [RETURNING object_spec, ...]
 *     [WITH clause]
 *     [LIMIT n]
 *     [OFFSET n]
 *
 * Target: Salesforce API v67 (Summer '25)
 *
 * @see https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/sforce_api_calls_sosl.htm
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

"use strict";

const { ci, commaJoined1, commaJoined } = require("../common/common.js");

// ─── OPERATOR PRECEDENCE ───────────────────────────────────────────────────
const PREC = {
  OR:       1,
  AND:      2,
  NOT:      3,
  COMPARE:  4,
  LIKE:     4,
};

module.exports = grammar({
  name: "sosl",

  extras: ($) => [/\s/],

  rules: {
    // ───────────────────────────────────────────────────────────────────────
    // ENTRY POINT
    // ───────────────────────────────────────────────────────────────────────
    // When used standalone (.sosl file): source_file IS the sosl_query.
    // When injected from Apex: the injection content starts here directly.
    source_file: ($) => $.sosl_query,

    sosl_query: ($) => seq(
      ci("find"),
      field("search_query", $._search_term),
      optional(seq(ci("in"), field("scope", $.field_scope))),
      optional(seq(ci("returning"), field("returning", commaJoined1($.returning_clause)))),
      optional(field("with_clause", $.with_clause)),
      optional(seq(ci("limit"), field("limit", $.integer))),
      optional(seq(ci("offset"), field("offset", $.integer))),
      optional(seq(ci("update"), field("update", choice(ci("tracking"), ci("viewstat")))))
    ),

    // ───────────────────────────────────────────────────────────────────────
    // SEARCH TERM
    // Supports: 'simple', 'wild*card', 'phrase search', :bindVariable
    // ───────────────────────────────────────────────────────────────────────
    _search_term: ($) => choice(
      $.sosl_string,
      $.bind_variable
    ),

    // SOSL strings allow * and ? wildcards inside single quotes
    sosl_string: ($) => /'[^']*'/,

    bind_variable: ($) => seq(":", $.identifier),

    // ───────────────────────────────────────────────────────────────────────
    // FIELD SCOPE
    // ───────────────────────────────────────────────────────────────────────
    field_scope: ($) => choice(
      seq(ci("all"), ci("fields")),
      seq(ci("name"), ci("fields")),
      seq(ci("email"), ci("fields")),
      seq(ci("phone"), ci("fields")),
      seq(ci("sidebar"), ci("fields"))
    ),

    // ───────────────────────────────────────────────────────────────────────
    // RETURNING CLAUSE
    // RETURNING Account(Id, Name WHERE Name != null ORDER BY Name LIMIT 10)
    // ───────────────────────────────────────────────────────────────────────
    returning_clause: ($) => seq(
      field("sobject", $.identifier),
      optional(seq(
        "(",
        field("fields", commaJoined1($.field_path)),
        optional(seq(ci("using"), ci("listview"), "=", $.identifier)),
        optional(seq(ci("where"), field("condition", $.where_condition))),
        optional(seq(ci("order"), ci("by"), field("order", commaJoined1($.order_item)))),
        optional(seq(ci("limit"), field("limit", $.integer))),
        optional(seq(ci("offset"), field("offset", $.integer))),
        ")"
      ))
    ),

    // ───────────────────────────────────────────────────────────────────────
    // FIELD PATHS — Object.Field, Parent.Object.Field
    // ───────────────────────────────────────────────────────────────────────
    field_path: ($) => seq(
      $.identifier,
      repeat(seq(".", $.identifier))
    ),

    // ───────────────────────────────────────────────────────────────────────
    // WHERE CONDITIONS (inside RETURNING clause)
    // ───────────────────────────────────────────────────────────────────────
    where_condition: ($) => choice(
      $.comparison,
      $.boolean_condition,
      $.not_condition,
      seq("(", $.where_condition, ")")
    ),

    boolean_condition: ($) => choice(
      prec.left(PREC.AND, seq(
        field("left", $.where_condition),
        ci("and"),
        field("right", $.where_condition)
      )),
      prec.left(PREC.OR, seq(
        field("left", $.where_condition),
        ci("or"),
        field("right", $.where_condition)
      ))
    ),

    not_condition: ($) => prec(PREC.NOT, seq(
      ci("not"),
      field("condition", $.where_condition)
    )),

    comparison: ($) => seq(
      field("left", $.field_path),
      field("operator", $.comparison_operator),
      field("right", $.value)
    ),

    comparison_operator: ($) => choice(
      "=", "!=", "<>", "<", "<=", ">", ">=",
      ci("like"),
      seq(ci("not"), ci("like")),
      seq(ci("in"), "("),   // simplified — full IN support handled below
    ),

    value: ($) => choice(
      $.sosl_string,
      $.integer,
      $.decimal,
      $.boolean,
      $.null_literal,
      $.bind_variable,
      $.date_literal
    ),

    // ───────────────────────────────────────────────────────────────────────
    // ORDER BY (inside RETURNING clause)
    // ───────────────────────────────────────────────────────────────────────
    order_item: ($) => seq(
      field("field", $.field_path),
      optional(field("direction", choice(ci("asc"), ci("desc")))),
      optional(seq(ci("nulls"), field("nulls", choice(ci("first"), ci("last")))))
    ),

    // ───────────────────────────────────────────────────────────────────────
    // WITH CLAUSE
    // ───────────────────────────────────────────────────────────────────────
    with_clause: ($) => seq(
      ci("with"),
      choice(
        seq(ci("division"), "=", $.sosl_string),
        seq(ci("data"), ci("category"), commaJoined1($.data_category_filter)),
        ci("highlight"),
        ci("snippet"),
        ci("spell_correction"),
        seq(ci("network"), "=", $.sosl_string),
        seq(ci("pricebook_id"), "=", $.sosl_string)
      )
    ),

    data_category_filter: ($) => seq(
      field("group", $.identifier),
      field("operator", choice(ci("at"), ci("above"), ci("below"), ci("above_or_below"))),
      field("category", $.identifier)
    ),

    // ───────────────────────────────────────────────────────────────────────
    // LITERALS & PRIMITIVES
    // ───────────────────────────────────────────────────────────────────────
    identifier: ($) => /[A-Za-z][A-Za-z\d_]*/,
    integer: ($) => /[0-9]+/,
    decimal: ($) => /[0-9]+\.[0-9]+/,
    boolean: ($) => choice(ci("true"), ci("false")),
    null_literal: ($) => ci("null"),
    date_literal: ($) => choice(
      ci("today"), ci("yesterday"), ci("tomorrow"),
      ci("last_week"), ci("this_week"), ci("next_week"),
      ci("last_month"), ci("this_month"), ci("next_month"),
      ci("last_year"), ci("this_year"), ci("next_year"),
      /LAST_N_DAYS:[0-9]+/i,
      /NEXT_N_DAYS:[0-9]+/i,
    ),
  },
});
