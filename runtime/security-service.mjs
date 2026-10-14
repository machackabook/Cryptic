#!/usr/bin/env node
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {constants} from 'node:fs';
import * as fs from 'node:fs/promises';
import {createHash, randomBytes, randomUUID, timingSafeEqual} from 'node:crypto';
import {validateNetworkPolicy, validateTailnetPolicy, validateDocumentManifest, auditDns} from '../scripts/network-security.mjs';

const ZERO_HASH='0'.repeat(64);
const MAX_BODY=32768;
const MAX_DEVICES=128;
const MAX_SAMPLES=256;
const MAX_RECEIPTS=512;
const REPLAY_WINDOW_MS=60000;
const MIN_INTERVAL_MS=5000;
const MAX_INTERVAL_MS=3600000;
const METRICS=Object.freeze({
 loadAverage:[0,10000],cpuLoad:[0,10000],memoryPercent:[0,100],memoryUsedBytes:[0,2**53-1],memoryTotalBytes:[1,2**53-1],uptimeSeconds:[0,2**53-1],
 connected:'boolean',serialBaud:[0,10000000],healthOk:'boolean',builtInTestOk:'boolean',signalAvailable:'boolean',fixAvailable:'boolean',spoofingDetected:'boolean',jammingDetected:'boolean',
 sampleAgeSeconds:[0,86400],packetLossPct:[0,100],latencyMs:[0,3600000],temperatureC:[-100,200],supplyVoltage:[0,1000],updateCount:[0,2**53-1]
});
const HOST_KEYS=['loadAverage','memoryPercent','uptimeSeconds'];
const HARDWARE_KEYS=['temperatureC','serialBaud','connected','sampleAgeSeconds','healthOk','builtInTestOk'];
const STATIC_PATHS=new Map([
 ['/security/','security/index.html'],['/security/index.html','security/index.html'],['/security/console.js','security/console.js'],['/security/console.css','security/console.css'],
 ['/docs/SECURITY-OPERATIONS.md','docs/SECURITY-OPERATIONS.md'],['/docs/NETWORK-HARDENING.md','docs/NETWORK-HARDENING.md'],['/docs/DOCUMENT-EVIDENCE.md','docs/DOCUMENT-EVIDENCE.md'],['/docs/SECURITY-SERVICE.md','docs/SECURITY-SERVICE.md'],['/ui/tokens.css','ui/tokens.css'],['/config/document-provenance.public.json','config/document-provenance.public.json'],['/config/device-profiles.public.json','config/device-profiles.public.json'],
 ['/config/auth-integrations.public.json','config/auth-integrations.public.json'],['/config/network-security.public.json','config/network-security.public.json'],['/config/vpn-integration.public.json','config/vpn-integration.public.json']
]);
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8'};
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const exact=(x,keys)=>isObject(x)&&Object.keys(x).every(k=>keys.includes(k));
const digest=x=>createHash('sha256').update(x).digest('hex');
const iso=ms=>new Date(ms).toISOString();
const validId=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9-]{0,63}$/.test(x);
const validTime=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)&&Number.isFinite(Date.parse(x))&&iso(Date.parse(x))===x;
class RequestError extends Error{constructor(status,code){super(code);this.status=status;this.code=code}}
const invalid=()=>{throw new RequestError(400,'invalid_request')};
function safeEqual(a,b){const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb)}

function fallbackProfiles(manifest){
 return manifest.sources.map(source=>({
  id:source.id,sourceId:source.id,name:source.title,kind:source.type==='supplied-markdown'?'software':'hardware-reference',sourceSha256:source.sha256,
  interfaces:source.id==='navstorm-plus-20-c96-09'?['LVCMOS serial']:source.type==='supplied-markdown'?['local metadata API']:['RS-422 serial'],
  metrics:source.type==='supplied-markdown'?[...HOST_KEYS,'healthOk','packetLossPct','latencyMs']:HARDWARE_KEYS,
  limits:{},qualifications:['Reference profile; registration does not prove installation or measured hardware capabilities.','Hardware adapters must submit observed values; this service does not issue receiver commands.'],
  runtimeControls:{explicitActivation:true,autoDownload:false,rawPromptsStored:false,stopScope:'owned monitoring timer only',preciseLocationStored:false}
 }));
}

