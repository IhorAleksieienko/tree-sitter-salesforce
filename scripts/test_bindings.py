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

ver = tuple(int(x) for x in _ts.__version__.split(".")[:2])
assert ver >= (0, 22), f"tree-sitter >= 0.22 required, found {_ts.__version__}"

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
