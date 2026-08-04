@echo off
echo Creating directories...
mkdir common 2>NUL
mkdir bindings\node 2>NUL
mkdir bindings\python\tree_sitter_salesforce 2>NUL
mkdir bindings\web 2>NUL
mkdir docs\steps 2>NUL
mkdir scripts 2>NUL
mkdir apex\test\corpus 2>NUL
mkdir soql\test\corpus 2>NUL

echo.
echo Initializing Git...
git init

echo.
echo Installing dependencies...
call npm install

echo.
echo Testing apex generator...
cd apex
call npx tree-sitter generate
echo hello > example-file.txt
call npx tree-sitter parse example-file.txt
del example-file.txt
cd ..

echo.
echo Testing soql generator...
cd soql
call npx tree-sitter generate
echo hello > example-file.txt
call npx tree-sitter parse example-file.txt
del example-file.txt
cd ..

echo.
echo Creating initial commit...
git add .
git commit -m "chore: initial project scaffold" -m "- Mono-repo structure for Apex and SOQL parsers" -m "- MIT license" -m "- Salesforce API v67 compatibility tracking" -m "- Placeholder grammars that validate toolchain works" -m "- npm scripts for build and test workflows"

echo.
echo Step 1 completed successfully!
