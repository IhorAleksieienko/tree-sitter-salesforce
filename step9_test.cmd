@echo off
cd %~dp0

echo ==============================================
echo Running NPM Test (All Parsers)
echo ==============================================
call npm test
if errorlevel 1 goto error

echo.
echo ==============================================
echo Parsing Real-World Apex Files (if available)
echo ==============================================
if exist "d:\Git\apex-recipes\force-app\main\default\classes\Trigger Recipes\AccountTriggerHandler.cls" (
    call npx tree-sitter parse "d:\Git\apex-recipes\force-app\main\default\classes\Trigger Recipes\AccountTriggerHandler.cls" --quiet --time
) else (
    echo Note: apex-recipes not found, skipping real-world parsing test.
)

echo.
echo ==============================================
echo All tests passed successfully!
echo You can now run 'powershell -ExecutionPolicy Bypass -File step9_commit.ps1' to cut the v0.1.0 release. 
echo OR run 'step9_commit.cmd' for the same.
echo ==============================================
goto :eof

:error
echo.
echo Tests failed! Please check the output above.
exit /b 1
