#!/usr/bin/env node
import http from 'node:http';
import { timingSafeEqual, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, appendFile } from 'node:fs/promises';
import path from 'node:path';

const execFileAsync=promisify(execFile);
const HOST=process.env.CRYPTIC_BRIDGE_HOST || '127.0.0.1';
const PORT=Number(process.env.CRYPTIC_BRIDGE_PORT || 7331);
const TOKEN=process.env.CRYPTIC_BRIDGE_TOKEN;
const ROOT=path.resolve(process.env.CRYPTIC_WORKSPACE_ROOT || process.cwd());
const GATEWAY=process.env.CRYPTIC_GATEWAY || 'https://api.crypticnews.org';
const DATA_DIR=path.join(ROOT,'.cryptic');
const BUS_LOG=path.join(DATA_DIR,'bus.jsonl');
const TELEMETRY_LOG=path.join(DATA_DIR,'telemetry.jsonl');

if (!TOKEN || Buffer.byteLength(TOKEN)<32 || !['127.0.0.1','localhost','::1'].includes(HOST) || !Number.isInteger(PORT) || PORT<1 || PORT>65535 || new URL(GATEWAY).protocol!=='https:') {
  console.error('CRYPTIC_BRIDGE_TOKEN is required.');
  process.exit(2);
}

const allowedOrigins=new Set([
  'https://machackabook.github.io',
  'https://crypticnews.org',
  'https://www.crypticnews.org',
  'http://127.0.0.1:8080',
  'http://localhost:8080'
]);

function headers(origin=''){
  return {
    'content-type':'application/json',
    'access-control-allow-origin':allowedOrigins.has(origin)?origin:'',
    'access-control-allow-headers':'authorization,content-type,x-cryptic-request-token',
    'access-control-allow-methods':'GET,POST,OPTIONS',
    'access-control-allow-private-network':'true',
    'vary':'Origin',
    'cache-control':'no-store'
  };
}
function send(res,status,body,origin=''){
  res.writeHead(status,headers(origin));
  res.end(JSON.stringify(body));
}
function localAuth(req){const a=Buffer.from(req.headers.authorization||''),b=Buffer.from('Bearer '+TOKEN);return a.length===b.length&&timingSafeEqual(a,b)}
const usedCapabilities=new Map();
async function readJson(req,limit=65536){
  let body='';
  for await(const chunk of req){
    body+=chunk;
    if(Buffer.byteLength(body)>limit) throw new Error('body_too_large');
  }
  return JSON.parse(body||'{}');
}
async function verifyCapability(req,requiredScope){
  const token=req.headers['x-cryptic-request-token'];
  if(!token) return null;
  const res=await fetch(GATEWAY+'/v1/verify',{
    method:'POST',
    headers:{'x-cryptic-token':String(token)},
    signal:AbortSignal.timeout(5000),redirect:'error'
  });
  if(!res.ok) return null;
  const data=await res.json();
  const claims=data?.claims;
  const now=Math.floor(Date.now()/1000);
  if(!claims || claims.aud!=='cryptic-runtime' || claims.scope!==requiredScope || !Number.isFinite(claims.exp) || claims.exp<=now || claims.exp>now+600 || typeof claims.jti!=='string' || !claims.jti || usedCapabilities.has(claims.jti))return null;
  for(const [id,exp] of usedCapabilities)if(exp<=now)usedCapabilities.delete(id);
  if(usedCapabilities.size>=4096)return null;
  usedCapabilities.set(claims.jti,claims.exp);
  return claims;
}
async function git(args){
  const {stdout,stderr}=await execFileAsync('git',args,{
    cwd:ROOT,timeout:20000,windowsHide:true,maxBuffer:1024*1024
  });
  return {stdout:stdout.trim(),stderr:stderr.trim()};
}
const ACTIONS={
  'runtime.info': async()=>({root:ROOT,platform:process.platform,arch:process.arch,node:process.version}),
  'git.status': async()=>git(['status','--short','--branch']),
  'git.fetch': async()=>git(['fetch','--prune','--tags']),
  'git.pull-ff': async()=>git(['pull','--ff-only'])
};

