# Create missing directories
$dirs = @(
    "common",
    "bindings\node",
    "bindings\python\tree_sitter_salesforce",
    "bindings\web",
    "docs\steps",
    "scripts",
    "apex\test\corpus",
    "soql\test\corpus"
)
foreach ($dir in $dirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
}

# Init git
git init

# Install dependencies
npm install

# Test apex generator
cd apex
npx tree-sitter generate
echo hello > example-file.txt
npx tree-sitter parse example-file.txt
Remove-Item example-file.txt
cd ..

# Test soql generator
cd soql
npx tree-sitter generate
echo hello > example-file.txt
npx tree-sitter parse example-file.txt
Remove-Item example-file.txt
cd ..

# Initial commit
git add .
git commit -m "chore: initial project scaffold`n`n- Mono-repo structure for Apex and SOQL parsers`n- MIT license`n- Salesforce API v67 compatibility tracking`n- Placeholder grammars that validate toolchain works`n- npm scripts for build and test workflows"

Write-Host "Step 1 completed successfully!"
