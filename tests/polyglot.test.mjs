import test from 'node:test';
import assert from 'node:assert/strict';
import { dispatchHyperterminal, describeHyperterminal, HYPERTERMINAL_VERSION } from '../polyglot/quine-os.js';

test('shared runtime announces real browser-only contract', async () => {
 const r=await dispatchHyperterminal('os status');
 assert.equal(r.handled,true);
 assert.match(r.message,/capability-deny-by-default/);
 assert.equal(describeHyperterminal().version,HYPERTERMINAL_VERSION);
});
test('AEON and Gemini requests do not fabricate inference', async () => {
 for(const command of ['/aeon test', '/duality test', '/gemini test','peer aeon']){
   const r=await dispatchHyperterminal(command);
   assert.equal(r.handled,true);
   assert.equal(r.kind,'warn');
   assert.match(r.message,/NOT_CONFIGURED/);
 }
});
test('native and swarm requests never emit fake success', async () => {
 for(const command of ['adb connect 10.0.0.1','ota flash','swarm reoptimize','battalion deploy','consensus vote']){
  const r=await dispatchHyperterminal(command);
  assert.equal(r.handled,true);
  assert.match(r.message,/NOT_CONFIGURED/);
 }
});
test('source contract reports truthful quine semantics', async () => {
 const r=await dispatchHyperterminal('quine status');
 assert.equal(r.handled,true);
 assert.match(r.message,/not a self-hosted OS or fixed-point quine/);
});
test('unknown commands remain available to existing verified UI operations', async () => {
 const r=await dispatchHyperterminal('panel show terminal');
 assert.equal(r.handled,false);
});
test('verification never implies ADAM production success', async () => {
 const r=await dispatchHyperterminal('gaia verify');
 assert.equal(r.handled,true);
 assert.equal(r.value.productionVerified,false);
});
