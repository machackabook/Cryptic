import http from 'node:http';
import {createHash, timingSafeEqual, randomUUID} from 'node:crypto';
import {readFile, mkdtemp, rm, appendFile, mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const fail = (code) => { throw new Error(code); };
export async function removeOwnedProfile(profile) {
  const resolved = path.resolve(profile);
  if (path.dirname(resolved) !== path.resolve(tmpdir()) || !/^nexus-(?:dev-browser|lighthouse)-[a-zA-Z0-9]+$/.test(path.basename(resolved))) fail('profile_cleanup_path_denied');
  await rm(resolved, {recursive: true, force: true, maxRetries: 4, retryDelay: 300});
}
export function allowedURL(value, origins) {
  const u = new URL(value);
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || !origins.includes(u.origin)) fail('url_not_allowed');
  return u.href;
}
export function validateConfig(c) {
  if (typeof c.secret !== 'string' || Buffer.byteLength(c.secret) < 32) fail('local_secret_required');
  if (!Number.isInteger(c.port) || c.port < 0 || c.port > 65535) fail('invalid_port');
  const g = new URL(c.gateway);
  if (g.protocol !== 'https:' || g.username || g.password || g.search || g.hash || g.pathname !== '/') fail('https_gateway_origin_required');
  if (!Array.isArray(c.origins) || !c.origins.length) fail('preview_origins_required');
  for (const origin of c.origins) if (new URL(origin).origin !== origin) fail('exact_origin_required');
  c.gateway = g.origin;
  return c;
}

// Playwright owns the private CDP pipe; the broker exposes no raw CDP endpoint.
export class DeveloperBrowser {
  constructor(config) { this.config = config; }
  async start() {
    if (this.cdp || this.profile) fail('browser_or_cleanup_already_pending');
    const {executable, executableSHA256} = this.config;
    if (!executable || !path.isAbsolute(executable) || !/^[a-f0-9]{64}$/.test(executableSHA256 || '')) fail('verified_browser_binary_required');
    const hash = createHash('sha256').update(await readFile(executable)).digest('hex');
    if (hash !== executableSHA256) fail('browser_binary_hash_mismatch');
    this.profile = await mkdtemp(path.join(tmpdir(), 'nexus-dev-browser-'));
    try {
      const {chromium} = await import(this.config.playwrightModule || 'playwright-core');
      const nativeEnv = Object.fromEntries(['PATH','SystemRoot','WINDIR','SystemDrive','ComSpec','ProgramFiles','ProgramFiles(x86)','LOCALAPPDATA','APPDATA','USERPROFILE'].filter(key => process.env[key] !== undefined).map(key => [key, process.env[key]]));
      this.context = await chromium.launchPersistentContext(this.profile, {executablePath: executable, headless: Boolean(this.config.headless), timeout: 60000, chromiumSandbox: true, acceptDownloads: false, serviceWorkers: 'block', permissions: [], ignoreDefaultArgs: ['--unsafely-disable-devtools-self-xss-warnings','--enable-unsafe-swiftshader','--disable-popup-blocking'], args: ['--disable-sync', '--disable-extensions', '--disable-background-networking'], env: {...nativeEnv, HOME: tmpdir(), TEMP: tmpdir(), TMP: tmpdir()}});
      this.page = await this.context.newPage();
      this.cdp = await this.context.newCDPSession(this.page);
      this.context.on('close', () => { if (this.cdp) this.cdp.closed = true; });
      return {connected: true, version: await this.cdp.send('Browser.getVersion'), transport: 'private-pipe', credentialStore: 'ephemeral-profile'};
    } catch (e) { try { await this.stop(); } catch (cleanupError) { e.cleanupError = cleanupError; } throw e; }
  }
  async execute(action, input) {
    if (action === 'browser.lighthouse') {
      if (!this.config.enableLighthouse) fail('lighthouse_disabled');
      const {audit} = await import('./audit/lighthouse.mjs');
      return audit(this.config, input);
    }
    if (action === 'browser.start') return this.start();
    if (action === 'browser.stop') { await this.stop(); return {connected: false}; }
    if (!this.cdp || this.cdp.closed) fail('browser_not_connected');
    const send = (method, params) => this.cdp.send(method, params);
    if (action === 'browser.navigate') return send('Page.navigate', {url: allowedURL(input.url, this.config.origins)});
    if (action === 'browser.inspect') return send('DOM.getDocument', {depth: 2, pierce: false});
    if (action === 'browser.throttle') {
      const profiles = {normal: {offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1}, slow3g: {offline: false, latency: 400, downloadThroughput: 50000, uploadThroughput: 50000}, offline: {offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0}};
      if (!Object.hasOwn(profiles, input.profile)) fail('invalid_throttle_profile');
      await send('Network.enable', {});
      return send('Network.emulateNetworkConditions', profiles[input.profile]);
    }
    fail('action_not_allowed');
  }
  async stop() {
    await this.context?.close(); this.context = null; this.cdp = null;
    if (this.profile) { await removeOwnedProfile(this.profile); this.profile = null; }
  }
}

