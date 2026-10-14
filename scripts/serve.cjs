'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4173);
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.md':'text/plain; charset=utf-8','.json':'application/json; charset=utf-8'};
const publicFiles = new Set(['index.html', 'README.md', 'docs/accuracy.md', 'dist/lunar_birthday_calculator.html',
  'src/calendar.js', 'src/csv.js', 'src/app.js', 'src/styles.css']);
const server = http.createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  let relative;
  try { relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1) || 'index.html'; }
  catch { res.writeHead(400); res.end('Bad request'); return; }
  if (!publicFiles.has(relative)) { res.writeHead(404); res.end('Not found'); return; }
  fs.readFile(path.join(root, relative), (error, data) => {
    if (error) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, {'Content-Type': types[path.extname(relative)] || 'application/octet-stream', 'Cache-Control':'no-store'});
    res.end(req.method === 'HEAD' ? undefined : data);
  });
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`打开 http://127.0.0.1:${port}；Ctrl+C 停止。`));
