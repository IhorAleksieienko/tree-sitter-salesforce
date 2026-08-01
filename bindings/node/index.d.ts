/**
 * TypeScript type declarations for tree-sitter-salesforce
 *
 * These types allow TypeScript projects to use tree-sitter-salesforce
 * with full type checking and IntelliSense support.
 */

import type { Language } from "tree-sitter";

/** Apex language parser for tree-sitter */
export const apex: Language;

/** SOQL language parser for tree-sitter */
export const soql: Language;