export function createBroker(config, {browser = new DeveloperBrowser(config), fetchGateway = fetch, record = async () => {}} = {}) {
  validateConfig(config);
  const used = new Map(); let busy = false;
  const actions = new Set(['browser.start', 'browser.stop', 'browser.navigate', 'browser.inspect', 'browser.throttle', 'browser.lighthouse', 'mcp.request', 'gemini.request']);
  const server = http.createServer(async (req, res) => {
    const reply = (status, data) => { res.writeHead(status, {'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'}); res.end(JSON.stringify(data)); };
    const expectedHost = '127.0.0.1:' + server.address().port;
    const origin = 'http://' + expectedHost;
    if (req.headers.host !== expectedHost || (req.headers.origin !== undefined && req.headers.origin !== origin) || (req.headers['sec-fetch-site'] !== undefined && !['same-origin','none'].includes(req.headers['sec-fetch-site']))) return reply(403, {error: 'native_client_required'});
    const assets = {'/': ['index.html', 'text/html'], '/panel.js': ['panel.js', 'text/javascript'], '/panel.css': ['panel.css', 'text/css']};
    if (req.method === 'GET' && Object.hasOwn(assets, req.url)) {
      const [name, type] = assets[req.url];
      const content = await readFile(new URL('./panel/' + name, import.meta.url));
      res.writeHead(200, {'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options':'nosniff', 'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'", 'Referrer-Policy':'no-referrer'});res.end(content);return;
    }
    const a = Buffer.from(req.headers.authorization || ''), b = Buffer.from('Bearer ' + config.secret);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return reply(401, {error: 'local_auth_required'});
    if (req.method === 'GET' && req.url === '/health') return reply(200, {service: 'nexus-developer-browser', connected: Boolean(browser.cdp && !browser.cdp.closed), cleanupPending: Boolean(browser.profile && !browser.cdp), actions: [...actions], lighthouse: config.enableLighthouse ? 'enabled_not_verified' : 'disabled', signaling: 'disabled', pstn: 'not_configured'});
    if (req.method !== 'POST' || req.url !== '/v1/action') return reply(404, {error: 'not_found'});
    if (busy) return reply(429, {error: 'operation_in_progress'});
    busy = true;
    try {
      if (!(req.headers['content-type'] || '').startsWith('application/json')) { reply(415, {error: 'json_required'}); return; }
      let chunks = [], size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 32768) fail('body_too_large'); chunks.push(chunk); }
      const body = JSON.parse(Buffer.concat(chunks).toString());
      if (!actions.has(body.action)) fail('action_not_allowed');
      const token = req.headers['x-synapse-capability'];
      if (typeof token !== 'string' || token.length > 8192) fail('capability_required');
      // A SYNAPSE/aiohttp deployment must implement this contract. No local minting or OAuth bypass.
      const digest = createHash('sha256').update(JSON.stringify(body)).digest('hex');
      const verification = await fetchGateway(config.gateway + '/v1/verify', {method: 'POST', redirect: 'error', signal: AbortSignal.timeout(5000), headers: {'Content-Type': 'application/json', 'x-cryptic-token': token}, body: JSON.stringify({audience: 'nexus-developer-browser', scope: body.action, request_sha256: digest})});
      if (!verification.ok) fail('gateway_denied');
      const {claims: c} = await verification.json(); const now = Math.floor(Date.now() / 1000);
      for (const [id, exp] of used) if (exp <= now) used.delete(id);
      if (!c || c.aud !== 'nexus-developer-browser' || c.scope !== body.action || c.request_sha256 !== digest || typeof c.sub !== 'string' || !c.sub || typeof c.jti !== 'string' || !c.jti || c.jti.length > 200 || !Number.isFinite(c.exp) || c.exp <= now || c.exp > now + 120 || used.has(c.jti) || used.size >= 4096) fail('invalid_or_replayed_capability');
      used.set(c.jti, c.exp);
      const id = randomUUID();
      // Intent must be durable before a side effect. Logs omit tokens, prompts, DOM and URL contents.
      await record({id, action: body.action, phase: 'authorized', at: new Date().toISOString()});
      let result;
      if (body.action === 'mcp.request' || body.action === 'gemini.request') {
        const endpoint = body.action === 'mcp.request' ? '/v1/mcp' : '/v1/gemini';
        const upstream = await fetchGateway(config.gateway + endpoint, {method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000), headers: {'Content-Type': 'application/json', 'x-cryptic-token': token}, body: JSON.stringify({request: body.input, authorization_jti: c.jti, request_sha256: digest})});
        if (!upstream.ok) fail('upstream_failed'); result = await upstream.json();
      } else result = await browser.execute(body.action, body.input || {});
      await record({id, action: body.action, phase: 'completed', at: new Date().toISOString()});
      reply(200, {ok: true, result, receipt: {id, action: body.action, source: 'local-execution', signed: false}});
    } catch (error) { reply(403, {ok: false, error: 'operation_denied_or_failed', detail: /^[a-z_]+$/.test(error.message) ? error.message : 'request_failed'}); }
    finally { busy = false; }
  });
  server.requestTimeout = 10000; server.headersTimeout = 5000; server.maxHeadersCount = 24;
  return {server, browser};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const config = {secret: process.env.NEXUS_BROKER_SECRET, port: Number(process.env.NEXUS_BROKER_PORT || 7341), gateway: process.env.NEXUS_GATEWAY, origins: (process.env.NEXUS_PREVIEW_ORIGINS || 'http://127.0.0.1:3000').split(','), executable: process.env.NEXUS_CHROME_PATH, executableSHA256: process.env.NEXUS_CHROME_SHA256, headless: process.env.NEXUS_HEADLESS === '1'};
  const logDir = process.env.NEXUS_RECEIPT_DIR;
  config.enableLighthouse = process.env.NEXUS_ENABLE_LIGHTHOUSE === '1'; config.receiptDir = logDir;
  if (!logDir || !path.isAbsolute(logDir)) fail('private_receipt_directory_required');
  await mkdir(logDir, {recursive: true, mode: 0o700});
  const {server, browser} = createBroker(config, {record: record => appendFile(path.join(logDir, 'developer-browser.jsonl'), JSON.stringify(record) + '\n', {mode: 0o600})});
  server.listen(config.port, '127.0.0.1', () => console.log('NEXUS broker listening on loopback port ' + server.address().port));
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { server.close(); await browser.stop(); });
}
