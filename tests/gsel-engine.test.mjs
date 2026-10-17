import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('GSEL engine is a same-origin externalized surface with no unsafe sinks', async () => {
  const html = await read('interfaces/gsel-wave-gradient-engine.html');
  const markup = await read('modules/gsel.html');
  const script = await read('modules/gsel.js');
  const css = await read('interfaces/gsel-wave-gradient-engine.css');
  assert.match(html, /script-src 'self'/);
  assert.match(html, /style-src 'self'/);
  assert.match(html, /connect-src 'self'/);
  assert.match(markup, /interfaces\\/gsel-wave-gradient-engine\\.css/);
  assert.match(html, /modules\/gsel\.js/);
  assert.doesNotMatch(html, /fonts\.googleapis|fonts\.gstatic|<style\b/i);
  assert.doesNotMatch(html, /\son(?:click|input|change|load|error)\s*=/i);
  assert.doesNotMatch(markup, /\son(?:click|input|change|load|error)\s*=/i);
  assert.doesNotMatch(script, /\.innerHTML\s*=|localStorage|sessionStorage|fetch\s*\(/);
  assert.match(script, /replaceChildren\(\)/);
  assert.match(script, /MAX_TEXT = 240/);
  assert.match(css, /@media/);
});

test('GSEL engine exposes all bounded controls and telemetry surfaces', async () => {
  const markup = await read('modules/gsel.html');
  for (const role of ['seed','frequency','speed','amplitude','saturation','brightness','font','canvas','status','fps','time','resolution','mouse','matrix','inspector']) {
    assert.match(markup, new RegExp(`data-gsel-role="${role}"`), `missing GSEL role ${role}`);
  }
  assert.match(markup, /maxlength="240"/);
  assert.match(markup, /data-palette="3"/);
});
