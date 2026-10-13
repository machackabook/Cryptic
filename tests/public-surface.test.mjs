import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

const read = p => readFile(new URL('../' + p, import.meta.url), 'utf8');

test('public entry has restrictive CSP, no external script dependency, and keyboard bypass', async () => {
  const html = await read('index.html');
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /script-src 'self'/);
  assert.match(html, /object-src 'none'/);
  assert.match(html, /base-uri 'self'/);
  assert.match(html, /href="#snapGrid">Skip to command dashboard/);
  const scriptSources = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)/gi)].map(m => m[1]);
  assert.ok(scriptSources.every(src => !/^https?:/i.test(src)), 'boot scripts must be same-origin');
  const csp = html.match(/Content-Security-Policy[^>]*content="([^"]+)"/i)?.[1] || '';
  assert.ok(!/localhost:\*/i.test(csp), 'local connections must not allow every port');
});

test('published response headers and crawler policy make boundaries explicit', async () => {
  const headers = await read('_headers');
  const robots = await read('robots.txt');
  const policy = JSON.parse(await read('.well-known/ai-access-policy.json'));
  assert.match(headers, /X-Content-Type-Options:\s*nosniff/i);
  assert.match(headers, /Referrer-Policy:\s*no-referrer/i);
  assert.match(headers, /frame-ancestors 'none'/i);
  assert.match(headers, /X-Robots-Tag:\s*noindex/i);
  assert.match(robots, /User-agent:\s*GPTBot[\s\S]*?Disallow:\s*\//i);
  assert.equal(policy.ai_access.default, 'denied');
  assert.match(policy.notice, /not an authentication protocol/i);
});

test('main page navigation, page targets, and panel controls are wired in source', async () => {
  const html = await read('index.html');
  const js = await read('ui/dashboard.js');
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  const tabs = [...html.matchAll(/data-page="([^"]+)"/g)].map(m => m[1]);
  const shortcuts = [...html.matchAll(/data-go="([^"]+)"/g)].map(m => m[1]);
  assert.ok(tabs.length >= 5);
  for (const id of tabs) assert.ok(ids.has(id), 'missing page target for tab ' + id);
  for (const id of shortcuts) assert.ok(ids.has(id), 'missing page target for shortcut ' + id);
  for (const control of ['ghost', 'collapse', 'hide', 'duplicate', 'pop']) {
    assert.ok(js.includes('data-panel="' + control + '"'), 'missing control ' + control);
  }
  assert.ok(js.includes("q('[data-panel="), 'missing scoped panel-control selectors');
  assert.ok(js.includes("addEventListener('click'"), 'missing click handlers');
  assert.match(js, /Pop-up blocked; opened an in-page panel instead/);
  assert.match(js, /dashboard could not initialize/);
});

test('every manifest module asset and controller exists in the published tree', async () => {
  const manifest = JSON.parse(await read('modules/manifest.json'));
  assert.ok(manifest.modules.length >= 10);
  const paths = new Set();
  for (const mod of manifest.modules) {
    assert.ok(mod.id && mod.file, 'module has id and file');
    assert.ok(!paths.has(mod.id), 'duplicate module id ' + mod.id);
    paths.add(mod.id);
    await access(new URL('../' + mod.file.replace(/^\.\//, ''), import.meta.url));
    if (mod.controller) await access(new URL('../' + mod.controller.replace(/^\.\//, ''), import.meta.url));
  }
  const panel = await read('ui/panel.js');
  assert.match(panel, /manifest\.modules\.find/);
  assert.match(panel, /closePanel/);
});

test('runtime does not expose synthetic verification claims or persist token/raw intent payloads', async () => {
  const core = await read('core/terminal-core.js');
  assert.ok(!core.includes('AAAAC3NzaC1lZDI1NTE5AAAAIGteDQk53+YlXIALXcls03EZ3B7IXdgYr+knG5dYZuUt'));
  assert.ok(!core.includes('SOVEREIGN CONTINUITY VERIFIED'));
  assert.ok(!core.includes('14/14 checks passed'));
  assert.ok(!core.includes('720 nodes, Sigma throughput'));
  assert.ok(!core.includes("sessionStorage.setItem('cryptic.runtime.tokens'"));
  assert.match(core, /const escaped=String\(text\)\.replace/);
  assert.match(core, /const allowed=new Set/);
  assert.match(core, /BLOCKED_MISSING_PRODUCTION_EVIDENCE/);
});
