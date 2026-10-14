import { createServer } from 'node:http';
import { routeCloud } from './cloud-api.mjs';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = process.cwd(), args = process.argv.slice(2);
const value = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const port = Number(value('--port', '4173')), host = value('--host', '0.0.0.0');
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
createServer(async (req, res) => {
  try {
    if (await routeCloud(req, res)) return;
    let path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://preview.local').pathname));
    if (path !== root && !path.startsWith(root + sep)) throw Error('Forbidden');
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    const body = await readFile(path);
    res.writeHead(200, { 'Content-Type': (mime[extname(path)] || 'application/octet-stream') + (['.js', '.css', '.html', '.svg'].includes(extname(path)) ? '; charset=utf-8' : ''), 'Cache-Control': 'no-store' });
    res.end(body);
  } catch (_) { res.writeHead(404); res.end('Not found'); }
}).listen(port, host, () => console.log(`Preview running on port ${port}`));
