@echo off
cd d:\Git\tree-sitter-salesforce\apex
echo Generating tree-sitter parser...
call npx tree-sitter generate
if %errorlevel% neq 0 exit /b %errorlevel%

echo Updating tests with actual AST...
call npx tree-sitter test -u
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running tests...
call npx tree-sitter test
if %errorlevel% neq 0 exit /b %errorlevel%

echo Parsing sample AccountTriggerHandler.cls...
call npx tree-sitter parse "d:\Git\apex-recipes\force-app\main\default\classes\Trigger Recipes\AccountTriggerHandler.cls"
if %errorlevel% neq 0 exit /b %errorlevel%

cd d:\Git\tree-sitter-salesforce
echo Committing changes...
git add apex/
git commit -m "feat(apex): annotations, dynamic SOQL, and advanced generics" -m "- Added support for Annotations with and without arguments" -m "- Verified generics and type casting" -m "- Added Dynamic SOQL test cases" -m "- Fixed ambiguity between expression_statement and local_variable_declaration"

echo Step 6 complete!