function normalizeProfiles(manifest,profileConfig){
 const fallback=fallbackProfiles(manifest);
 const supplied=Array.isArray(profileConfig)?profileConfig:profileConfig?.profiles||profileConfig?.operatingProfiles;
 if(!supplied)return fallback.map(p=>({...p,metricKeys:p.metrics}));
 return fallback.map(base=>{
  const p=supplied.find(x=>x?.id===base.id||x?.sourceId===base.sourceId);
  if(!p)return base;
  const keys=p.metricKeys||p.metrics;
  const metrics=Array.isArray(keys)?keys.map(x=>typeof x==='string'?x:x?.key).filter(x=>Object.hasOwn(METRICS,x)):base.metrics;
  const limits={};
  if(isObject(p.limits))for(const [key,bound]of Object.entries(p.limits)){
   if(!metrics.includes(key)||!isObject(bound)||METRICS[key]==='boolean')continue;
   const result={};for(const direction of ['min','max'])if(Number.isFinite(bound[direction])&&bound[direction]>=METRICS[key][0]&&bound[direction]<=METRICS[key][1])result[direction]=bound[direction];
   for(const label of ['sourceLocation','basis'])if(typeof bound[label]==='string')result[label]=bound[label].slice(0,256);
   if(Object.keys(result).length)limits[key]=result;
  }
  return {...base,name:typeof p.name==='string'?p.name:base.name,interfaces:Array.isArray(p.interfaces)?p.interfaces.filter(x=>typeof x==='string').slice(0,8):base.interfaces,
   metrics:metrics.length?[...new Set(metrics)]:base.metrics,metricKeys:metrics.length?[...new Set(metrics)]:base.metrics,limits,
   runtimeControls:base.runtimeControls};
 });
}

async function readPublicJson(root,relative,optional=false){
 try{
  const target=path.join(root,relative);
  if(await fs.realpath(target)!==target)throw Error('unsafe_path');
  const stat=await fs.stat(target);
  if(!stat.isFile()||stat.size>1048576)throw Error('invalid_public_config');
  return JSON.parse(await fs.readFile(target,'utf8'));
 }catch(e){if(optional&&e.code==='ENOENT')return null;throw Error('public_configuration_unavailable')}
}

