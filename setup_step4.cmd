@echo off
cd apex
echo Generating parser...
call npx tree-sitter generate
if errorlevel 1 (
    echo Generation failed!
    exit /b 1
)

echo.
echo Updating and running tests...
call npx tree-sitter test -u
call npx tree-sitter test
if errorlevel 1 (
    echo Tests failed!
    exit /b 1
)

echo.
echo Testing real Apex parsing...
echo public with sharing class AccountTriggerHandler extends TriggerHandler { > test-real.cls
echo     private List^<Account^> triggerNew; >> test-real.cls
echo     private Map^<Id, Account^> triggerMapNew; >> test-real.cls
echo } >> test-real.cls

call npx tree-sitter parse test-real.cls
del test-real.cls

echo.
echo Committing changes...
cd ..
git add apex/
git commit -m "feat(apex): core grammar with declarations, types, and expressions" -m "- Class, interface, enum, trigger declarations" -m "- Type system: primitives, sObjects, generics (List, Map, Set), arrays" -m "- Modifiers: access, sharing, static, final, virtual, abstract, override" -m "- Basic expressions: literals, identifiers, this, super" -m "- Field declarations with initializers" -m "- Comments (line and block)" -m "- Operator precedence table from Salesforce documentation" -m "- Test corpus with 15+ test cases"

echo.
echo Step 4 completed successfully!
