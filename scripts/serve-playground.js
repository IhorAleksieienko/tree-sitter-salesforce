#!/usr/bin/env node
/**
 * Zero-dependency local static HTTP server for the WebAssembly playground.
 * Uses only Node.js standard library modules (http, fs, path).
 *
 * Usage:
 *   node scripts/serve-playground.js [port]
 *   npm run serve:playground
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = parseInt(process.argv[2], 10) || 3000;
const PLAYGROUND_DIR = path.join(__dirname, "..", "docs", "playground");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split("?")[0]);
  if (reqPath === "/" || reqPath === "") reqPath = "/index.html";

  const filePath = path.normalize(path.join(PLAYGROUND_DIR, reqPath));

  // Security: prevent directory traversal
  if (!filePath.startsWith(PLAYGROUND_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("403 Forbidden");
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-cache",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    });

    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n⚡ Tree-Sitter Salesforce Playground running at:`);
  console.log(`   👉 http://localhost:${PORT}/\n`);
  console.log(`Press Ctrl+C to stop.`);
});
