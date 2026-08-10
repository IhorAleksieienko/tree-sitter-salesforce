/**
 * tree-sitter-salesforce WebAssembly loader
 *
 * Usage (in browser with tree-sitter.wasm loaded):
 *   const Parser = require('web-tree-sitter');
 *   await Parser.init();
 *   const Apex = await Parser.Language.load('/path/to/tree-sitter-apex.wasm');
 *   const parser = new Parser();
 *   parser.setLanguage(Apex);
 *   const tree = parser.parse('public class T { }');
 */

const path = require("path");

function getWasmPath(grammarName) {
  return path.join(__dirname, `tree-sitter-${grammarName}.wasm`);
}

module.exports = {
  apexWasm: getWasmPath("apex"),
  apexAnonWasm: getWasmPath("apex_anon"),
  soqlWasm: getWasmPath("soql"),
  soslWasm: getWasmPath("sosl"),
  formulaWasm: getWasmPath("formula"),
};
