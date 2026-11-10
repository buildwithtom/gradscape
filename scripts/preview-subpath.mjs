// Production-only QA server: mirrors a GitHub Pages repository path.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const prefix = '/study-abroad-comparator/';
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};
createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (!pathname.startsWith(prefix)) {
      res.writeHead(404);
      res.end('Use ' + prefix);
      return;
    }
    const relative = decodeURIComponent(pathname.slice(prefix.length)) || 'index.html';
    const file = path.resolve('dist', relative);
    if (!file.startsWith(path.resolve('dist') + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(4173, '127.0.0.1', () =>
  console.log('Production QA: http://127.0.0.1:4173/study-abroad-comparator/'),
);
