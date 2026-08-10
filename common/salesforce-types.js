/**
 * @file Shared Salesforce type definitions for tree-sitter-salesforce grammars
 * @description
 * This module defines the type names that are common across Salesforce languages.
 * Both Apex and SOQL need to recognize Salesforce primitive types and sObject types.
 *
 * @license MIT
 */

"use strict";

const PRIMITIVE_TYPES = [
  "Blob",
  "Boolean",
  "Date",
  "Datetime",
  "Decimal",
  "Double",
  "Id",
  "Integer",
  "Long",
  "Object",
  "String",
  "Time",
];

const COLLECTION_TYPES = [
  "List",
  "Set",
  "Map",
];

const VOID_TYPE = "void";

const SOQL_DATE_LITERALS = [
  "YESTERDAY",
  "TODAY",
  "TOMORROW",
  "LAST_WEEK",
  "THIS_WEEK",
  "NEXT_WEEK",
  "LAST_MONTH",
  "THIS_MONTH",
  "NEXT_MONTH",
  "LAST_90_DAYS",
  "NEXT_90_DAYS",
  "THIS_QUARTER",
  "LAST_QUARTER",
  "NEXT_QUARTER",
  "THIS_YEAR",
  "LAST_YEAR",
  "NEXT_YEAR",
  "THIS_FISCAL_QUARTER",
  "LAST_FISCAL_QUARTER",
  "NEXT_FISCAL_QUARTER",
  "THIS_FISCAL_YEAR",
  "LAST_FISCAL_YEAR",
  "NEXT_FISCAL_YEAR",
];

const SOQL_DATE_N_LITERALS = [
  "LAST_N_DAYS",
  "NEXT_N_DAYS",
  "LAST_N_WEEKS",
  "NEXT_N_WEEKS",
  "LAST_N_MONTHS",
  "NEXT_N_MONTHS",
  "LAST_N_QUARTERS",
  "NEXT_N_QUARTERS",
  "LAST_N_YEARS",
  "NEXT_N_YEARS",
  "LAST_N_FISCAL_QUARTERS",
  "NEXT_N_FISCAL_QUARTERS",
  "LAST_N_FISCAL_YEARS",
  "NEXT_N_FISCAL_YEARS",
];

const SOQL_AGGREGATE_FUNCTIONS = [
  "AVG",
  "COUNT",
  "COUNT_DISTINCT",
  "MIN",
  "MAX",
  "SUM",
];

const SOQL_FUNCTIONS = [
  "CALENDAR_MONTH",
  "CALENDAR_QUARTER",
  "CALENDAR_YEAR",
  "DAY_IN_MONTH",
  "DAY_IN_WEEK",
  "DAY_IN_YEAR",
  "DAY_ONLY",
  "FISCAL_MONTH",
  "FISCAL_QUARTER",
  "FISCAL_YEAR",
  "HOUR_IN_DAY",
  "WEEK_IN_MONTH",
  "WEEK_IN_YEAR",
  "FIELDS",
  "FORMAT",
  "TOLABEL",
  "GROUPING",
  "CONVERTCURRENCY",
  "CONVERTTIMEZONE",
  "DISTANCE",
  "GEOLOCATION",
];

module.exports = {
  PRIMITIVE_TYPES,
  COLLECTION_TYPES,
  VOID_TYPE,
  SOQL_DATE_LITERALS,
  SOQL_DATE_N_LITERALS,
  SOQL_AGGREGATE_FUNCTIONS,
  SOQL_FUNCTIONS,
};
