import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {webcrypto} from 'node:crypto';
const src=readFileSync(new URL('../cloudflare/showcase-router.js',import.meta.url),'utf8');
let cb;
runInNewContext(src,{URL,Request,Response,TextEncoder,crypto:webcrypto,btoa:x=>Buffer.from(x,'binary').toString('base64'),addEventListener:(n,x)=>{if(n==='fetch')cb=x},fetch:async()=>new Response('PRESERVED_ORIGIN'),setTimeout,clearTimeout},{timeout:2000});
function visit(path){let p;cb({request:new Request('https://crypticnews.org'+path),respondWith:x=>{p=x}});return p}
test('staging presents hashed-CSP Polyglot Quine torus terminal',async()=>{const r=await visit('/nexus/');assert.equal(r.status,200);assert.match(r.headers.get('content-security-policy'),/script-src 'sha256-/);const html=await r.text();assert.match(html,/POLYGLOT QUINE OS/);assert.match(html,/gl\.drawElements/);assert.match(html,/getUserMedia/);assert.doesNotMatch(html,/DragonRider/);});
test('origin remains untouched during staging',async()=>{assert.equal(await (await visit('/')).text(),'PRESERVED_ORIGIN');assert.equal(await (await visit('/os/')).text(),'PRESERVED_ORIGIN')});
test('no configured key grants session access',async()=>{const r=await visit('/nexus/api/session');assert.deepEqual(JSON.parse(await r.text()),{authorized:false,keyConfigured:false,mode:'public-key-gate'})});
test('Gemini is denied without authenticated session',async()=>{const r=await visit('/nexus/api/model-status');assert.equal(r.status,401)});
