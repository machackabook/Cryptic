#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const terminal=read('core/terminal-core.js'),bus=read('cryptic-bus.js'),sw=read('sw.js'),bridge=read('runtime/bridge.mjs'),magic=read('magic/magic.js');
assert(!/d\.innerHTML\s*=\s*String\(text\)/.test(terminal),'terminal must not interpret user HTML');
assert(!/sessionStorage\.setItem\('cryptic\.bridge\.secret'/.test(terminal),'bridge secret must stay ephemeral');
assert(bus.includes('CrypticBridgeSession'),'bus must use ephemeral session');
assert(terminal.includes('ADAM_PROOF_PENDING'),'GAIA observations must not be production proof');
assert(sw.includes("url.origin!==APP_SCOPE.origin"),'service worker origin restriction required');
assert(sw.includes('STATIC.has(url.href)'),'service worker asset allowlist required');
assert(bridge.includes('origin_denied'),'bridge must check Origin');
assert(!magic.includes('allow-scripts allow-same-origin'),'sandbox must have opaque origin');
assert(magic.includes('Unapproved embedded surface'),'iframe allowlist required');
assert(read('interfaces/genie-djinn.html').includes('span.textContent'),'Genie text DOM rendering required');
console.log('Cryptic static security invariants PASS (not live deployment proof).');