async function appendFrame(frame){
  await mkdir(DATA_DIR,{recursive:true});
  const record={
    received_at:new Date().toISOString(),
    id:String(frame.id||'').slice(0,100),
    kind:String(frame.kind||'').slice(0,120),
    target:String(frame.target||'').slice(0,100),
    source:null,
    payload:null
  };
  const line=JSON.stringify(record)+'\n';
  await appendFile(BUS_LOG,line,{encoding:'utf8',mode:0o600});
  if(record.kind==='telemetry.snapshot'){
    await appendFile(TELEMETRY_LOG,line,{encoding:'utf8',mode:0o600});
  }
  return {
    stored:true,
    bus_log:path.relative(ROOT,BUS_LOG),
    telemetry_log:record.kind==='telemetry.snapshot'?path.relative(ROOT,TELEMETRY_LOG):null
  };
}

const server=http.createServer(async(req,res)=>{
  const origin=req.headers.origin||'';
  if(origin&&!allowedOrigins.has(origin))return send(res,403,{ok:false,error:'origin_not_allowed'});
  if(req.method==='OPTIONS') return send(res,204,{},origin);
  if(!localAuth(req)) return send(res,401,{ok:false,error:'local_bridge_unauthorized'},origin);

  if(req.method==='GET' && req.url==='/health'){
    return send(res,200,{
      ok:true,
      runtime:'Cryptic Local Bridge',
      version:'0.7.0',

      actions:Object.keys(ACTIONS),
      bus:{endpoint:'/v1/bus',dataset:path.relative(ROOT,TELEMETRY_LOG)}
    },origin);
  }

  if(req.method==='POST' && req.url==='/v1/action'){
    try{
      const body=await readJson(req,32768);
      const action=String(body.action||'');
      if(['git.fetch','git.pull-ff'].includes(action)&&process.env.CRYPTIC_BRIDGE_ENABLE_MUTATIONS!=='1')return send(res,403,{ok:false,error:'bridge_mutations_disabled'},origin);
      if(!Object.hasOwn(ACTIONS,action)) return send(res,400,{ok:false,error:'action_not_allowed',allowed:Object.keys(ACTIONS)},origin);
      const claims=await verifyCapability(req,'bridge.action.'+action);
      if(!claims) return send(res,403,{ok:false,error:'signed_capability_required'},origin);
      const result=await ACTIONS[action]();
      return send(res,200,{ok:true,action,claims:{jti:claims.jti,node:claims.node,exp:claims.exp},result},origin);
    }catch(e){
      return send(res,500,{ok:false,error:'bridge_request_failed'},origin);
    }
  }

  if(req.method==='POST' && req.url==='/v1/bus'){
    try{
      const frame=await readJson(req,65536);
      if(!frame?.id || !frame?.kind) return send(res,400,{ok:false,error:'invalid_bus_frame'},origin);
      const claims=await verifyCapability(req,'bridge.bus.publish');
      if(!claims) return send(res,403,{ok:false,error:'signed_bus_capability_required'},origin);
      const result=await appendFrame(frame);
      return send(res,202,{
        ok:true,
        receipt:{
          id:randomUUID(),
          message_id:frame.id,
          kind:frame.kind,
          accepted_at:new Date().toISOString()
        },
        result
      },origin);
    }catch(e){
      return send(res,500,{ok:false,error:'bridge_request_failed'},origin);
    }
  }

  return send(res,404,{ok:false,error:'not_found'},origin);
});

server.requestTimeout=10000;
server.headersTimeout=5000;
server.maxHeadersCount=32;
server.listen(PORT,HOST,()=>{
  console.log('Cryptic Local Bridge: http://'+HOST+':'+PORT);
  console.log('Workspace root: '+ROOT);
  console.log('Message bus dataset: '+TELEMETRY_LOG);
  console.log('Allowlisted actions: '+Object.keys(ACTIONS).join(', '));
  console.log('Every action requires BOTH the local bridge secret and a fresh gateway-signed capability token.');
});

