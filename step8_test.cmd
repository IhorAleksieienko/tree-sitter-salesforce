@echo off
cd %~dp0

echo ==============================================
echo Building native binding...
echo ==============================================
call npm run build
call npx node-gyp rebuild

echo.
echo ==============================================
echo Testing Node.js Bindings...
echo ==============================================
node -e "const s = require('./bindings/node'); console.log('Apex parser name:', s.apex.name); console.log('SOQL parser name:', s.soql.name); console.log('All bindings loaded successfully!');"

echo.
echo ==============================================
echo WASM Build (Optional)
echo ==============================================
echo Note: If you have Emscripten installed (emsdk), you can manually run:
echo   cd apex ^& npx tree-sitter build --wasm
echo   cd soql ^& npx tree-sitter build --wasm
echo   copy apex\tree-sitter-apex.wasm bindings\web\
echo   copy soql\tree-sitter-soql.wasm bindings\web\
echo.
pause
