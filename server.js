import http from 'node:http';
import fs from 'node:fs';
import {lstat, open} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_ROOTS = new Set(['ui','core','polyglot','modules','interfaces','magic','terminal','living-ledger','security']);
const PUBLIC_FILES = new Set([
  'index.html','panel.html','manifest.webmanifest','metadata.json','robots.txt','sw.js','SECURITY.md',
  'cryptic-runtime.js','cryptic-runtime.v07.js','cryptic-bus.js','cryptic-bus.v07.js','cryptic-console.js',
  'config/nodes.public.json','config/document-provenance.public.json','config/device-profiles.public.json','config/vpn-integration.public.json',
  'config/network-security.public.json','config/auth-integrations.public.json',
  'modules/manifest.json','living-ledger/v1/catalog.public.json',
  'security/tailscale-policy.example.json','security/cloudflare-tunnel.example.json','security/github-main-ruleset.example.json','security/cryptic-security.service.example',
  'docs/SECURITY-OPERATIONS.md','docs/NETWORK-HARDENING.md','docs/DOCUMENT-EVIDENCE.md','docs/SECURITY-SERVICE.md',
  'docs/GITHUB-SECURITY-CONTROLS.md','docs/PR4-ANALYSIS.md','docs/SECURITY-REVIEW.md','docs/SECURITY-BACKLOG-10OF10.md'
]);
const TYPES = {
  '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8',
  '.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8','.example':'text/plain; charset=utf-8',
  '.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif',
  '.webp':'image/webp','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf',
  '.otf':'font/otf','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.mp4':'video/mp4','.webm':'video/webm'
};
const ROOT_EXTENSIONS = new Set(['.html','.js','.css','.svg','.png','.jpg','.jpeg','.gif','.webp','.ico','.woff','.woff2','.ttf','.otf','.mp3','.ogg','.wav','.mp4','.webm']);
function approved(relative) {
  const segments = relative.split('/');
  if (segments.some(s => !s || s.startsWith('.') || /^(private|secrets?|credentials?)(?:[.-]|$)/i.test(s)) || /\.(?:test|spec)\./i.test(relative)) return false;
  return PUBLIC_FILES.has(relative) || (PUBLIC_ROOTS.has(segments[0]) && ROOT_EXTENSIONS.has(path.extname(relative)));
}
function parsePath(requestUrl) {
  if (typeof requestUrl !== 'string' || !requestUrl.startsWith('/') || requestUrl.startsWith('//') || requestUrl.includes('#')) return {error:400};
  let pathname;
  try { pathname = decodeURIComponent(requestUrl.split('?')[0]); } catch { return {error:400}; }
  if (/[\x00-\x1f\x7f\\]/.test(pathname) || /%[0-9a-f]{2}/i.test(pathname)) return {error:400};
  if (pathname.includes('//')) return {error:404};
  const segments = pathname.split('/').filter(Boolean);
  if (segments.some(s => s.startsWith('.'))) return {error:404};
  return {relative:segments.join('/'),directory:pathname.endsWith('/')};
}
async function regularFile(root, relative) {
  const segments = relative.split('/');
  let target = root;
  for (const [index,segment] of segments.entries()) {
    target = path.join(target,segment);
    const stat = await lstat(target);
    if (stat.isSymbolicLink() || (index < segments.length - 1 && !stat.isDirectory()) || (index === segments.length - 1 && !stat.isFile())) return null;
  }
  const handle = await open(target,fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0) | (fs.constants.O_NONBLOCK || 0));
  const stat = await handle.stat();
  if (!stat.isFile()) {await handle.close();return null;}
  return {handle,stat};
}

/** Dependency-free, import-safe development handler. Only approved public assets are served. */
export function createStaticHandler({root = ROOT} = {}) {
  const base = path.resolve(root);
  return async (req,res) => {
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Cache-Control','no-store');
    const send = (status,text) => {
      res.statusCode = status;
      res.setHeader('Content-Type','text/plain; charset=utf-8');
      res.setHeader('Content-Length',Buffer.byteLength(text));
      res.end(req.method === 'HEAD' ? undefined : text);
    };
    if (!['GET','HEAD'].includes(req.method)) {res.setHeader('Allow','GET, HEAD');send(405,'Method Not Allowed');return;}
    const parsed = parsePath(req.url);
    if (parsed.error) {send(parsed.error,parsed.error === 400 ? 'Bad Request' : 'Not Found');return;}
    const relative = parsed.relative;
    const candidates = !relative ? ['index.html'] : parsed.directory ? [relative + '/index.html'] : path.extname(relative) ? [relative] : [relative + '/index.html',relative + '.html'];
    for (const candidate of candidates) {
      if (!approved(candidate)) continue;
      let file;
      try {
        file = await regularFile(base,candidate);
        if (!file) continue;
        if (relative && !parsed.directory && candidate.endsWith('/index.html')) {
          const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
          res.setHeader('Location','/' + relative + '/' + query);
          send(308,'Permanent Redirect');
          return;
        }
        res.statusCode = 200;
        res.setHeader('Content-Type',TYPES[path.extname(candidate)] || 'application/octet-stream');
        if (req.method === 'HEAD') {
          res.setHeader('Content-Length',file.stat.size);
          res.end();
        } else {
          const body = await file.handle.readFile();
          res.setHeader('Content-Length',body.length);
          res.end(body);
        }
        return;
      } catch {
        // Never disclose filesystem paths or return an unrelated HTML fallback.
      } finally {await file?.handle.close();}
    }
    send(404,'Not Found');
  };
}

export function startStaticServer() {
  const server = http.createServer(createStaticHandler());
  server.listen(3000,'127.0.0.1',() => console.log('Cryptic command center listening at http://127.0.0.1:3000'));
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) startStaticServer();
