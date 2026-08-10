"""
tree-sitter-salesforce Python bindings.

Provides Apex, Anonymous Apex, SOQL, SOSL, and Formula Language parsers
for use with the tree-sitter Python library (>= 0.22.0).

Usage:
    import tree_sitter_salesforce as tss
    from tree_sitter import Language, Parser

    parser = Parser()
    parser.language = tss.apex()
    tree = parser.parse(b"public class T { }")
    print(tree.root_node)

Available language loaders:
    tss.apex()       — Salesforce Apex (.cls, .trigger)
    tss.apex_anon()  — Anonymous Apex scripting mode (.apex)
    tss.soql()       — SOQL query language (.soql)
    tss.sosl()       — SOSL search language (.sosl)
    tss.formula()    — Salesforce Formula Language (.formula)
    tss.sflog()      — Salesforce Debug Log parser (.log)

Requires: tree-sitter >= 0.22.0
"""

import tree_sitter as _ts


def _check_tree_sitter_version() -> None:
    v_str = None
    try:
        from importlib.metadata import version
        v_str = version("tree-sitter")
    except Exception:
        try:
            from importlib.metadata import version
            v_str = version("tree_sitter")
        except Exception:
            v_str = getattr(_ts, "__version__", None)

    if v_str:
        digits = [int(x) for x in v_str.split(".")[:2] if x.isdigit()]
        if digits and tuple(digits) < (0, 24):
            raise ImportError(
                f"tree-sitter-salesforce 0.2.0+ requires tree-sitter>=0.24.0. "
                f"Found: {v_str}. Run: pip install 'tree-sitter>=0.24.0'"
            )


_check_tree_sitter_version()

from tree_sitter import Language


def apex() -> Language:
    """
    Returns the Apex language object for tree-sitter.

    Parses .cls and .trigger files containing class, interface,
    enum, and trigger declarations.
    """
    from . import _binding_apex
    return Language(_binding_apex.language())


def apex_anon() -> Language:
    """
    Returns the Anonymous Apex language object for tree-sitter.

    Parses anonymous Apex scripts (top-level statements without a class wrapper),
    as used by Developer Console Execute Anonymous and `sf apex run`.
    """
    from . import _binding_apex_anon
    return Language(_binding_apex_anon.language())


def soql() -> Language:
    """
    Returns the SOQL language object for tree-sitter.

    Parses SOQL queries in standalone .soql files and (when injected)
    inside Apex [SELECT ...] expressions.
    """
    from . import _binding_soql
    return Language(_binding_soql.language())


def sosl() -> Language:
    """
    Returns the SOSL language object for tree-sitter.

    Parses SOSL search queries in standalone .sosl files and (when injected)
    inside Apex [FIND ...] expressions.
    """
    from . import _binding_sosl
    return Language(_binding_sosl.language())


def formula() -> Language:
    """
    Returns the Formula Language object for tree-sitter.

    Parses Salesforce Formula Language expressions used in Validation Rules,
    Formula Fields, and Flow Decision Criteria.
    """
    from . import _binding_formula
    return Language(_binding_formula.language())


def sflog() -> Language:
    """
    Returns the Salesforce Debug Log (sflog) language object for tree-sitter.

    Parses Salesforce execution debug logs (.log), event traces, and cumulative
    governor limit summaries.
    """
    from . import _binding_sflog
    return Language(_binding_sflog.language())


__all__ = [
    "apex",
    "apex_anon",
    "soql",
    "sosl",
    "formula",
    "sflog",
]
