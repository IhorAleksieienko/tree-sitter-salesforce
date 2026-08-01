@echo off
cd %~dp0
git add .
git commit -m "feat: Node.js, Python, and WASM bindings

- binding.gyp: Node.js native addon build config
- bindings/node: JavaScript entry point, TypeScript types, C++ bridge
- bindings/python: Python package with tree-sitter integration
- pyproject.toml: Python package metadata
- Both parsers loadable from Node.js and Python
- WASM builds (if Emscripten available)"
echo.
pause
