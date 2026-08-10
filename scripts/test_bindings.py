#!/usr/bin/env python3
"""
Python binding smoke tests.
Verifies all 5 language loaders work and can parse representative inputs.
Run: python scripts/test_bindings.py
"""
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Verify tree-sitter version
import tree_sitter as _ts

_v_str = None
try:
    from importlib.metadata import version
    _v_str = version("tree-sitter")
except Exception:
    try:
        from importlib.metadata import version
        _v_str = version("tree_sitter")
    except Exception:
        _v_str = getattr(_ts, "__version__", None)

if _v_str:
    _digits = [int(x) for x in _v_str.split(".")[:2] if x.isdigit()]
    if _digits and tuple(_digits) < (0, 24):
        raise AssertionError(f"tree-sitter >= 0.24.0 required for ABI 15, found {_v_str}")

import tree_sitter_salesforce as tss
from tree_sitter import Parser

TESTS = [
    (
        tss.apex,
        b"public with sharing class T { public void run() { List<Account> a = [SELECT Id FROM Account]; } }",
        "Apex class with SOQL",
    ),
    (
        tss.apex_anon,
        b"System.debug('Hello');\ninsert new Account(Name = 'T');",
        "Anonymous Apex script",
    ),
    (
        tss.soql,
        b"SELECT Id, Name, (SELECT LastName FROM Contacts) FROM Account WHERE IsDeleted = false",
        "SOQL with subquery",
    ),
    (
        tss.sosl,
        b"FIND 'Acme*' IN ALL FIELDS RETURNING Account(Id, Name ORDER BY Name), Contact(Email)",
        "SOSL search",
    ),
    (
        tss.formula,
        b"IF(ISBLANK(Email__c), 'Required: ' & FirstName, $User.ProfileId)",
        "Formula with IF and global var",
    ),
    (
        tss.sflog,
        b"67.0 APEX_CODE,FINEST;DB,INFO\n14:32:01.042 (42105102)|USER_INFO|[EXTERNAL]|0055e000000xxxx|user@example.com|(GMT-07:00) Pacific Daylight Time (America/Los_Angeles)|GMT-07:00\n14:32:01.043 (43100200)|EXECUTION_STARTED\n14:32:01.052 (52301000)|USER_DEBUG|[5]|DEBUG|Processing 10 accounts\n14:32:01.075 (75000000)|CUMULATIVE_LIMIT_USAGE\n14:32:01.075 (75100000)|LIMIT_USAGE_FOR_NS|(default)|\n  Number of SOQL queries: 1 out of 100\n14:32:01.080 (80000000)|CUMULATIVE_LIMIT_USAGE_END\n14:32:01.082 (82000000)|EXECUTION_FINISHED",
        "Salesforce Debug Log with limits",
    ),
]

parser = Parser()
all_passed = True

for loader_fn, source, description in TESTS:
    parser.language = loader_fn()
    tree = parser.parse(source)
    if tree.root_node.has_error:
        print(f"❌ FAIL: {description}")
        print(f"   Source: {source.decode()[:60]}...")
        print(f"   Tree: {str(tree.root_node)[:200]}")
        all_passed = False
    else:
        print(f"✅ PASS: {description}")

if not all_passed:
    sys.exit(1)

print(f"\n✅ All {len(TESTS)} binding tests passed.")
