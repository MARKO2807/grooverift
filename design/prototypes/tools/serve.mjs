// Usage: node design/prototypes/tools/serve.mjs [port]   (default 8080)
// Read-only static server for testing the prototypes on a phone on the owner's home network (no internet exposure).
// Serves only the design/ folder, GET and HEAD only, no directory listings, no path traversal. Zero dependencies.
// Always stop it after the test (Ctrl+C, or stop the process) and confirm the port is closed.
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..'); // design/
const port = Number(process.argv[2]) || 8080;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8' };

createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end(); }
  let path;
  try { path = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400); return res.end(); }
  if (path === '/') { res.writeHead(302, { Location: '/prototypes/pulse/viewer.html' }); return res.end(); }
  const file = normalize(join(root, path));
  if (!file.startsWith(root + sep)) { res.writeHead(403); return res.end(); }
  let st; try { st = statSync(file); } catch { res.writeHead(404); return res.end('Not found'); }
  if (!st.isFile()) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  if (req.method === 'HEAD') return res.end();
  createReadStream(file).pipe(res);
  console.log(new Date().toISOString().slice(11, 19), req.socket.remoteAddress, path);
}).listen(port, '0.0.0.0', () => {
  const ips = Object.values(networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
  console.log(`Serving ${root} on port ${port} (read-only). Open on the phone:`);
  for (const ip of ips) console.log(`  http://${ip}:${port}/prototypes/pulse/index.html`);
  console.log('Stop with Ctrl+C when done.');
});