function newState(){return {schemaVersion:1,devices:[],samples:[],host:null,automation:{running:false,intervalMs:15000,lastRunAt:null},receipts:[],anchor:ZERO_HASH,anchorSequence:0,sequence:0,replay:[],latestAudit:null}}
function receiptHash(r){return digest(JSON.stringify({sequence:r.sequence,at:r.at,event:r.event,subject:r.subject,previousHash:r.previousHash}))}
function addReceipt(next,at,event,subject){
 const previousHash=next.receipts.at(-1)?.hash||next.anchor;
 const r={sequence:++next.sequence,at,event,subject,previousHash};r.hash=receiptHash(r);next.receipts.push(r);
 if(next.receipts.length>MAX_RECEIPTS){const removed=next.receipts.shift();next.anchor=removed.hash;next.anchorSequence=removed.sequence}
 return r;
}
function metricValues(metrics,allowed){
 if(!isObject(metrics)||!Object.keys(metrics).length||Object.keys(metrics).length>16)invalid();
 for(const [key,value]of Object.entries(metrics)){
  if(!allowed.includes(key)||!Object.hasOwn(METRICS,key))invalid();
  const rule=METRICS[key];
  if(rule==='boolean'){if(typeof value!=='boolean')invalid()}
  else if(typeof value!=='number'||!Number.isFinite(value)||value<rule[0]||value>rule[1]||(key==='serialBaud'&&!Number.isInteger(value)))invalid();
 }
 return {...metrics};
}
function referenceViolations(metrics,profile){
 const findings=[];
 for(const [key,limits]of Object.entries(profile.limits||{}))if(typeof metrics[key]==='number'){
  if(Number.isFinite(limits.min)&&metrics[key]<limits.min)findings.push({key,direction:'below',limit:limits.min});
  if(Number.isFinite(limits.max)&&metrics[key]>limits.max)findings.push({key,direction:'above',limit:limits.max});
 }
 return findings;
}
function verifyState(s,profiles){
 if(!exact(s,['schemaVersion','devices','samples','host','automation','receipts','anchor','anchorSequence','sequence','replay','latestAudit'])||s.schemaVersion!==1||!Array.isArray(s.devices)||s.devices.length>MAX_DEVICES||!Array.isArray(s.samples)||s.samples.length>MAX_SAMPLES||!Array.isArray(s.receipts)||s.receipts.length>MAX_RECEIPTS||!Array.isArray(s.replay)||s.replay.length>4096)throw Error('invalid_state');
 if(!exact(s.automation,['running','intervalMs','lastRunAt'])||typeof s.automation.running!=='boolean'||!Number.isInteger(s.automation.intervalMs)||s.automation.intervalMs<MIN_INTERVAL_MS||s.automation.intervalMs>MAX_INTERVAL_MS||(s.automation.lastRunAt!==null&&!validTime(s.automation.lastRunAt)))throw Error('invalid_state');
 const ids=new Set();
 for(const d of s.devices){
  if(!exact(d,['id','name','profileId','createdAt','revokedAt','lastSeenAt','tokenDigest'])||!validId(d.id)||ids.has(d.id)||typeof d.name!=='string'||!/^[-\p{L}\p{N} ._]{1,80}$/u.test(d.name)||!profiles.some(p=>p.id===d.profileId)||!validTime(d.createdAt)||(d.revokedAt!==null&&!validTime(d.revokedAt))||(d.lastSeenAt!==null&&!validTime(d.lastSeenAt))||!(/^[a-f0-9]{64}$/.test(d.tokenDigest)||d.revokedAt&&d.tokenDigest===null))throw Error('invalid_state');
  ids.add(d.id);
 }
 for(const sample of s.samples){
  if(!exact(sample,['deviceId','observedAt','receivedAt','metrics','referenceViolations'])||!ids.has(sample.deviceId)||!validTime(sample.observedAt)||!validTime(sample.receivedAt))throw Error('invalid_state');
  metricValues(sample.metrics,profiles.find(p=>p.id===s.devices.find(d=>d.id===sample.deviceId).profileId).metrics);
  if(!Array.isArray(sample.referenceViolations)||sample.referenceViolations.some(f=>!exact(f,['key','direction','limit'])||!Object.hasOwn(METRICS,f.key)||!['below','above'].includes(f.direction)||!Number.isFinite(f.limit)))throw Error('invalid_state');
 }
 if(s.host!==null){if(!exact(s.host,['observedAt','metrics'])||!validTime(s.host.observedAt))throw Error('invalid_state');metricValues(s.host.metrics,HOST_KEYS)}
 if(!/^[a-f0-9]{64}$/.test(s.anchor)||!Number.isInteger(s.anchorSequence)||s.anchorSequence<0||!Number.isInteger(s.sequence)||s.sequence<s.anchorSequence)throw Error('invalid_state');
 let previous=s.anchor,sequence=s.anchorSequence;
 for(const r of s.receipts){if(!exact(r,['sequence','at','event','subject','previousHash','hash'])||r.sequence!==++sequence||!validTime(r.at)||typeof r.event!=='string'||!/^[-a-z.]{1,64}$/.test(r.event)||typeof r.subject!=='string'||!/^[-a-z0-9]{1,80}$/.test(r.subject)||r.previousHash!==previous||r.hash!==receiptHash(r))throw Error('invalid_state');previous=r.hash}
 if(sequence!==s.sequence||s.replay.some(r=>!exact(r,['digest','expiresAt'])||!/^[a-f0-9]{64}$/.test(r.digest)||!Number.isFinite(r.expiresAt)))throw Error('invalid_state');
 if(s.latestAudit!==null&&(!exact(s.latestAudit,['at','mode','findings','observationCount','qualification','productionVerified'])||!validTime(s.latestAudit.at)||!['offline','dns'].includes(s.latestAudit.mode)||s.latestAudit.productionVerified!==false||!Array.isArray(s.latestAudit.findings)||s.latestAudit.findings.some(f=>!exact(f,['id','subject'])||typeof f.id!=='string'||typeof f.subject!=='string')||!Number.isInteger(s.latestAudit.observationCount)||typeof s.latestAudit.qualification!=='string'))throw Error('invalid_state');
 return s;
}

