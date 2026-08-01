/**
 * @file Node.js native binding for tree-sitter-salesforce
 * @description
 * This C++ file creates a Node.js native addon that exposes the Apex and SOQL
 * parsers to JavaScript. It uses the Node-API (N-API) for ABI stability across
 * Node.js versions.
 *
 * HOW IT WORKS:
 * 1. Node.js loads this compiled .node file when you `require('tree-sitter-salesforce')`
 * 2. The Napi::Init function registers the `apex` and `soql` parser functions
 * 3. Each parser function returns a Language object that tree-sitter can use
 *
 * You don't need to modify this file unless you add a new parser to the repo.
 * To add a new parser (e.g., sosl):
 *   1. Add the extern declaration for tree_sitter_sosl()
 *   2. Add a new Napi::Function for "sosl" in the Init function
 */

#include <napi.h>

// These functions are defined in the generated parser.c files.
// The `extern "C"` tells the C++ compiler to use C-style name mangling
// so we can call functions defined in plain C files.
extern "C" {
  // Defined in apex/src/parser.c
  const void *tree_sitter_apex();
  // Defined in soql/src/parser.c
  const void *tree_sitter_soql();
}

/**
 * Creates a JavaScript Language object wrapping a tree-sitter parser.
 *
 * The returned object has properties that tree-sitter's Node.js binding
 * uses to identify and load the parser.
 */
namespace {

/**
 * Returns the Apex parser's Language pointer as a JavaScript external value.
 */
Napi::Value ApexLanguage(const Napi::CallbackInfo &info) {
  auto env = info.Env();
  auto language = Napi::External<void>::New(env,
    const_cast<void *>(tree_sitter_apex()));
  auto languageObject = Napi::Object::New(env);
  languageObject.Set("name", Napi::String::New(env, "apex"));
  languageObject.Set("language", language);
  return languageObject;
}

/**
 * Returns the SOQL parser's Language pointer as a JavaScript external value.
 */
Napi::Value SoqlLanguage(const Napi::CallbackInfo &info) {
  auto env = info.Env();
  auto language = Napi::External<void>::New(env,
    const_cast<void *>(tree_sitter_soql()));
  auto languageObject = Napi::Object::New(env);
  languageObject.Set("name", Napi::String::New(env, "soql"));
  languageObject.Set("language", language);
  return languageObject;
}

/**
 * Module initialization — registers all parser functions.
 * When Node.js loads this native module, this function is called once.
 */
Napi::Object Init(Napi::Env env, Napi::Object exports) {
  // Export each parser as a property of the module
  exports.Set("apex", Napi::Function::New(env, ApexLanguage));
  exports.Set("soql", Napi::Function::New(env, SoqlLanguage));
  return exports;
}

// Register the module init function with Node.js
NODE_API_MODULE(tree_sitter_salesforce_binding, Init)

} // namespace
