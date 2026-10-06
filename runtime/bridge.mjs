#!/usr/bin/env node
import http from 'node:http';
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

if (!TOKEN) {
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
    'access-control-allow-origin':allowedOrigins.has(origin)?origin:'https://machackabook.github.io',
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
function localAuth(req){ return req.headers.authorization === 'Bearer ' + TOKEN; }
async function readJson(req,limit=65536){
  let body='';
  for await(const chunk of req){
    body+=chunk;
    if(body.length>limit) throw new Error('body_too_large');
  }
  return JSON.parse(body||'{}');
}
async function verifyCapability(req,requiredScope){
  const token=req.headers['x-cryptic-request-token'];
  if(!token) return null;
  const res=await fetch(GATEWAY+'/v1/verify',{
    method:'POST',
    headers:{'x-cryptic-token':String(token)}
  });
  if(!res.ok) return null;
  const data=await res.json();
  const claims=data?.claims;
  if(!claims || claims.aud!=='cryptic-runtime' || claims.scope!==requiredScope) return null;
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
    source:frame.source||null,
    payload:frame.payload||null
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
  if(req.method==='OPTIONS') return send(res,204,{},origin);
  if(!localAuth(req)) return send(res,401,{ok:false,error:'local_bridge_unauthorized'},origin);

  if(req.method==='GET' && req.url==='/health'){
    return send(res,200,{
      ok:true,
      runtime:'Cryptic Local Bridge',
      version:'0.7.0',
      root:ROOT,
      actions:Object.keys(ACTIONS),
      bus:{endpoint:'/v1/bus',dataset:path.relative(ROOT,TELEMETRY_LOG)}
    },origin);
  }

  if(req.method==='POST' && req.url==='/v1/action'){
    try{
      const body=await readJson(req,32768);
      const action=String(body.action||'');
      if(!ACTIONS[action]) return send(res,400,{ok:false,error:'action_not_allowed',allowed:Object.keys(ACTIONS)},origin);
      const claims=await verifyCapability(req,'bridge.action.'+action);
      if(!claims) return send(res,403,{ok:false,error:'signed_capability_required'},origin);
      const result=await ACTIONS[action]();
      return send(res,200,{ok:true,action,claims:{jti:claims.jti,node:claims.node,exp:claims.exp},result},origin);
    }catch(e){
      return send(res,500,{ok:false,error:e.message},origin);
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
          id:crypto.randomUUID(),
          message_id:frame.id,
          kind:frame.kind,
          accepted_at:new Date().toISOString()
        },
        result
      },origin);
    }catch(e){
      return send(res,500,{ok:false,error:e.message},origin);
    }
  }

  return send(res,404,{ok:false,error:'not_found'},origin);
});

server.listen(PORT,HOST,()=>{
  console.log('Cryptic Local Bridge: http://'+HOST+':'+PORT);
  console.log('Workspace root: '+ROOT);
  console.log('Message bus dataset: '+TELEMETRY_LOG);
  console.log('Allowlisted actions: '+Object.keys(ACTIONS).join(', '));
  console.log('Every action requires BOTH the local bridge secret and a fresh gateway-signed capability token.');
});
