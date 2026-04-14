#!/usr/bin/env node
/**
 * MIDI Studio launcher — zero-dependency static server.
 * Serves ./ on http://localhost:<PORT> so Web MIDI + getUserMedia
 * run in a secure context. No npm install required.
 *
 *   node launch.js           # default port 4777
 *   PORT=8080 node launch.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '4777', 10);
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.wav':  'audio/wav',
  '.mp3':  'audio/mpeg',
  '.webm': 'audio/webm',
};

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const p = path.normalize(path.join(root, decoded));
  if (!p.startsWith(root)) return null; // directory traversal guard
  return p;
}

const server = http.createServer((req, res) => {
  let filePath = safeJoin(ROOT, req.url === '/' ? '/index.html' : req.url);
  if (!filePath) {
    res.writeHead(400); res.end('Bad path');
    return;
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}/`;
  console.log('');
  console.log('  ┌───────────────────────────────────────────────┐');
  console.log('  │  MIDI Studio is running                       │');
  console.log('  │                                               │');
  console.log(`  │  → ${url.padEnd(44)} │`);
  console.log('  │                                               │');
  console.log('  │  Open in Chrome / Edge / Opera (Web MIDI)     │');
  console.log('  │  Plug in your MPK Mini before loading         │');
  console.log('  │  Press Ctrl+C to stop                         │');
  console.log('  └───────────────────────────────────────────────┘');
  console.log('');
});
