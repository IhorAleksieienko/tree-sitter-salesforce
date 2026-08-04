@echo off
cd %~dp0

echo Staging all files...
git add .

echo Creating v0.1.0 release commit...
echo docs: complete documentation and polish for v0.1.0> commit_msg.txt
echo.>> commit_msg.txt
echo - Educational docs: How Tree-Sitter Works, Grammar DSL Cheatsheet, etc.>> commit_msg.txt
echo - Complete README with quickstart examples>> commit_msg.txt
echo - CONTRIBUTING.md with step-by-step for new parsers>> commit_msg.txt
echo - ARCHITECTURE.md with data flow and injection model>> commit_msg.txt
echo - Updated SALESFORCE_API.md with implementation status>> commit_msg.txt
echo - Final CHANGELOG.md>> commit_msg.txt
echo - All inline comments reviewed>> commit_msg.txt

git commit -F commit_msg.txt
del commit_msg.txt

echo Applying v0.1.0 tag...
echo v0.1.0: Initial release> tag_msg.txt
echo.>> tag_msg.txt
echo Parsers:>> tag_msg.txt
echo - Apex (Salesforce API v67, Summer '25)>> tag_msg.txt
echo - SOQL>> tag_msg.txt
echo.>> tag_msg.txt
echo Features:>> tag_msg.txt
echo - Full Apex grammar: classes, interfaces, enums, triggers>> tag_msg.txt
echo - Methods, properties, constructors>> tag_msg.txt
echo - All statements and control flow>> tag_msg.txt
echo - DML statements>> tag_msg.txt
echo - Annotations>> tag_msg.txt
echo - Operator precedence matching Salesforce docs>> tag_msg.txt
echo - Full SOQL grammar: SELECT, FROM, WHERE, GROUP BY, etc.>> tag_msg.txt
echo - Language injection: SOQL inside Apex>> tag_msg.txt
echo - Dynamic SOQL recognition (Database.query)>> tag_msg.txt
echo - Node.js, Python, WASM bindings>> tag_msg.txt
echo - Comprehensive test suites>> tag_msg.txt
echo - Educational documentation>> tag_msg.txt

git tag -a v0.1.0 -F tag_msg.txt
del tag_msg.txt

echo.
echo ==============================================
echo SUCCESS: Repository is now at version 0.1.0!
echo ==============================================
echo.
pause
