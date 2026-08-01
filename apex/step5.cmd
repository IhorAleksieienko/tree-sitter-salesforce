@echo off
cd d:\Git\tree-sitter-salesforce\apex
npx tree-sitter generate
if %errorlevel% neq 0 exit /b %errorlevel%
npx tree-sitter test
if %errorlevel% neq 0 exit /b %errorlevel%
npx tree-sitter parse "d:\Git\apex-recipes\force-app\main\default\classes\Trigger Recipes\AccountTriggerHandler.cls"
