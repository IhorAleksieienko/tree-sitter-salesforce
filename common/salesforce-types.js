/**
 * @file Shared Salesforce types
 */

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
  "Time"
];

const COLLECTION_TYPES = [
  "List",
  "Set",
  "Map"
];

const VOID_TYPE = "void";

module.exports = {
  PRIMITIVE_TYPES,
  COLLECTION_TYPES,
  VOID_TYPE
};
