import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,symlink,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createStaticHandler} from '../server.js';

async function request(handler,url,method='GET') {
  const response = {headers:{},statusCode:0,body:undefined,setHeader(name,value){this.headers[name.toLowerCase()]=value;},end(body){this.body=body;}};
  await handler({url,method},response);
  return response;
}
test('real public UI, configs and operator docs render with hardened headers', async () => {
  const handler = createStaticHandler();
  for (const url of ['/','/security/','/security/console.js','/ui/dashboard.js','/magic/','/terminal/','/living-ledger/v1/','/config/document-provenance.public.json','/config/device-profiles.public.json','/config/vpn-integration.public.json','/config/network-security.public.json','/config/auth-integrations.public.json','/docs/SECURITY-OPERATIONS.md']) {
    const response = await request(handler,url);
    assert.equal(response.statusCode,200,url);
    assert.ok(response.body.length > 0,url);
    assert.equal(response.headers['x-content-type-options'],'nosniff');
    assert.equal(response.headers['referrer-policy'],'no-referrer');
    assert.equal(response.headers['cache-control'],'no-store');
    assert.equal(response.headers['content-length'],response.body.length);
  }
  assert.match((await request(handler,'/config/device-profiles.public.json')).headers['content-type'],/^application\/json/);
  assert.match((await request(handler,'/docs/SECURITY-OPERATIONS.md')).headers['content-type'],/^text\/plain/);
});
test('HEAD preserves GET metadata while returning no body; query parameters do not change the file', async () => {
  const handler = createStaticHandler();
  const get = await request(handler,'/panel.html?module=terminal');
  const head = await request(handler,'/panel.html?module=terminal','HEAD');
  assert.equal(get.statusCode,200);
  assert.equal(head.statusCode,200);
  assert.equal(head.body,undefined);
  assert.deepEqual(head.headers,get.headers);
  const redirect = await request(handler,'/security?view=registry');
  assert.equal(redirect.statusCode,308);
  assert.equal(redirect.headers.location,'/security/?view=registry');
});
test('only GET and HEAD are allowed and private source paths never receive fallback HTML', async () => {
  const handler = createStaticHandler();
  for (const method of ['POST','PUT','DELETE','OPTIONS']) {
    const response = await request(handler,'/',method);
    assert.equal(response.statusCode,405);
    assert.equal(response.headers.allow,'GET, HEAD');
  }
  for (const url of ['/server.js','/package.json','/runtime/bridge.mjs','/scripts/verify.mjs','/tests/security.test.mjs','/config/private.json','/config/no-such.public.json','/unknown-route','/security/missing-route','/modules/private.js','/.env','/.git/config','/ui/']) {
    const response = await request(handler,url);
    assert.equal(response.statusCode,404,url);
    assert.equal(String(response.body),'Not Found');
  }
});
test('malformed encodings, controls and traversal are rejected before URL normalization', async () => {
  const handler = createStaticHandler();
  for (const url of ['/../server.js','/%2e%2e/server.js','/ui/../../server.js','/ui/%2e%2e/%2e%2e/server.js','/ui//dashboard.js','/ui/.secret.js']) assert.equal((await request(handler,url)).statusCode,404,url);
  for (const url of ['/%ZZ','/%00','/%252e%252e/server.js','/ui%5c..%5cserver.js','https://hostile.test/','//hostile.test/','/index.html#fragment']) assert.equal((await request(handler,url)).statusCode,400,url);
});
test('files and ancestor directories reached through symlinks are denied without listening', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(),'cryptic-static-'));
  t.after(() => rm(root,{recursive:true,force:true}));
  await mkdir(path.join(root,'ui'));
  await mkdir(path.join(root,'outside'));
  await writeFile(path.join(root,'outside','leak.js'),'private data');
  await writeFile(path.join(root,'ui','normal.js'),'safe data');
  await symlink(path.join(root,'outside','leak.js'),path.join(root,'ui','leak.js'));
  await symlink(path.join(root,'outside'),path.join(root,'ui','linked'));
  const handler = createStaticHandler({root});
  assert.equal((await request(handler,'/ui/normal.js')).statusCode,200);
  assert.equal((await request(handler,'/ui/leak.js')).statusCode,404);
  assert.equal((await request(handler,'/ui/linked/leak.js')).statusCode,404);
});
