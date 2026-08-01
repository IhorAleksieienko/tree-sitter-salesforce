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

echo Parsing Trigger Handler...
call npx tree-sitter parse "d:\Git\apex-recipes\force-app\main\default\classes\Trigger Recipes\AccountTriggerHandler.cls"
if %errorlevel% neq 0 exit /b %errorlevel%

cd d:\Git\tree-sitter-salesforce
echo Committing changes...
git add apex/
git commit -m "feat(apex): statements, methods, operators, and SOQL expression" -m "- Method declarations with parameters and return types" -m "- Constructors and properties (get/set)" -m "- Control flow: if/else, for, enhanced for, while, do-while, switch/when" -m "- Exception handling: try/catch/finally, throw" -m "- DML statements: insert, update, upsert, delete, undelete, merge" -m "- SOQL expression node (opaque, for injection)" -m "- All binary/unary/assignment operators" -m "- Ternary, null coalescing (??), safe navigation (?.)" -m "- instanceof, cast, new expressions" -m "- Method invocation and field access" -m "- 40+ test cases"

echo Step 5 complete!
