$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

Write-Host "Staging all files..."
git add .

Write-Host "Creating v0.1.0 release commit..."
$commitMessage = @"
docs: complete documentation and polish for v0.1.0

- Educational docs: How Tree-Sitter Works, Grammar DSL Cheatsheet, etc.
- Complete README with quickstart examples
- CONTRIBUTING.md with step-by-step for new parsers
- ARCHITECTURE.md with data flow and injection model
- Updated SALESFORCE_API.md with implementation status
- Final CHANGELOG.md
- All inline comments reviewed
"@

git commit -m $commitMessage

Write-Host "Applying v0.1.0 tag..."
$tagMessage = @"
v0.1.0: Initial release

Parsers:
- Apex (Salesforce API v67, Summer '25)
- SOQL

Features:
- Full Apex grammar: classes, interfaces, enums, triggers
- Methods, properties, constructors
- All statements and control flow
- DML statements
- Annotations
- Operator precedence matching Salesforce docs
- Full SOQL grammar: SELECT, FROM, WHERE, GROUP BY, etc.
- Language injection: SOQL inside Apex
- Dynamic SOQL recognition (Database.query)
- Node.js, Python, WASM bindings
- Comprehensive test suites
- Educational documentation
"@

git tag -a v0.1.0 -m $tagMessage

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "SUCCESS: Repository is now at version 0.1.0!" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to exit..."
$Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null
