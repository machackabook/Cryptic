#!/usr/bin/env node
// GAIA AE-M5 loopback-only, in-memory volunteer coordinator; no arbitrary code jobs.
import http from 'node:http';
import { randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, relative, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT=resolve(fileURLToPath(new URL('../',import.meta.url)));
const PORT=Number(process.env.CRYPTIC_SINGULARITY_PORT||8088);
const HOST='127.0.0.1';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const jobs=new Map(),nodes=new Map();
const now=()=>Date.now();
const token=()=>randomBytes(24).toString('hex');
const secretMatches=(a,b)=>typeof a==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
function json(res,status,body){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','access-control-allow-origin':'none','cross-origin-resource-policy':'same-origin'});res.end(JSON.stringify(body))}
function validJob(data){if(data?.kind!=='vector.dot'||!Array.isArray(data.a)||!Array.isArray(data.b)||!data.a.length||data.a.length>128||data.a.length!==data.b.length)return false;return [...data.a,...data.b].every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1e6)}
function compute({a,b}){return a.reduce((acc,v,i)=>acc+v*b[i],0)}
function releaseFor(nodeId){for(const job of jobs.values())if(job.status==='claimed'&&job.nodeId===nodeId){job.status='queued';job.nodeId=null;job.claimedAt=0}}
function cleanup(){for(const [id,n] of nodes)if(now()-n.lastSeen>120000){nodes.delete(id);releaseFor(id)}for(const [id,j] of jobs)if(now()-j.createdAt>120000){jobs.delete(id)}for(const j of jobs.values())if(j.status==='claimed'&&now()-j.claimedAt>12000){j.status='queued';j.nodeId=null}}
async function body(req){let s='',len=0;for await(const b of req){len+=b.length;if(len>20000)throw Error('request_too_large');s+=b}try{return JSON.parse(s||'{}')}catch{throw Error('bad_json')}}
function authorizedNode(req){const bearer=String(req.headers.authorization||'');if(!bearer.startsWith('Bearer '))return null;const key=bearer.slice(7);for(const [id,n] of nodes)if(secretMatches(key,n.token))return {id,...n};return null}
async function staticFile(res,pathname){if(pathname==='/'||pathname==='/index.html')pathname='/singularity/index.html';if(!/^\/(?:singularity\/|STATUS\.md$|docs\/LEDGER-STAMP\.md$)/.test(pathname))return json(res,404,{error:'not_found'});if(pathname==='/singularity/' )pathname='/singularity/index.html';let decoded;try{decoded=decodeURIComponent(pathname)}catch{return json(res,400,{error:'invalid_path'})}
 const segments=decoded.split('/');if(segments.some(x=>x==='..'||x.startsWith('.')&&x.length>1))return json(res,403,{error:'forbidden'});
 const target=resolve(ROOT,'.'+decoded);if(relative(ROOT,target).startsWith('..'+sep)||relative(ROOT,target)==='..')return json(res,403,{error:'forbidden'});
 const type=mime[extname(target)];if(!type)return json(res,404,{error:'unsupported_asset'});
 try{const real=await realpath(target);if(real!==target)throw Error('symlink_forbidden');const info=await stat(real);if(!info.isFile()||info.size>500000)throw Error('large_or_nonfile');const data=await readFile(real);const headers={'content-type':type,'x-content-type-options':'nosniff','cache-control':'no-store','referrer-policy':'no-referrer','cross-origin-resource-policy':'same-origin'};
if(type.startsWith('text/html'))headers['content-security-policy']="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; worker-src 'self'; frame-src 'self'; connect-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'";
res.writeHead(200,headers);res.end(data)}catch{json(res,404,{error:'asset_not_found'})}}
export function createCoordinator(){return http.createServer(async(req,res)=>{cleanup();const host=String(req.headers.host||'');if(host!==`${HOST}:${PORT}`)return json(res,403,{error:'untrusted_host'});const origin=`http://${HOST}:${PORT}`;if(req.headers.origin&&req.headers.origin!==origin)return json(res,403,{error:'origin_not_allowed'});const url=new URL(req.url,origin),p=url.pathname;
 if(req.method==='GET'){
  if(p==='/singularity/api/health')return json(res,200,{ok:true,kind:'cryptic.coordinator.ae-m5',version:'5.0.0',activeVolunteers:nodes.size,pendingJobs:[...jobs.values()].filter(j=>j.status==='queued').length});
  if(p.startsWith('/singularity/api/jobs/')){const job=jobs.get(p.slice('/singularity/api/jobs/'.length));if(!job)return json(res,404,{error:'job_not_found'});return json(res,200,{status:job.status,result:job.status==='verified'?job.result:null,receipt:job.receipt||null,reason:job.reason||null})}
  return staticFile(res,p);
 }
 if(req.method!=='POST'||!p.startsWith('/singularity/api/'))return json(res,404,{error:'unknown_route'});
 if(req.headers.origin!==origin||!String(req.headers['content-type']||'').startsWith('application/json')||req.headers['sec-fetch-site']==='cross-site')return json(res,403,{error:'same_origin_json_required'});
 try{const data=await body(req);
  if(p==='/singularity/api/jobs'){
   if(!validJob(data))return json(res,400,{error:'invalid_vector'});
   if(jobs.size>=32)return json(res,429,{error:'job_capacity_exceeded'});
   const id=token(),job={id,status:'queued',payload:{kind:'vector.dot',a:data.a,b:data.b},createdAt:now(),nodeId:null};jobs.set(id,job);return json(res,202,{job:id,status:'queued'});
  }
  if(p==='/singularity/api/node/register'){
   if(data.consent!==true||data.mode!=='single-worker')return json(res,403,{error:'explicit_consent_required'});
   if(nodes.size>=8)return json(res,429,{error:'volunteer_limit'});
   const id=token(),key=token();nodes.set(id,{token:key,lastSeen:now()});return json(res,201,{ok:true,token:key,expires:'tab_lifetime',maxConcurrentTasks:1});
  }
  const n=authorizedNode(req);if(!n)return json(res,401,{error:'volunteer_token_required'});
  if(p==='/singularity/api/node/stop'){nodes.delete(n.id);releaseFor(n.id);return json(res,200,{ok:true,revoked:true})}
  nodes.get(n.id).lastSeen=now();
  if(p==='/singularity/api/node/claim'){
   if([...jobs.values()].some(j=>j.nodeId===n.id&&j.status==='claimed'))return json(res,200,{job:null});
   const job=[...jobs.values()].find(j=>j.status==='queued');if(!job)return json(res,200,{job:null});
   job.status='claimed';job.nodeId=n.id;job.claimedAt=now();return json(res,200,{job:job.id,payload:job.payload});
  }
  if(p==='/singularity/api/node/result'){
   const job=jobs.get(data.job);if(!job||job.nodeId!==n.id||job.status!=='claimed')return json(res,409,{error:'job_not_claimed'});
   const expected=compute(job.payload),candidate=data.result;
   if(typeof candidate!=='number'||!Number.isFinite(candidate)||Math.abs(candidate-expected)>1e-8*Math.max(1,Math.abs(expected))){job.status='queued';job.nodeId=null;return json(res,422,{error:'result_mismatch_requeued'})}
   job.status='verified';job.result=candidate;job.nodeId=null;job.receipt=createHash('sha256').update(JSON.stringify({job:job.id,result:candidate,kind:job.payload.kind})).digest('hex');return json(res,200,{ok:true,verified:true,receipt:job.receipt});
  }
  return json(res,404,{error:'unknown_api'});
 }catch(e){return json(res,e.message==='request_too_large'?413:400,{error:e.message==='bad_json'?'bad_json':e.message==='request_too_large'?'request_too_large':'invalid_request'})}
 });}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(!Number.isInteger(PORT)||PORT<1024||PORT>65535)throw Error('CRYPTIC_SINGULARITY_PORT must be 1024..65535');
 createCoordinator().listen(PORT,HOST,()=>console.log(`CRYPTIC AE-M5 local coordinator: http://${HOST}:${PORT}/singularity/ (loopback only)`));
}
