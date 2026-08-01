@echo off
cd d:\Git\tree-sitter-salesforce

echo Running all tests (including highlight tests)...
call npx tree-sitter test
if %errorlevel% neq 0 exit /b %errorlevel%

echo Testing injection on sample AccountTriggerHandler.cls...
call npx tree-sitter parse "d:\Git\apex-recipes\force-app\main\default\classes\Trigger Recipes\AccountTriggerHandler.cls"
if %errorlevel% neq 0 exit /b %errorlevel%

echo Committing changes...
git add apex/queries/
git add soql/queries/
git add apex/test/highlight/
git add soql/test/highlight/
git commit -m "feat: queries and language injection" -m "- Added Apex and SOQL syntax highlighting queries" -m "- Added Apex local scope and tags queries" -m "- Added SOQL injection queries into Apex" -m "- Added highlighting tests for both languages"

echo Step 7 complete!
