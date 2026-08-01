@echo off
cd soql
echo Generating parser...
call npx tree-sitter generate
if errorlevel 1 (
    echo Generation failed!
    exit /b 1
)

echo.
echo Running tests...
call npx tree-sitter test
if errorlevel 1 (
    echo Tests failed!
    exit /b 1
)

echo.
echo Testing real SOQL parsing...
echo SELECT Name, ShippingStreet, ShippingCity FROM Account > test-real.soql
call npx tree-sitter parse test-real.soql
echo SELECT Id, Name, Account.Name FROM Contact WHERE Account.ShippingState = 'KS' > test-real.soql
call npx tree-sitter parse test-real.soql
del test-real.soql

echo.
echo Committing changes...
cd ..
git add soql/
git commit -m "feat(soql): complete SOQL grammar with tests" -m "- Full SOQL grammar supporting all standard clauses" -m "- SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT, OFFSET" -m "- Aggregate functions, TYPEOF, FIELDS(), subqueries" -m "- Date literals (YESTERDAY, LAST_N_DAYS:n, etc.)" -m "- Boolean expressions (AND, OR, NOT, parenthesized)" -m "- WITH clause (USER_MODE, SECURITY_ENFORCED, etc.)" -m "- Comprehensive test corpus with 25+ test cases" -m "- All functions heavily documented with JSDoc comments"

echo.
echo Step 3 completed successfully!
