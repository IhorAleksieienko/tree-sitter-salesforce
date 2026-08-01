@echo off
echo Testing imports...
node -e "require('./common/common.js'); require('./common/salesforce-types.js'); console.log('OK')"

echo.
echo Committing changes...
git add common/
git commit -m "feat: add shared grammar utilities" -m "- common/common.js: case-insensitive keywords, comma-joined lists, DSL helpers" -m "- common/salesforce-types.js: Apex types, SOQL date literals, aggregate functions" -m "- common/README.md: documentation for all shared modules" -m "All functions are heavily documented with JSDoc comments and usage examples."

echo.
echo Step 2 completed successfully!
