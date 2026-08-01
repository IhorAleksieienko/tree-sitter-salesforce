@echo off
echo Generating grammar...
call npx tree-sitter generate
if %errorlevel% neq 0 (
  echo Generation failed.
  exit /b %errorlevel%
)

echo Running tests...
call npx tree-sitter test
if %errorlevel% neq 0 (
  echo Tests failed.
  exit /b %errorlevel%
)

echo Creating test class...
echo public with sharing class AccountTriggerHandler extends TriggerHandler { > test-real.cls
echo     private List^<Account^> triggerNew; >> test-real.cls
echo     private Map^<Id, Account^> triggerMapNew; >> test-real.cls
echo } >> test-real.cls

echo Parsing real class...
call npx tree-sitter parse test-real.cls

echo Cleaning up...
del test-real.cls
echo All tests passed.