async function privateStore(root,profiles){
 const dir=path.join(root,'.security-private');
 await fs.mkdir(dir,{recursive:true,mode:0o700});
 const stat=await fs.lstat(dir);if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('invalid_private_directory');
 await fs.chmod(dir,0o700);
 const target=path.join(dir,'state.json');
 async function save(next){
  const temp=path.join(dir,'.state-'+randomUUID()+'.tmp');let handle;
  try{
   handle=await fs.open(temp,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
   await handle.writeFile(JSON.stringify(next)+'\n','utf8');await handle.sync();await handle.close();handle=null;
   await fs.rename(temp,target);
   const directory=await fs.open(dir,constants.O_RDONLY);try{await directory.sync()}finally{await directory.close()}
  }finally{if(handle)await handle.close();await fs.unlink(temp).catch(()=>{})}
 }
 let state;
 try{
  const file=await fs.open(target,constants.O_RDONLY|constants.O_NOFOLLOW);
  try{const st=await file.stat();if(!st.isFile()||st.size>2097152)throw Error('invalid_state');state=verifyState(JSON.parse(await file.readFile('utf8')),profiles);await file.chmod(0o600)}finally{await file.close()}
 }catch(e){if(e.code!=='ENOENT')throw Error('private_state_unavailable');state=newState()}
 state.automation.running=false;
 await save(state);
 return {state,save};
}

function hostSample(now){
 const total=os.totalmem(),free=os.freemem();
 return {observedAt:iso(now),metrics:{loadAverage:os.loadavg()[0],memoryPercent:Math.round((total-free)/total*10000)/100,uptimeSeconds:Math.floor(os.uptime())}};
}
function originAllowed(value){
 try{const u=new URL(value);return u.origin===value&&!u.username&&!u.password&&(u.protocol==='https:'||(u.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname)))}catch{return false}
}
function redactAudit(report,at,mode){
 return {at,mode,findings:(report.findings||[]).slice(0,256).map(f=>({id:/^[a-z0-9_-]{1,80}$/.test(f.id)?f.id:'audit_finding',subject:/^[a-z0-9:._-]{1,253}$/.test(f.subject)?f.subject:'policy'})),observationCount:Array.isArray(report.observations)?Math.min(report.observations.length,512):0,
  qualification:mode==='dns'?'Explicit HTTPS resolver observations; DNSSEC resolver assertions are not independent cryptographic validation. Network and VPN enforcement remain unverified.':'Offline policy and document schema review; no network requests or DNS/VPN configuration changes.',productionVerified:false};
}

