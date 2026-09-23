// Zero-dependency static server. `npm run serve` then open http://localhost:4545
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const root = new URL('..', import.meta.url).pathname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.png': 'image/png',
  '.json': 'application/json', '.css': 'text/css', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
export function serve(port = 4545) {
  const srv = createServer(async (req, res) => {
    let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    if (p.endsWith('/')) p += 'index.html';
    try {
      const body = await readFile(join(root, p));
      res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch { res.writeHead(404); res.end('not found'); }
  });
  return new Promise((ok) => srv.listen(port, () => ok(srv)));
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = +(process.env.PORT || 4545);
  await serve(port);
  console.log(`McDermott Studio film → http://localhost:${port}`);
}
