/**
 * @file Salesforce Debug Log grammar for tree-sitter
 * @description
 * Parses Salesforce Server Execution Debug Logs (.log files produced by
 * Developer Console, Apex test execution, and CLI log streaming/tailing).
 *
 * Target: Salesforce API v67 (Summer '25)
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

"use strict";

module.exports = grammar({
  name: "sflog",

  extras: ($) => [
    /[ \t\r]/,
    /\n/,
  ],

  conflicts: ($) => [
    [$.limit_usage_for_ns_block],
  ],

  rules: {
    /**
     * Top-level entry point for a Salesforce execution debug log.
     */
    source_file: ($) => seq(
      optional($.log_header),
      repeat(
        choice(
          $.limit_usage_section,
          $.event_line,
          $.stack_trace_line,
          $.raw_line,
        )
      )
    ),

    // ─────────────────────────────────────────────────────────────────────────
    // LOG HEADER
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Header line containing API version and category log filters.
     * Example:
     *   67.0 APEX_CODE,FINEST;APEX_PROFILING,INFO;CALLOUT,INFO;DB,INFO;SYSTEM,DEBUG;VALIDATION,INFO
     */
    log_header: ($) => seq(
      field("version", $.api_version),
      repeat1($.category_filter)
    ),

    api_version: ($) => token(/\d+\.\d+/),

    category_filter: ($) => seq(
      field("category", $.category_identifier),
      ",",
      field("level", $.log_level),
      optional(";")
    ),

    category_identifier: ($) => token(/[A-Z_]+/),

    log_level: ($) => choice(
      "NONE",
      "ERROR",
      "WARN",
      "INFO",
      "DEBUG",
      "FINE",
      "FINER",
      "FINEST"
    ),

    // ─────────────────────────────────────────────────────────────────────────
    // TIMESTAMPS & COMMON TOKENS
    // ─────────────────────────────────────────────────────────────────────────
    timestamp: ($) => token(/\d{2}:\d{2}:\d{2}\.\d{3}/),
    nanoseconds: ($) => token(/\(\d+\)/),
    line_reference: ($) => token(/\[\d+\]/),
    frame_identifier: ($) => token(/\[[A-Za-z0-9_]+\]/),
    default_namespace: ($) => token(/\(default\)/),
    number: ($) => token(/\d+/),
    boolean_flag: ($) => choice("true", "false"),

    // ─────────────────────────────────────────────────────────────────────────
    // EVENT LINE & SPECIALIZED EVENT PAYLOADS
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Standard timestamped execution event line:
     *   HH:mm:ss.SSS (nanoseconds)|EVENT_NAME|...
     */
    event_line: ($) => seq(
      field("timestamp", $.timestamp),
      field("nanoseconds", $.nanoseconds),
      "|",
      choice(
        $.user_debug_event,
        $.soql_begin_event,
        $.soql_end_event,
        $.dml_begin_event,
        $.dml_end_event,
        $.method_entry_event,
        $.method_exit_event,
        $.code_unit_started_event,
        $.code_unit_finished_event,
        $.user_info_event,
        $.variable_scope_event,
        $.variable_assignment_event,
        $.exception_thrown_event,
        $.fatal_error_event,
        $.generic_event
      )
    ),

    // USER_DEBUG|[5]|DEBUG|Processing 10 accounts
    user_debug_event: ($) => seq(
      field("event_type", "USER_DEBUG"),
      "|",
      field("line", $.line_reference),
      "|",
      field("level", $.log_level),
      "|",
      field("message", $.debug_message)
    ),
    debug_message: ($) => token(prec(-1, /[^\r\n]*/)),

    // SOQL_EXECUTE_BEGIN|[12]|Aggregations:0|SELECT Id, Name FROM Account
    soql_begin_event: ($) => seq(
      field("event_type", "SOQL_EXECUTE_BEGIN"),
      "|",
      field("line", $.line_reference),
      "|",
      field("aggregations", $.aggregations),
      "|",
      field("query", $.soql_query)
    ),
    aggregations: ($) => token(/Aggregations:\d+/),
    soql_query: ($) => token(prec(-1, /[^\r\n]+/)),

    // SOQL_EXECUTE_END|[12]|Rows:10
    soql_end_event: ($) => seq(
      field("event_type", "SOQL_EXECUTE_END"),
      "|",
      field("line", $.line_reference),
      "|",
      field("rows", $.rows_count)
    ),
    rows_count: ($) => token(/Rows:\d+/),

    // DML_BEGIN|[20]|Op:Insert|Type:Account|Rows:1
    dml_begin_event: ($) => seq(
      field("event_type", "DML_BEGIN"),
      "|",
      field("line", $.line_reference),
      "|",
      field("operation", $.dml_operation),
      "|",
      field("type", $.dml_type),
      "|",
      field("rows", $.rows_count)
    ),
    dml_operation: ($) => token(/Op:[A-Za-z]+/),
    dml_type: ($) => token(/Type:[A-Za-z0-9_]+/),

    // DML_END|[20]
    dml_end_event: ($) => seq(
      field("event_type", "DML_END"),
      optional(seq("|", field("line", $.line_reference)))
    ),

    // METHOD_ENTRY|[3]|01p5e000000yyyy|AccountService.validate()
    method_entry_event: ($) => seq(
      field("event_type", choice(
        "METHOD_ENTRY",
        "SYSTEM_METHOD_ENTRY",
        "CONSTRUCTOR_ENTRY",
        "SYSTEM_CONSTRUCTOR_ENTRY"
      )),
      optional(
        seq(
          "|",
          field("line", choice($.line_reference, $.frame_identifier)),
          optional(
            seq(
              "|",
              field("id", $.id_or_type),
              optional(seq("|", field("signature", $.method_signature)))
            )
          )
        )
      )
    ),
    id_or_type: ($) => token(/[0-9a-zA-Z_]+/),
    method_signature: ($) => token(prec(-1, /[^\r\n]+/)),

    // METHOD_EXIT|[3]|AccountService.validate()
    method_exit_event: ($) => seq(
      field("event_type", choice(
        "METHOD_EXIT",
        "SYSTEM_METHOD_EXIT",
        "CONSTRUCTOR_EXIT",
        "SYSTEM_CONSTRUCTOR_EXIT"
      )),
      optional(
        seq(
          "|",
          field("line", choice($.line_reference, $.frame_identifier)),
          optional(seq("|", field("signature", $.method_signature)))
        )
      )
    ),

    // CODE_UNIT_STARTED|[EXTERNAL]|01q5e000000xxxx|AccountTrigger on Account trigger event BeforeInsert
    code_unit_started_event: ($) => seq(
      field("event_type", "CODE_UNIT_STARTED"),
      optional(
        seq(
          "|",
          field("frame", choice($.frame_identifier, $.line_reference)),
          optional(
            seq(
              "|",
              field("id", $.id_or_type),
              optional(seq("|", field("description", $.code_unit_description)))
            )
          )
        )
      )
    ),
    code_unit_description: ($) => token(prec(-1, /[^\r\n]+/)),

    // CODE_UNIT_FINISHED|AccountTrigger on Account trigger event BeforeInsert
    code_unit_finished_event: ($) => seq(
      field("event_type", "CODE_UNIT_FINISHED"),
      optional(
        seq(
          "|",
          field("description", $.code_unit_description)
        )
      )
    ),

    // USER_INFO|[EXTERNAL]|0055e000000xxxx|user@example.com|(GMT-07:00) Pacific Daylight Time (America/Los_Angeles)|GMT-07:00
    user_info_event: ($) => seq(
      field("event_type", "USER_INFO"),
      optional(
        seq(
          "|",
          field("frame", choice($.frame_identifier, $.line_reference)),
          optional(
            seq(
              "|",
              field("user_id", $.id_or_type),
              optional(
                seq(
                  "|",
                  field("username", $.username),
                  optional(
                    seq(
                      "|",
                      field("timezone", $.timezone),
                      optional(seq("|", field("gmt_offset", $.gmt_offset)))
                    )
                  )
                )
              )
            )
          )
        )
      )
    ),
    username: ($) => token(/[^\r\n|]+/),
    timezone: ($) => token(/[^\r\n|]+/),
    gmt_offset: ($) => token(prec(-1, /[^\r\n]+/)),

    // VARIABLE_SCOPE_BEGIN|[7]|acc|Account|true|false
    variable_scope_event: ($) => seq(
      field("event_type", "VARIABLE_SCOPE_BEGIN"),
      "|",
      field("line", $.line_reference),
      "|",
      field("name", $.identifier),
      "|",
      field("type", $.type_identifier),
      "|",
      field("is_input", $.boolean_flag),
      "|",
      field("is_static", $.boolean_flag)
    ),
    identifier: ($) => token(/[A-Za-z_$][A-Za-z0-9_$]*/),
    type_identifier: ($) => token(/[A-Za-z0-9_<>., \t\x5b\x5d]+/),

    // VARIABLE_ASSIGNMENT|[7]|acc|{"Name":"Test"}|0x12345
    variable_assignment_event: ($) => seq(
      field("event_type", "VARIABLE_ASSIGNMENT"),
      "|",
      field("line", $.line_reference),
      "|",
      field("name", $.identifier),
      "|",
      field("value", $.variable_value),
      optional(seq("|", field("address", $.memory_address)))
    ),
    variable_value: ($) => token(/[^\r\n|]+/),
    memory_address: ($) => token(/[0-9a-zA-Z_xX]+/),

    // EXCEPTION_THROWN|[15]|System.NullPointerException: Attempt to de-reference a null object
    exception_thrown_event: ($) => seq(
      field("event_type", "EXCEPTION_THROWN"),
      optional(
        seq(
          "|",
          optional(seq(field("line", $.line_reference), "|")),
          field("message", $.exception_message)
        )
      )
    ),

    // FATAL_ERROR|System.NullPointerException: Attempt to de-reference a null object
    fatal_error_event: ($) => seq(
      field("event_type", "FATAL_ERROR"),
      optional(seq("|", field("message", $.exception_message)))
    ),
    exception_message: ($) => token(prec(-1, /[^\r\n]+/)),

    // Generic Event (e.g. EXECUTION_STARTED, EXECUTION_FINISHED, CALLOUT_REQUEST, FLOW_*, WF_*, etc.)
    generic_event: ($) => seq(
      field("event_type", $.event_identifier),
      optional(
        seq(
          "|",
          optional(field("details", $.generic_details))
        )
      )
    ),
    event_identifier: ($) => token(/[A-Z][A-Z0-9_]+/),
    generic_details: ($) => token(prec(-1, /[^\r\n]+/)),

    // ─────────────────────────────────────────────────────────────────────────
    // CUMULATIVE LIMIT USAGE SECTION
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Cumulative limit usage table block:
     *   HH:mm:ss.SSS (nano)|CUMULATIVE_LIMIT_USAGE
     *   HH:mm:ss.SSS (nano)|LIMIT_USAGE_FOR_NS|(default)|
     *     Number of SOQL queries: 1 out of 100
     *     ...
     *   HH:mm:ss.SSS (nano)|CUMULATIVE_LIMIT_USAGE_END
     */
    limit_usage_section: ($) => seq(
      field("start", $.limit_usage_start_line),
      repeat(choice($.limit_usage_for_ns_block, $.limit_metric_line)),
      field("end", $.limit_usage_end_line)
    ),

    limit_usage_start_line: ($) => seq(
      field("timestamp", $.timestamp),
      field("nanoseconds", $.nanoseconds),
      "|",
      "CUMULATIVE_LIMIT_USAGE"
    ),

    limit_usage_end_line: ($) => seq(
      field("timestamp", $.timestamp),
      field("nanoseconds", $.nanoseconds),
      "|",
      "CUMULATIVE_LIMIT_USAGE_END"
    ),

    limit_usage_for_ns_block: ($) => seq(
      field("header", $.limit_usage_ns_header_line),
      repeat($.limit_metric_line)
    ),

    limit_usage_ns_header_line: ($) => seq(
      field("timestamp", $.timestamp),
      field("nanoseconds", $.nanoseconds),
      "|",
      "LIMIT_USAGE_FOR_NS",
      "|",
      field("namespace", choice($.default_namespace, $.identifier)),
      optional("|")
    ),

    /**
     * Individual limit metric line:
     *   Number of SOQL queries: 1 out of 100
     *   Maximum heap size: 1045 out of 6000000 bytes
     */
    limit_metric_line: ($) => seq(
      field("name", $.limit_name),
      ":",
      field("used", $.number),
      "out of",
      field("max", $.number),
      optional(field("notes", $.limit_notes))
    ),

    limit_name: ($) => token(/[A-Za-z][A-Za-z0-9_ \t\-\(\)\/]*/),
    limit_notes: ($) => token(/\([^\r\n]+\)|\*[^\r\n]*/),

    // ─────────────────────────────────────────────────────────────────────────
    // STACK TRACES & RAW LINES
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Apex / Trigger / AnonymousBlock stack trace line.
     * Example:
     *   Class.AccountService.validate: line 15, column 1
     *   AnonymousBlock: line 2, column 1
     */
    stack_trace_line: ($) => token(
      /[ \t]*(Class\.[A-Za-z0-9_$.]+|Trigger\.[A-Za-z0-9_$.]+|AnonymousBlock):\s*line\s+\d+,\s*column\s+\d+[^\r\n]*/
    ),

    /**
     * Catch-all for unstructured or multiline log output.
     */
    raw_line: ($) => token(prec(-2, /[^\r\n]+/)),
  },
});
