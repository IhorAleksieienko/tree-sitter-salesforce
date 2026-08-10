"""
Test suite for tree-sitter-salesforce Python bindings.
"""
from tree_sitter import Language, Parser
import tree_sitter_salesforce as tss


def test_apex_parser():
    parser = Parser()
    parser.language = tss.apex()
    source = b"""
    public with sharing class AccountService {
        public List<Account> getAccounts() {
            return [SELECT Id, Name FROM Account WHERE IsDeleted = false];
        }
    }
    """
    tree = parser.parse(source)
    assert not tree.root_node.has_error, f"Apex ERROR: {tree.root_node}"
    assert tree.root_node.type == "source_file"
    assert len(tree.root_node.children) > 0


def test_apex_anon_parser():
    parser = Parser()
    parser.language = tss.apex_anon()
    source = b"""
    List<Account> accs = [SELECT Id FROM Account LIMIT 10];
    for (Account a : accs) {
        System.debug('Account: ' + a.Id);
    }
    """
    tree = parser.parse(source)
    assert not tree.root_node.has_error, f"Apex Anon ERROR: {tree.root_node}"
    assert tree.root_node.type == "source_file"
    assert len(tree.root_node.children) > 0


def test_soql_parser():
    parser = Parser()
    parser.language = tss.soql()
    source = b"SELECT Id, Name, (SELECT LastName FROM Contacts) FROM Account WHERE IsActive__c = true"
    tree = parser.parse(source)
    assert not tree.root_node.has_error, f"SOQL ERROR: {tree.root_node}"
    assert tree.root_node.type == "source_file"
    assert len(tree.root_node.children) > 0


def test_sosl_parser():
    parser = Parser()
    parser.language = tss.sosl()
    source = b"FIND 'Acme' IN ALL FIELDS RETURNING Account(Name), Contact(FirstName)"
    tree = parser.parse(source)
    assert not tree.root_node.has_error, f"SOSL ERROR: {tree.root_node}"
    assert tree.root_node.type == "source_file"
    assert len(tree.root_node.children) > 0


def test_formula_parser():
    parser = Parser()
    parser.language = tss.formula()
    source = b"IF(ISBLANK(Email__c), 'Required', Email__c)"
    tree = parser.parse(source)
    assert not tree.root_node.has_error, f"Formula ERROR: {tree.root_node}"
    assert tree.root_node.type == "source_file"
    assert len(tree.root_node.children) > 0


if __name__ == "__main__":
    test_apex_parser()
    print("Apex: OK")
    test_apex_anon_parser()
    print("Apex Anon: OK")
    test_soql_parser()
    print("SOQL: OK")
    test_sosl_parser()
    print("SOSL: OK")
    test_formula_parser()
    print("Formula: OK")
    print("All tests passed successfully!")
