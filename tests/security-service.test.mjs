import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import * as fs from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {createSecurityService} from '../runtime/security-service.mjs';
import {createSecurityClient} from '../security/console.js';

const manifest=JSON.parse(await fs.readFile(new URL('../config/document-provenance.public.json',import.meta.url),'utf8'));
const TOKEN='test-local-security-admin-token-'.repeat(2);
const EXPECTED_ORIGIN='http://127.0.0.1:7443';
const HARDWARE_ID='navstorm-m-23-b98-01';
const profilesConfig=JSON.parse(await fs.readFile(new URL('../config/device-profiles.public.json',import.meta.url),'utf8'));
async function simulate(handler,url,{method='GET',headers={},raw}={}){
 const req={url,method,headers:Object.fromEntries(Object.entries(headers).map(([k,v])=>[k.toLowerCase(),v])),rawHeaders:Object.entries(headers).flat(),async *[Symbol.asyncIterator](){if(raw!==undefined)yield Buffer.from(raw)}};
 let status,output,hs;const res={headersSent:false,writeHead(code,h){status=code;hs=new Headers(h);this.headersSent=true},end(value){output=value}};
 await handler(req,res);let data=output?JSON.parse(Buffer.isBuffer(output)?output.toString():output):null;return {status,headers:hs,data};
}
async function fixture(t,options={}){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'cryptic-security-test-'));
 let clock=Date.now();
 const service=await createSecurityService({root,documentManifest:manifest,token:TOKEN,now:()=>clock,...options});
 t.after(async()=>{await service.close();await fs.rm(root,{recursive:true,force:true})});
 async function request(url,{method='GET',body,token=TOKEN,headers={},raw}={}){
  const h={Host:'127.0.0.1:7443',Origin:EXPECTED_ORIGIN,Authorization:'Bearer '+token,...headers};
  if(method==='POST')Object.assign(h,{'Content-Type':'application/json','X-Cryptic-Request-Id':randomUUID(),'X-Cryptic-Timestamp':new Date(clock).toISOString()},headers);
  return simulate(service.handler,url,{method,headers:h,raw:method==='POST'?(raw===undefined?JSON.stringify(body??{}):raw):undefined});
 }
 return {root,service,request,advance:ms=>clock+=ms,time:()=>new Date(clock).toISOString()};
}
async function register(f,id='receiver-one'){
 const result=await f.request('/api/security/devices',{method:'POST',body:{id,name:'Reviewed receiver',profileId:HARDWARE_ID,reviewed:true}});
 assert.equal(result.status,201);return result.data;
}

test('API denies unauthenticated and hostile requests; source/private paths are not served',async t=>{
 const f=await fixture(t);
 const noAuth=await f.request('/api/security/status',{token:'wrong-but-long-enough-to-look-like-a-token'});assert.equal(noAuth.status,401);
 const badHost=await f.request('/api/security/status',{headers:{Host:'attacker.example'}});assert.equal(badHost.status,403);
 const badOrigin=await f.request('/api/security/status',{headers:{Origin:'https://attacker.example'}});assert.equal(badOrigin.status,403);assert.equal(badOrigin.headers.has('access-control-allow-origin'),false);
 assert.equal((await f.request('/runtime/security-service.mjs')).status,404);
 assert.equal((await f.request('/.security-private/state.json')).status,404);
 assert.equal((await f.request('/api/security/status?token=secret')).status,400);
 const status=await f.request('/api/security/status');assert.equal(status.status,200);assert.equal(status.headers.get('cache-control'),'no-store');assert.equal(status.data.status.deviceCount,0);assert.equal(status.data.status.automation.running,false);assert.equal(status.data.status.vpn.status,'unverified');
 const denied=await f.request('/api/security/devices',{method:'POST',body:{id:'not-reviewed',name:'Receiver',profileId:HARDWARE_ID}});assert.equal(denied.status,400);
});