export async function createSecurityService({root=process.cwd(),token,port=7443,allowedOrigins=[],now=Date.now,auditImpl,hostMeasure=hostSample,documentManifest,profileConfig}={}){
 if(typeof token!=='string'||Buffer.byteLength(token)<32||Buffer.byteLength(token)>512||/[\r\n]/.test(token)||!Number.isInteger(port)||port<1||port>65535||!Array.isArray(allowedOrigins)||allowedOrigins.some(o=>!originAllowed(o)))throw Error('invalid_security_configuration');
 root=await fs.realpath(root);
 const manifest=documentManifest||await readPublicJson(root,'config/document-provenance.public.json');
 if(validateDocumentManifest(manifest).length)throw Error('invalid_document_manifest');
 const profiles=normalizeProfiles(manifest,profileConfig||await readPublicJson(root,'config/device-profiles.public.json',true));
 const store=await privateStore(root,profiles);let state=store.state;
 const origins=new Set([`http://127.0.0.1:${port}`,`http://localhost:${port}`,`http://[::1]:${port}`,...allowedOrigins]);
 const hosts=new Set([`127.0.0.1:${port}`,`localhost:${port}`,`[::1]:${port}`]);
 const adminDigest=digest(token);let timer=null,closed=false,queue=Promise.resolve(),pending=0;
 async function serialized(fn){
  if(pending>=64)throw new RequestError(503,'service_busy');pending++;
  const work=queue.then(fn);queue=work.catch(()=>{});
  try{return await work}finally{pending--}
 }
 async function commit(fn,request){
  const next=structuredClone(state);next.replay=next.replay.filter(r=>r.expiresAt>now());
  if(request){if(next.replay.some(r=>r.digest===request.digest))throw new RequestError(409,'request_replayed');if(next.replay.length>=4096)throw new RequestError(503,'service_busy');next.replay.push(request)}
  const result=fn(next);await store.save(next);state=next;return result;
 }
 function publicDevice(d){
  const latest=state.samples.findLast(s=>s.deviceId===d.id),violations=latest?.referenceViolations||[];
  const elapsed=d.lastSeenAt?now()-Date.parse(d.lastSeenAt)+(latest?.metrics.sampleAgeSeconds||0)*1000:0;
  return {id:d.id,name:d.name,profileId:d.profileId,createdAt:d.createdAt,revokedAt:d.revokedAt,lastSeenAt:d.lastSeenAt,
   status:d.revokedAt?'revoked':!d.lastSeenAt?'registered':elapsed>Math.max(120000,state.automation.intervalMs*3)?'stale':'active',referenceStatus:!latest?'unobserved':violations.length?'outside-reference':'within-reference',referenceViolations:violations};
 }
 function anchor(){return {previousHash:state.anchor,previousSequence:state.anchorSequence,headHash:state.receipts.at(-1)?.hash||state.anchor,sequence:state.sequence,qualification:'Retain a trusted external anchor to detect rewriting of the local chain.'}}
 async function vpnStatus(){
  const snapshot=await readPublicJson(root,'config/vpn-integration.public.json',true);
  return {status:'unverified',providers:[{id:'tailscale',status:'unverified'},{id:'cloudflare-warp',status:'unverified'}],configuration:snapshot,qualification:'Provider configuration is reference evidence. No enrolled client, protected private route, or installed VPN tunnel has been measured by this service.'};
 }
 async function status(){return {service:'Cryptic Security Service',schemaVersion:1,automation:{...state.automation},deviceCount:state.devices.length,telemetryCount:state.samples.length,receiptCount:state.sequence,vpn:await vpnStatus(),latestAudit:state.latestAudit,
  boundaries:['Real local host measurements and device-submitted observations only.','Receiver commands, model execution, dependencies, VPN installation, DNS edits, and remote configuration changes are outside this service.','Device registration requires review; reference profiles do not prove installed devices.']}}
 async function tick(){
  if(closed||!state.automation.running)return;
  await serialized(async()=>{
   if(closed||!state.automation.running)return;
   const at=now(),sample=hostMeasure(at);if(!exact(sample,['observedAt','metrics'])||!validTime(sample.observedAt))throw Error('invalid_host_sample');metricValues(sample.metrics,HOST_KEYS);
   await commit(next=>{next.host=sample;next.automation.lastRunAt=iso(at);addReceipt(next,iso(at),'host.observed','local-monitor')});
  });
 }
 function schedule(){
  if(timer)clearInterval(timer);timer=null;
  if(state.automation.running&&!closed){timer=setInterval(()=>{tick().catch(()=>{if(timer)clearInterval(timer);timer=null;serialized(async()=>{await commit(next=>{next.automation.running=false;addReceipt(next,iso(now()),'automation.failed','local-monitor')})}).catch(()=>{})})},state.automation.intervalMs);timer.unref?.()}
 }
 function securityHeaders(origin){
  const h={'cache-control':'no-store','pragma':'no-cache','x-content-type-options':'nosniff','referrer-policy':'no-referrer','x-frame-options':'DENY',
   'content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",'vary':'Origin'};
  if(origin&&origins.has(origin))Object.assign(h,{'access-control-allow-origin':origin,'access-control-allow-headers':'Authorization, Content-Type, X-Cryptic-Request-Id, X-Cryptic-Timestamp','access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-private-network':'true'});
  return h;
 }
 function send(res,code,body,origin){res.writeHead(code,{...securityHeaders(origin),'content-type':'application/json; charset=utf-8'});res.end(code===204?undefined:JSON.stringify(body))}
 function validateRequest(req){
  if(closed)throw new RequestError(503,'service_unavailable');
  const sensitive=['host','origin','authorization','x-cryptic-request-id','x-cryptic-timestamp'];
  for(const key of sensitive){let count=0;for(let i=0;i<(req.rawHeaders||[]).length;i+=2)if(req.rawHeaders[i].toLowerCase()===key)count++;if(count>1)throw new RequestError(400,'invalid_request')}
  if(typeof req.headers.host!=='string'||!hosts.has(req.headers.host.toLowerCase()))throw new RequestError(403,'host_not_allowed');
  const origin=req.headers.origin;
  if(origin!==undefined&&(typeof origin!=='string'||!origins.has(origin)))throw new RequestError(403,'origin_not_allowed');
  if(typeof req.url!=='string'||!req.url.startsWith('/')||req.url.startsWith('//')||/[?%\\\x00-\x20]/.test(req.url)||req.url.length>256)throw new RequestError(400,'invalid_request');
  return origin;
 }
 function auth(req,deviceId){
  const header=req.headers.authorization;
  if(typeof header!=='string'||!/^Bearer [A-Za-z0-9._~+\/=-]{32,512}$/.test(header))throw new RequestError(401,'unauthorized');
  const candidate=digest(header.slice(7));
  if(safeEqual(candidate,adminDigest))return 'admin';
  const device=state.devices.find(d=>d.id===deviceId&&!d.revokedAt);
  if(device?.tokenDigest&&safeEqual(candidate,device.tokenDigest))return `device:${deviceId}`;
  throw new RequestError(401,'unauthorized');
 }
 function freshRequest(req,scope){
  if(!req.headers.origin||!origins.has(req.headers.origin))throw new RequestError(403,'origin_required');
  const id=req.headers['x-cryptic-request-id'],at=req.headers['x-cryptic-timestamp'];
  if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)||!validTime(at)||Math.abs(now()-Date.parse(at))>REPLAY_WINDOW_MS)throw new RequestError(403,'fresh_request_required');
  const fingerprint=digest(scope+':'+id);
  if(state.replay.some(r=>r.digest===fingerprint&&r.expiresAt>now()))throw new RequestError(409,'request_replayed');
  return {digest:fingerprint,expiresAt:now()+REPLAY_WINDOW_MS*2};
 }
 async function bodyJson(req){
  if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type']||''))throw new RequestError(415,'json_required');
  const length=req.headers['content-length'];if(length!==undefined&&(!/^\d+$/.test(length)||Number(length)>MAX_BODY))throw new RequestError(413,'request_too_large');
  const parts=[];let size=0;
  for await(const part of req){size+=part.length;if(size>MAX_BODY)throw new RequestError(413,'request_too_large');parts.push(part)}
  try{const body=JSON.parse(Buffer.concat(parts).toString('utf8')||'{}');if(!isObject(body))invalid();return body}catch(e){if(e instanceof RequestError)throw e;invalid()}
 }
 async function performAudit(mode){
  if(auditImpl)return redactAudit(await auditImpl({mode,networkAllowed:mode==='dns'}),iso(now()),mode);
  const policy=await readPublicJson(root,'config/network-security.public.json');
  const tailnet=await readPublicJson(root,'security/tailscale-policy.example.json');
  const findings=[...validateNetworkPolicy(policy,{live:mode==='dns'}),...validateTailnetPolicy(tailnet),...validateDocumentManifest(manifest)];
  if(mode==='offline'||findings.length)return redactAudit({findings,observations:[]},iso(now()),mode);
  const deadline=AbortSignal.timeout(15000);
  const dns=await auditDns(policy.dns,{fetchImpl:(url,options)=>fetch(url,{...options,signal:AbortSignal.any([deadline,options.signal])})});
  return redactAudit(dns,iso(now()),mode);
 }

 async function handler(req,res){
  let origin;
  try{
   origin=validateRequest(req);
   if(req.method==='OPTIONS'){
    if(!origin)throw new RequestError(403,'origin_required');
    const method=req.headers['access-control-request-method'];
    if(method&&!['GET','POST'].includes(method))throw new RequestError(405,'method_not_allowed');
    return send(res,204,null,origin);
   }
   if(req.method==='GET'&&STATIC_PATHS.has(req.url)){
    const target=path.join(root,STATIC_PATHS.get(req.url));
    let file;try{if(await fs.realpath(target)!==target)throw Error('invalid');const stat=await fs.stat(target);if(!stat.isFile()||stat.size>1048576)throw Error('invalid');file=await fs.readFile(target)}catch{return send(res,404,{ok:false,error:'not_found'},origin)}
    res.writeHead(200,{...securityHeaders(origin),'content-type':MIME[path.extname(target)]});return res.end(file);
   }
   if(!req.url.startsWith('/api/security/'))throw new RequestError(404,'not_found');
   if(!['GET','POST'].includes(req.method))throw new RequestError(405,'method_not_allowed');
   const body=req.method==='POST'?await bodyJson(req):null;
   const result=await serialized(async()=>{
    const telemetry=/^\/api\/security\/devices\/([a-z0-9][a-z0-9-]{0,63})\/telemetry$/.exec(req.url);
    const scope=auth(req,req.method==='POST'?telemetry?.[1]:undefined);
    const request=req.method==='POST'?freshRequest(req,scope):null;
    if(req.method==='GET'){
     if(req.url==='/api/security/status')return {status:await status()};
     if(req.url==='/api/security/profiles')return {profiles,sources:manifest.sources};
     if(req.url==='/api/security/devices')return {devices:state.devices.map(publicDevice)};
     if(req.url==='/api/security/telemetry')return {samples:state.samples,host:state.host};
     if(req.url==='/api/security/receipts')return {receipts:state.receipts,anchor:anchor()};
     if(req.url==='/api/security/vpn')return {vpn:await vpnStatus()};
     if(req.url==='/api/security/export')return {evidence:{schema:'cryptic.security.evidence.v1',exportedAt:iso(now()),profileSources:profiles.map(p=>({profileId:p.id,sourceId:p.sourceId,sourceSha256:p.sourceSha256,kind:p.kind})),deviceSummary:{total:state.devices.length,active:state.devices.filter(d=>publicDevice(d).status==='active').length,stale:state.devices.filter(d=>publicDevice(d).status==='stale').length,revoked:state.devices.filter(d=>d.revokedAt).length},automation:{...state.automation},telemetrySummary:{acceptedSamples:state.samples.length,lastHostObservationAt:state.host?.observedAt||null},audit:state.latestAudit?{at:state.latestAudit.at,mode:state.latestAudit.mode,findingIds:state.latestAudit.findings.map(f=>f.id),observationCount:state.latestAudit.observationCount,productionVerified:false}:null,receipts:state.receipts,anchor:anchor(),productionVerified:false,qualification:'Sanitized metadata only; device names, identifiers, tokens, raw telemetry, locations, and private provider inventory are omitted.'}};
     throw new RequestError(404,'not_found');
    }
    if(req.url==='/api/security/devices'){
     if(!exact(body,['id','name','profileId','reviewed'])||!validId(body.id)||typeof body.name!=='string'||!/^[-\p{L}\p{N} ._]{1,80}$/u.test(body.name)||!body.name.trim()||!profiles.some(p=>p.id===body.profileId)||body.reviewed!==true)invalid();
     if(state.devices.some(d=>d.id===body.id))throw new RequestError(409,'device_exists');
     if(state.devices.length>=MAX_DEVICES)throw new RequestError(409,'registry_full');
     const deviceToken=randomBytes(32).toString('base64url');
     const result=await commit(next=>{const device={id:body.id,name:body.name.trim(),profileId:body.profileId,createdAt:iso(now()),revokedAt:null,lastSeenAt:null,tokenDigest:digest(deviceToken)};next.devices.push(device);addReceipt(next,iso(now()),'device.registered',device.profileId);return {device:publicDevice(device),deviceToken}},request);
     return {...result,_status:201};
    }
    if(telemetry){
     const device=state.devices.find(d=>d.id===telemetry[1]);if(!device||device.revokedAt)throw new RequestError(404,'device_unavailable');
     if(!exact(body,['observedAt','metrics'])||!validTime(body.observedAt)||Date.parse(body.observedAt)>now()+30000||now()-Date.parse(body.observedAt)>86400000)invalid();
     if(device.lastSeenAt&&Date.parse(body.observedAt)<=Date.parse(device.lastSeenAt))throw new RequestError(409,'observation_not_newer');
     const profile=profiles.find(p=>p.id===device.profileId),metrics=metricValues(body.metrics,profile.metrics),violations=referenceViolations(metrics,profile);
     const receipt=await commit(next=>{const d=next.devices.find(d=>d.id===device.id);d.lastSeenAt=body.observedAt;next.samples.push({deviceId:d.id,observedAt:body.observedAt,receivedAt:iso(now()),metrics,referenceViolations:violations});if(next.samples.length>MAX_SAMPLES)next.samples.shift();return addReceipt(next,iso(now()),'device.observed',d.profileId)},request);
     return {accepted:true,receipt,referenceViolations:violations,_status:202};
    }
    const revoke=/^\/api\/security\/devices\/([a-z0-9][a-z0-9-]{0,63})\/revoke$/.exec(req.url);
    if(revoke){
     if(Object.keys(body).length)invalid();const device=state.devices.find(d=>d.id===revoke[1]);if(!device)throw new RequestError(404,'device_unavailable');
     await commit(next=>{const d=next.devices.find(d=>d.id===device.id);d.revokedAt=d.revokedAt||iso(now());d.tokenDigest=null;addReceipt(next,iso(now()),'device.revoked',d.profileId)},request);
     return {device:publicDevice(state.devices.find(d=>d.id===device.id))};
    }
    if(['/api/security/automation/start','/api/security/automation/stop','/api/security/automation/config'].includes(req.url)){
     if(req.url.endsWith('/config')){if(!exact(body,['intervalMs'])||!Number.isInteger(body.intervalMs)||body.intervalMs<MIN_INTERVAL_MS||body.intervalMs>MAX_INTERVAL_MS)invalid()}
     else if(Object.keys(body).length)invalid();
     const action=req.url.split('/').at(-1);
     await commit(next=>{if(action==='config')next.automation.intervalMs=body.intervalMs;else next.automation.running=action==='start';addReceipt(next,iso(now()),'automation.'+(action==='start'?'started':action==='stop'?'stopped':'configured'),'local-monitor')},request);
     schedule();
     return {automation:{...state.automation}};
    }
    if(req.url==='/api/security/audit'){
     if(!exact(body,['mode','networkConsent'])||!['offline','dns'].includes(body.mode)||(body.mode==='dns'&&body.networkConsent!==true)||(body.mode==='offline'&&body.networkConsent!==undefined&&body.networkConsent!==false))invalid();
     const report=await performAudit(body.mode);
     await commit(next=>{next.latestAudit=report;addReceipt(next,iso(now()),'audit.completed','network-policy')},request);
     return {audit:report};
    }
    if(req.url==='/api/security/vpn/plan'){
     const {buildVpnPlan}=await import('../scripts/vpn-plan.mjs');
     let plan;try{plan=buildVpnPlan(body)}catch{invalid()}
     if(!isObject(plan))invalid();
     await commit(next=>addReceipt(next,iso(now()),'vpn.plan-reviewed','vpn-configuration'),request);
     return {plan};
    }
    throw new RequestError(404,'not_found');
   });
   const {_status=200,...payload}=result;send(res,_status,{ok:true,...payload},origin);
  }catch(e){if(!res.headersSent)send(res,e instanceof RequestError?e.status:500,{ok:false,error:e instanceof RequestError?e.code:'request_failed'},origin);else res.end()}
 }
 async function close(){
  closed=true;if(timer)clearInterval(timer);timer=null;
  await serialized(async()=>{if(state.automation.running)await commit(next=>{next.automation.running=false;addReceipt(next,iso(now()),'automation.stopped','local-monitor')})});
 }
 handler.close=close;
 return {handler,close,tick};
}

