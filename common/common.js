/**
 * @file Shared utilities for tree-sitter grammars.
 */

/**
 * Creates a case-insensitive regex for a given string.
 * Used for SQL/Apex keywords which are case-insensitive.
 */
function ci(keyword) {
  return new RegExp(
    keyword
      .split("")
      .map(letter => `[${letter.toLowerCase()}${letter.toUpperCase()}]`)
      .join("")
  );
}

/**
 * Matches one or more occurrences of `rule`, separated by commas.
 */
function commaJoined1(rule) {
  return seq(rule, repeat(seq(",", rule)));
}

/**
 * Matches zero or more occurrences of `rule`, separated by commas.
 */
function commaJoined(rule) {
  return optional(commaJoined1(rule));
}

/**
 * Joins multiple regex components together.
 */
function joined(...args) {
  return new RegExp(args.map(arg => arg.source || arg).join(""));
}

module.exports = {
  ci,
  commaJoined,
  commaJoined1,
  joined
};