test('registration issues a one-time scoped credential, validates observations, and revocation invalidates it',async t=>{
 const f=await fixture(t),r=await register(f),deviceToken=r.deviceToken;
 assert.match(deviceToken,/^[A-Za-z0-9_-]{43}$/);
 const profiles=await f.request('/api/security/profiles');assert.equal(profiles.data.profiles.length,5);assert.equal(profiles.data.profiles.filter(p=>p.kind==='hardware-reference').length,4);assert.equal(profiles.data.profiles.find(p=>p.id===HARDWARE_ID).sourceSha256,manifest.sources.find(s=>s.id===HARDWARE_ID).sha256);
 assert.equal((await f.request('/api/security/devices',{token:deviceToken})).status,401);
 const list=await f.request('/api/security/devices');assert.equal(list.data.devices[0].status,'registered');assert.equal(JSON.stringify(list.data).includes('tokenDigest'),false);assert.equal(JSON.stringify(list.data).includes(deviceToken),false);
 const bad=await f.request('/api/security/devices/receiver-one/telemetry',{method:'POST',token:deviceToken,body:{observedAt:f.time(),metrics:{latitude:42,healthOk:true}}});assert.equal(bad.status,400);
 const accepted=await f.request('/api/security/devices/receiver-one/telemetry',{method:'POST',token:deviceToken,body:{observedAt:f.time(),metrics:{healthOk:true,builtInTestOk:true}}});assert.equal(accepted.status,202);
 assert.equal((await f.request('/api/security/devices')).data.devices[0].status,'active');
 const old=await f.request('/api/security/devices/receiver-one/telemetry',{method:'POST',token:deviceToken,body:{observedAt:f.time(),metrics:{healthOk:false}}});assert.equal(old.status,409);
 f.advance(120001);assert.equal((await f.request('/api/security/devices')).data.devices[0].status,'stale');
 const revoked=await f.request('/api/security/devices/receiver-one/revoke',{method:'POST'});assert.equal(revoked.data.device.status,'revoked');
 assert.equal((await f.request('/api/security/devices/receiver-one/telemetry',{method:'POST',token:deviceToken,body:{observedAt:f.time(),metrics:{healthOk:true}}})).status,401);
 assert.equal((await f.request('/api/security/devices/receiver-one/telemetry',{method:'POST',body:{observedAt:f.time(),metrics:{healthOk:true}}})).status,404);
 const disk=await fs.readFile(path.join(f.root,'.security-private/state.json'),'utf8');assert.equal(disk.includes(deviceToken),false);assert.equal(disk.includes(TOKEN),false);assert.equal(JSON.parse(disk).devices[0].tokenDigest,null);
});

test('mutations require a fresh timestamp and nonce, reject concurrent replays, and retain replay defense across restart',async t=>{
 const f=await fixture(t);
 const stale=await f.request('/api/security/automation/start',{method:'POST',headers:{'X-Cryptic-Timestamp':new Date(Date.now()-120000).toISOString()}});assert.equal(stale.status,403);
 const headers={'X-Cryptic-Request-Id':randomUUID()};
 const results=await Promise.all([f.request('/api/security/automation/config',{method:'POST',body:{intervalMs:5000},headers}),f.request('/api/security/automation/config',{method:'POST',body:{intervalMs:5000},headers})]);
 assert.deepEqual(results.map(x=>x.status).sort(),[200,409]);
 await f.service.close();
 const restarted=await createSecurityService({root:f.root,documentManifest:manifest,token:TOKEN,now:()=>Date.parse(f.time())});
 t.after(()=>restarted.close());
 const res=await simulate(restarted.handler,'/api/security/automation/config',{method:'POST',headers:{Host:'127.0.0.1:7443',Origin:EXPECTED_ORIGIN,Authorization:'Bearer '+TOKEN,'Content-Type':'application/json','X-Cryptic-Request-Id':headers['X-Cryptic-Request-Id'],'X-Cryptic-Timestamp':f.time()},raw:JSON.stringify({intervalMs:5000})});assert.equal(res.status,409);
});

test('bounded telemetry and input validation reject secret fields, oversized and malformed JSON',async t=>{
 const f=await fixture(t);await register(f);
 assert.equal((await f.request('/api/security/devices',{method:'POST',body:{id:'receiver-two',name:'Receiver',profileId:HARDWARE_ID,reviewed:true,password:'secret'}})).status,400);
 assert.equal((await f.request('/api/security/automation/config',{method:'POST',body:{intervalMs:1}})).status,400);
 assert.equal((await f.request('/api/security/automation/start',{method:'POST',raw:'{broken'})).status,400);
 assert.equal((await f.request('/api/security/automation/start',{method:'POST',raw:'x'.repeat(32769)})).status,413);
 assert.equal((await f.request('/api/security/devices/receiver-one/telemetry',{method:'POST',body:{observedAt:f.time(),metrics:{healthOk:'true'}}})).status,400);
 assert.equal((await f.request('/api/security/devices/receiver-one/telemetry',{method:'POST',body:{observedAt:'2025-01-01T00:00:00.000Z',metrics:{healthOk:true}}})).status,400);
 assert.equal((await f.request('/api/security/automation/start',{method:'POST',headers:{'Content-Type':'text/plain'}})).status,415);
});

test('explicit automation measures the real host and stop freezes its owned timer only',async t=>{
 const f=await fixture(t);
 await f.service.tick();assert.equal((await f.request('/api/security/telemetry')).data.host,null);
 assert.equal((await f.request('/api/security/automation/start',{method:'POST'})).status,200);
 await f.service.tick();
 const telemetry=(await f.request('/api/security/telemetry')).data;
 assert.equal(telemetry.samples.length,0);assert.equal(telemetry.host.observedAt,f.time());assert.equal(Number.isFinite(telemetry.host.metrics.loadAverage),true);assert.ok(telemetry.host.metrics.memoryPercent>=0&&telemetry.host.metrics.memoryPercent<=100);assert.ok(telemetry.host.metrics.uptimeSeconds>=0);
 assert.equal((await f.request('/api/security/automation/stop',{method:'POST'})).status,200);
 f.advance(60000);await f.service.tick();assert.equal((await f.request('/api/security/telemetry')).data.host.observedAt,telemetry.host.observedAt);
 assert.equal((await f.request('/api/security/status')).data.status.automation.running,false);
});

