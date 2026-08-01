"""
tree-sitter-salesforce Python bindings.

Provides Apex and SOQL parsers for use with the tree-sitter Python library.

Usage:
    import tree_sitter_salesforce as tss

    # Get language objects
    apex_lang = tss.apex()
    soql_lang = tss.soql()

    # Use with tree-sitter
    from tree_sitter import Language, Parser

    parser = Parser()
    parser.language = Language(apex_lang)
    tree = parser.parse(b"public class T { }")
    print(tree.root_node.sexp())
"""

from importlib.resources import files as _files

# Path to the compiled shared library containing both parsers
_SHARED_LIB = str(
    _files("tree_sitter_salesforce")
    .joinpath("")  # Package directory
)


def apex():
    """
    Returns the Apex language object for tree-sitter.

    Use this with tree_sitter.Language to create a parser:
        lang = Language(tree_sitter_salesforce.apex())
        parser = Parser()
        parser.language = lang
    """
    from tree_sitter import Language
    return Language(_SHARED_LIB, "apex")


def soql():
    """
    Returns the SOQL language object for tree-sitter.

    Use this with tree_sitter.Language to create a parser:
        lang = Language(tree_sitter_salesforce.soql())
        parser = Parser()
        parser.language = lang
    """
    from tree_sitter import Language
    return Language(_SHARED_LIB, "soql")
