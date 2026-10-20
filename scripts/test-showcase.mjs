import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {webcrypto} from 'node:crypto';
import {TextEncoder} from 'node:util';

const source = readFileSync(new URL('../cloudflare/showcase-router.js', import.meta.url),'utf8');
let listener, passthroughCalls = 0;
const stub = async request => {
  passthroughCalls += 1;
  return new Response('ORIGINAL OS WORKER PASSTHROUGH: '+new URL(request.url).pathname,{status:200,headers:{'x-origin':'preserved'}});
};
runInNewContext(source,{
  URL, Response, Request, TextEncoder, crypto:webcrypto,
  btoa:s=>Buffer.from(s,'binary').toString('base64'),
  addEventListener(type,handler){if(type==='fetch')listener=handler},
  fetch:stub
},{timeout:1500});
assert.equal(typeof listener,'function');

async function visit(path, method='GET'){
  let promise;
  listener({request:new Request('https://crypticnews.org'+path,{method}),respondWith(p){promise=p}});
  return await promise;
}

test('public homepage returns a real interactive showcase',async()=>{
  const r=await visit('/');
  assert.equal(r.status,200);assert.equal(r.headers.get('x-cryptic-route'),'showcase-v1');
  const html=await r.text();
  for(const token of ['INVENT.','/os/','MODEL FOUNDRY','ADAM','id="cosmos"','id="capability-output"'])
    assert.ok(html.toUpperCase().includes(token.toUpperCase()),token);
});

test('staging /nexus/ uses same showcase',async()=>{
  const r=await visit('/nexus/'); assert.equal(r.status,200);
  assert.match(await r.text(),/GAIA–NEXUS–ADAM/);
});

test('OS and unknown routes pass through rather than overwriting original',async()=>{
  passthroughCalls=0;
  const r=await visit('/os/');
  assert.equal(r.headers.get('x-origin'),'preserved');
  assert.match(await r.text(),/ORIGINAL OS WORKER/);
  const other=await visit('/legacy-path');
  assert.equal(other.headers.get('x-origin'),'preserved');
  assert.equal(passthroughCalls,2);
});

test('headers enforce strict hashed CSP and forbid privileged permissions',async()=>{
  const r=await visit('/');
  const policy=r.headers.get('content-security-policy');
  assert.match(policy,/script-src 'sha256-[A-Za-z0-9+/=]+'/);
  assert.match(policy,/style-src 'sha256-[A-Za-z0-9+/=]+'/);
  assert.doesNotMatch(policy,/unsafe-inline|unsafe-eval/);
  assert.match(policy,/frame-ancestors 'none'/);
  assert.match(r.headers.get('permissions-policy'),/usb=\(\)/);
});

test('health response is limited to router, not native capabilities',async()=>{
  const r=await visit('/nexus/health');
  assert.equal(r.status,200);
  assert.equal((await r.json()).scope,'router-only');
});

test('source is not configured to collect visitor device data or credentials',async()=>{
  assert.doesNotMatch(source,/navigator\.geolocation\.getCurrentPosition|USBDevice\.open\(|navigator\.mediaDevices\.getUserMedia|eval\s*\(/);
  assert.doesNotMatch(source,/-----BEGIN (RSA|OPENSSH|PRIVATE) KEY-----/);
});