test('private persistence enforces restrictive permissions and evidence chain omits credentials and raw telemetry',async t=>{
 const f=await fixture(t),registration=await register(f,'private-inventory-id');
 await f.request('/api/security/devices/private-inventory-id/telemetry',{method:'POST',token:registration.deviceToken,body:{observedAt:f.time(),metrics:{temperatureC:24,healthOk:true}}});
 const directory=await fs.stat(path.join(f.root,'.security-private')),file=await fs.stat(path.join(f.root,'.security-private/state.json'));
 assert.equal(directory.mode&0o777,0o700);assert.equal(file.mode&0o777,0o600);
 const evidence=(await f.request('/api/security/export')).data.evidence,text=JSON.stringify(evidence);
 for(const value of [TOKEN,registration.deviceToken,'tokenDigest','private-inventory-id','Reviewed receiver','temperatureC'])assert.equal(text.includes(value),false,value+' leaked');
 assert.equal(evidence.deviceSummary.active,1);assert.equal(evidence.productionVerified,false);
 let previous=evidence.anchor.previousHash;
 for(const receipt of evidence.receipts){const {hash,...fields}=receipt;assert.equal(fields.previousHash,previous);assert.equal(hash,createHash('sha256').update(JSON.stringify(fields)).digest('hex'));previous=hash}
 assert.equal(previous,evidence.anchor.headHash);
});

test('DNS observations require explicit network consent and audits cannot claim production verification',async t=>{
 let runs=0,networkModes=[];
 const f=await fixture(t,{auditImpl:async({mode,networkAllowed})=>{runs++;networkModes.push(networkAllowed);return {findings:[{id:'test_finding',subject:'Bearer secret-token',token:'private'}],observations:mode==='dns'?[{token:'private'}]:[],productionVerified:true}}});
 assert.equal((await f.request('/api/security/audit',{method:'POST',body:{mode:'dns'}})).status,400);assert.equal(runs,0);
 const offline=await f.request('/api/security/audit',{method:'POST',body:{mode:'offline'}});assert.equal(offline.status,200);assert.equal(offline.data.audit.productionVerified,false);assert.equal(offline.data.audit.findings[0].subject,'policy');
 const live=await f.request('/api/security/audit',{method:'POST',body:{mode:'dns',networkConsent:true}});assert.equal(live.status,200);assert.equal(live.data.audit.observationCount,1);assert.deepEqual(networkModes,[false,true]);assert.equal(JSON.stringify(live.data).includes('secret-token'),false);
});

test('private directory symlinks and corrupted chains fail closed on startup',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'cryptic-security-symlink-')),other=await fs.mkdtemp(path.join(os.tmpdir(),'cryptic-security-target-'));
 t.after(()=>Promise.all([fs.rm(root,{recursive:true,force:true}),fs.rm(other,{recursive:true,force:true})]));
 await fs.symlink(other,path.join(root,'.security-private'));await assert.rejects(createSecurityService({root,token:TOKEN,documentManifest:manifest}),/invalid_private_directory/);
 await fs.unlink(path.join(root,'.security-private'));
 const service=await createSecurityService({root,token:TOKEN,documentManifest:manifest});await service.close();
 const state=JSON.parse(await fs.readFile(path.join(root,'.security-private/state.json'),'utf8'));state.sequence=50;await fs.writeFile(path.join(root,'.security-private/state.json'),JSON.stringify(state));
 await assert.rejects(createSecurityService({root,token:TOKEN,documentManifest:manifest}),/private_state_unavailable/);
});

test('actual console client and service contracts accept operating profiles, flag violations and gate VPN plans',async t=>{
 const f=await fixture(t,{profileConfig:profilesConfig});
 const fetchImpl=async(url,options)=>{
  const result=await simulate(f.service.handler,new URL(url).pathname,{method:options.method,raw:options.body,headers:{Host:'127.0.0.1:7443',Origin:EXPECTED_ORIGIN,...options.headers}});
  return new Response(JSON.stringify(result.data),{status:result.status});
 };
 const client=createSecurityClient({fetchImpl,now:()=>new Date(f.time())});
 await client.connect(EXPECTED_ORIGIN,TOKEN);assert.equal(client.snapshot().devices.length,0);
 const registration=await client.register({id:'contract-device',name:'Contract receiver',profileId:HARDWARE_ID,reviewed:true});
 const result=await client.ingest('contract-device',{observedAt:f.time(),metrics:{temperatureC:95,connected:true}},registration.deviceToken);
 assert.equal(result.referenceViolations[0].key,'temperatureC');assert.equal(client.snapshot().devices[0].referenceStatus,'outside-reference');
 const plan=await client.vpnPlan({provider:'cloudflare',hostname:'security.crypticnews.org',operators:['operator@example.invalid']});assert.equal(plan.plan.applied,false);
 await assert.rejects(client.vpnPlan({provider:'cloudflare',cidr:'0.0.0.0/0',operators:['operator@example.invalid']}));
 await client.revoke('contract-device');assert.equal(client.snapshot().devices[0].status,'revoked');
 client.disconnect();assert.equal(client.snapshot().connected,false);
});
