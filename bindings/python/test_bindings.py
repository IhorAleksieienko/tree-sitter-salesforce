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


def test_sflog_parser():
    parser = Parser()
    parser.language = tss.sflog()
    source = b"""67.0 APEX_CODE,FINEST;DB,INFO
14:32:01.042 (42105102)|USER_INFO|[EXTERNAL]|0055e000000xxxx|user@example.com|(GMT-07:00) Pacific Daylight Time (America/Los_Angeles)|GMT-07:00
14:32:01.043 (43100200)|EXECUTION_STARTED
14:32:01.052 (52301000)|USER_DEBUG|[5]|DEBUG|Processing 10 accounts
14:32:01.075 (75000000)|CUMULATIVE_LIMIT_USAGE
14:32:01.075 (75100000)|LIMIT_USAGE_FOR_NS|(default)|
  Number of SOQL queries: 1 out of 100
14:32:01.080 (80000000)|CUMULATIVE_LIMIT_USAGE_END
14:32:01.082 (82000000)|EXECUTION_FINISHED"""
    tree = parser.parse(source)
    assert not tree.root_node.has_error, f"sflog ERROR: {tree.root_node}"
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
    test_sflog_parser()
    print("sflog: OK")
    print("All tests passed successfully!")
