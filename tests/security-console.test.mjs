import test from 'node:test';
import assert from 'node:assert/strict';
import {createSecurityClient,validateEndpoint,validateTelemetry,sanitizeExport,canAction} from '../security/console.js';
test('endpoint validation rejects normalized, credential-bearing and untrusted destinations',()=>{
 assert.equal(validateEndpoint('http://127.0.0.1:7443'),'http://127.0.0.1:7443');
 for(const value of ['http://127.1:7443','http://example.com','https://a:b@security.example.com','https://security.example.com/path','https://security.example.com?token=x','https://security.example.com/#x'])assert.throws(()=>validateEndpoint(value,{trustedHttps:true}));
 assert.throws(()=>validateEndpoint('https://security.crypticnews.org'));
 assert.equal(validateEndpoint('https://security.crypticnews.org',{trustedHttps:true}),'https://security.crypticnews.org');
});
test('UI metric checks keep out-of-reference observations visible and omit sensitive exports',()=>{
 assert.deepEqual(validateTelemetry({temperatureC:95},['temperatureC'],{temperatureC:{max:85}}),{temperatureC:95});
 assert.throws(()=>validateTelemetry({latitude:1},['temperatureC']));assert.throws(()=>validateTelemetry({connected:'true'},['connected']));
 const result=sanitizeExport({token:'secret',latitude:1,ok:true,nested:{operators:['private@example.com'],hash:'a'.repeat(64)}});
 assert.equal(result.token,undefined);assert.equal(result.latitude,undefined);assert.equal(result.nested.operators,undefined);assert.ok(result.nested.hash);
 assert.equal(canAction({connected:false,busy:false},'register'),false);assert.equal(canAction({connected:true,busy:false},'dnsAudit'),false);
});
test('client connects, routes every action with freshness, revokes and clears session state',async()=>{
 const calls=[];const status={automation:{running:false,intervalMs:15000},vpn:{status:'unverified'}};
 const fetchImpl=async(url,options)=>{
  calls.push({url,options});const suffix=new URL(url).pathname.replace('/api/security','');let payload;
  if(options.method==='POST')payload=suffix==='/devices'?{deviceToken:'test-device-once-token-'.repeat(2)}:suffix==='/vpn/plan'?{plan:{applied:false}}:{accepted:true};
  else payload=suffix==='/status'?{status}:suffix==='/profiles'?{profiles:[],sources:[]}:suffix==='/devices'?{devices:[]}:suffix==='/vpn'?{vpn:{status:'unverified'}}:suffix==='/export'?{evidence:{productionVerified:false,secret:'private'}}:{};
  return new Response(JSON.stringify({ok:true,...payload}));
 };
 const client=createSecurityClient({fetchImpl});await client.connect('http://127.0.0.1:7443','operator-test-credential-'.repeat(2));assert.equal(client.snapshot().connected,true);
 await client.register({id:'device-one',name:'One',profileId:'gaia',reviewed:true});
 await client.ingest('device-one',{observedAt:new Date().toISOString(),metrics:{connected:true}},'scoped-device-test-'.repeat(3));
 await client.revoke('device-one');await client.automation('start');await client.automation('config',{intervalMs:5000});await client.automation('stop');await client.audit('offline');await client.audit('dns');await client.vpnPlan({provider:'cloudflare',cidr:'10.24.0.0/24',operators:['operator@example.invalid']});
 const exported=await client.exportEvidence();assert.equal(exported.evidence.secret,undefined);
 const posts=calls.filter(x=>x.options.method==='POST');assert.equal(posts.length,9);
 for(const c of posts){assert.match(c.options.headers['X-Cryptic-Request-Id'],/^[a-f0-9-]{36}$/);assert.ok(c.options.headers['X-Cryptic-Timestamp']);assert.equal(c.options.redirect,'error');assert.equal(c.options.cache,'no-store');assert.equal(c.options.credentials,'omit')}
 assert.ok(posts.find(c=>c.url.endsWith('/telemetry')).options.headers.Authorization.includes('scoped-device-test'));
 client.disconnect();assert.equal(client.snapshot().connected,false);await assert.rejects(client.refresh(),e=>e.code==='not_connected');
});
test('failed connection and late response cannot restore a disconnected session',async()=>{
 const bad=createSecurityClient({fetchImpl:async()=>new Response('{}',{status:401})});await assert.rejects(bad.connect('http://localhost:7443','long-operator-credential'),e=>e.code==='access_denied');assert.equal(bad.snapshot().connected,false);
 let release;const gate=new Promise(r=>release=r);const client=createSecurityClient({fetchImpl:async()=>{await gate;return new Response(JSON.stringify({ok:true,status:{},profiles:[],devices:[]}))}});
 const connecting=client.connect('http://localhost:7443','test-operator-credential');client.disconnect();release();await assert.rejects(connecting);assert.equal(client.snapshot().connected,false);
});