export async function createSecurityHandler(options){return (await createSecurityService(options)).handler}

async function main(){
 const port=Number(process.env.CRYPTIC_SECURITY_PORT||7443),host=process.env.CRYPTIC_SECURITY_HOST||'127.0.0.1';
 if(!['127.0.0.1','localhost','::1'].includes(host))throw Error('loopback_required');
 const allowedOrigins=process.env.CRYPTIC_SECURITY_ALLOWED_ORIGINS?process.env.CRYPTIC_SECURITY_ALLOWED_ORIGINS.split(','):[];
 const service=await createSecurityService({root:process.env.CRYPTIC_WORKSPACE_ROOT||process.cwd(),token:process.env.CRYPTIC_SECURITY_TOKEN,port,allowedOrigins});
 const server=http.createServer(service.handler);server.requestTimeout=10000;server.headersTimeout=5000;server.maxHeadersCount=32;server.keepAliveTimeout=5000;
 server.listen(port,host,()=>console.log(`Cryptic Security Service: http://${host==='::1'?'[::1]':host}:${port}/security/ — monitoring starts only on explicit activation.`));
 server.on('error',async()=>{await service.close();console.error('Security service unavailable; configuration or listener failed.');process.exitCode=1});
 const stop=()=>{server.close(async()=>{await service.close();process.exitCode=0});server.closeIdleConnections()};
 process.once('SIGTERM',stop);process.once('SIGINT',stop);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('Security service failed: provide a private CRYPTIC_SECURITY_TOKEN of at least 32 characters and valid local configuration.');process.exitCode=1});
