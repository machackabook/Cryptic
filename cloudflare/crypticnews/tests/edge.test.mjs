import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.mjs';
const call=(path,init)=>worker.fetch(new Request('https://crypticnews.org'+path,init),{});
test('public pages respond with canonical HTML and protection headers',async()=>{
 for(const path of ['/','/news/','/apps/','/agents/','/docs/']){
  const r=await call(path);assert.equal(r.status,200,path);
  assert.match(await r.text(),/crypticnews\.org/);assert.match(r.headers.get('content-security-policy'),/frame-ancestors/);
 }
});
test('public APIs report unconfigured dependencies honestly',async()=>{
 const r=await call('/api/public/status');const j=await r.json();
 assert.equal(r.status,200);assert.equal(j.models,'NOT_CONNECTED');assert.equal(j.privateGateway,'NOT_EXPOSED');
});
test('privileged, mutating and directory traversal paths blocked',async()=>{
 for(const p of ['/api/private/session','/internal/status','/enclave/mount','/rpc/execute','/.env'])assert.equal((await call(p)).status,404,p);
 assert.equal((await call('/api/public/status',{method:'POST'})).status,405);
});
test('link and crawler documents have declared sources',async()=>{
 assert.match(await (await call('/robots.txt')).text(),/Sitemap:/);
 assert.match(await (await call('/sitemap.xml')).text(),/hyperterminal/);
 assert.match(await (await call('/llms.txt')).text(),/github\.com\/machackabook/);
 const cat=await (await call('/api/public/catalog')).json();
 assert.ok(cat.products.length>=3);
});
test('HyperTerminal deployment never claims success without assets',async()=>{
 const r=await call('/hyperterminal/');assert.equal(r.status,503);
 assert.match(await r.text(),/release pending/i);
});
