import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash, randomBytes} from 'node:crypto';
import {once} from 'node:events';
import http from 'node:http';
import {createBroker, allowedURL, validateConfig, removeOwnedProfile} from './broker.mjs';
import {tmpdir} from 'node:os';

const configuration = () => ({secret: randomBytes(32).toString('hex'), port: 0, gateway: 'https://synapse.invalid', origins: ['http://127.0.0.1:3000']});
test('URL policy denies privileged schemes, credentials, lookalike origins and foreign ports', () => {
  const origins = configuration().origins;
  assert.equal(allowedURL('http://127.0.0.1:3000/test', origins), 'http://127.0.0.1:3000/test');
  for (const url of ['chrome://flags','chrome-untrusted://terminal.html','file:///etc/passwd','data:text/html,hello','javascript:alert(1)','https://example.com','http://127.0.0.1:3001','http://user:pass@127.0.0.1:3000']) assert.throws(() => allowedURL(url, origins));
  assert.throws(() => validateConfig({...configuration(), gateway:'http://127.0.0.1'}));
  assert.throws(() => validateConfig({...configuration(), secret:'weak'}));
});
test('profile cleanup refuses non-owned directories before deletion', async()=>{
  await assert.rejects(()=>removeOwnedProfile(tmpdir()));
  await assert.rejects(()=>removeOwnedProfile(process.cwd()));
});

test('real HTTP broker enforces host, origin, two credentials, scope, digest, expiry, replay and durable intent', async () => {
  const config = configuration(); let calls = [], records = [], claimsPatch = {}, upstream = [];
  const browser = {execute: async (action, input) => { calls.push({action,input}); return {observed:true}; }};
  const fetchGateway = async (url, options) => {
    upstream.push(url);
    const body = JSON.parse(options.body);
    return {ok: true, json: async () => ({claims:{aud:'nexus-developer-browser',scope:body.scope,request_sha256:body.request_sha256,sub:'test-fixture-not-production',jti:options.headers['x-cryptic-token'],exp:Math.floor(Date.now()/1000)+60,...claimsPatch}})};
  };
  const {server} = createBroker(config,{browser,fetchGateway,record:async r=>records.push(r)});
  server.listen(0,'127.0.0.1'); await once(server,'listening');
  const url = 'http://127.0.0.1:'+server.address().port;
  let serial=0;
  const request = (body={action:'browser.inspect',input:{}}, extra={}) => fetch(url+'/v1/action',{method:'POST',headers:{Authorization:'Bearer '+config.secret,'Content-Type':'application/json','x-synapse-capability':'test-fixture-'+(++serial),...extra},body:JSON.stringify(body)});
  try {
    assert.equal((await fetch(url+'/health')).status,401);
    assert.equal((await request(undefined,{Origin:'https://machackabook.github.io'})).status,403);
    const badHostStatus = await new Promise(resolve => { const req=http.request(url+'/health',{headers:{host:'attacker.invalid',Authorization:'Bearer '+config.secret}},res=>{res.resume();resolve(res.statusCode);});req.end(); });
    assert.equal(badHostStatus,403);
    assert.equal((await request(undefined,{Authorization:'Bearer wrong'})).status,401);
    assert.equal((await request(undefined,{'x-synapse-capability':''})).status,403);
    assert.equal(calls.length,0);
    for(const patch of [{aud:'wrong'},{scope:'browser.start'},{request_sha256:'wrong'},{exp:0},{exp:Math.floor(Date.now()/1000)+1000},{sub:''}]) { claimsPatch=patch; assert.equal((await request()).status,403); }
    claimsPatch={};
    const ok = await request(undefined,{'x-synapse-capability':'fixture-replay'}); assert.equal(ok.status,200); assert.equal((await ok.json()).receipt.signed,false);
    assert.equal((await request(undefined,{'x-synapse-capability':'fixture-replay'})).status,403);
    assert.equal((await request({action:'Runtime.evaluate',input:{expression:'arbitrary'}})).status,403);
    assert.equal(calls.length,1); assert.deepEqual(records.map(r=>r.phase),['authorized','completed']);
    assert.equal(upstream.every(u=>u==='https://synapse.invalid/v1/verify'),true);
    assert.equal(JSON.stringify(records).includes(config.secret),false);
  } finally { server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); }
});

test('gateway outages and provenance write failures deny execution',async()=>{
  const config=configuration(); let executions=0;
  const {server}=createBroker(config,{browser:{execute:async()=>executions++},fetchGateway:async()=>{throw new Error('offline');}});
  server.listen(0,'127.0.0.1'); await once(server,'listening');
  try { const r=await fetch('http://127.0.0.1:'+server.address().port+'/v1/action',{method:'POST',headers:{Authorization:'Bearer '+config.secret,'Content-Type':'application/json','x-synapse-capability':'fixture'},body:JSON.stringify({action:'browser.start'})});assert.equal(r.status,403);assert.equal(executions,0); }
  finally {server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('failed durable intent prevents actions and parallel requests cannot replay a capability', async()=>{
  const config=configuration();let executions=0;
  const browser={execute:async()=>{executions++;return {};}};
  const fetchGateway=async(url,options)=>({ok:true,json:async()=>({claims:{aud:'nexus-developer-browser',scope:'browser.start',request_sha256:JSON.parse(options.body).request_sha256,sub:'fixture',jti:'fixture-durable-intent',exp:Math.floor(Date.now()/1000)+60}})});
  const {server}=createBroker(config,{browser,fetchGateway,record:async()=>{throw new Error('disk_full');}});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const request=()=>fetch('http://127.0.0.1:'+server.address().port+'/v1/action',{method:'POST',headers:{Authorization:'Bearer '+config.secret,'Content-Type':'application/json','x-synapse-capability':'fixture'},body:JSON.stringify({action:'browser.start'})});
  try{const results=await Promise.all([request(),request()]);assert.ok(results.every(r=>[403,429].includes(r.status)));assert.equal(executions,0);}
  finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
