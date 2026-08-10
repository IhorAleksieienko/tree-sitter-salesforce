/**
 * TypeScript type declarations for tree-sitter-salesforce
 *
 * These types allow TypeScript projects to use tree-sitter-salesforce
 * with full type checking and IntelliSense support.
 */

import type { Language } from "tree-sitter";

/** Apex language parser for tree-sitter */
export const apex: Language;

/** Anonymous Apex language parser for tree-sitter */
export const apexAnon: Language;
export const apex_anon: Language;

/** SOQL language parser for tree-sitter */
export const soql: Language;

/** SOSL language parser for tree-sitter */
export const sosl: Language;

/** Formula language parser for tree-sitter */
export const formula: Language;

