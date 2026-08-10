/**
 * @file Tree-sitter Salesforce Debug Log parser subpath export
 */

const salesforce = require("../bindings/node");

module.exports = salesforce.sflog;
module.exports.default = salesforce.sflog;
module.exports.sflog = salesforce.sflog;
