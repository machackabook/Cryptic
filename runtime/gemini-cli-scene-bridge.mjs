#!/usr/bin/env node
// Cryptic Gemini CLI scene bridge: real CLI invocation on localhost, not a browser shell.
// Deploy only on a dedicated, least-privilege user behind an authenticated TLS tunnel.
import http from 'node:http';
import {spawn} from 'node:child_process';
import {randomUUID,createHash,timingSafeEqual} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const HOST='127.0.0.1',PORT=Number(process.env.CRYPTIC_GEMINI_BRIDGE_PORT||8877);
const KEY=process.env.CRYPTIC_GEMINI_BRIDGE_TOKEN||'';
if(KEY.length<32)throw Error('Set a 32+ character CRYPTIC_GEMINI_BRIDGE_TOKEN secret.');
let busy=false;const history=new Map();
const respond=(r,s,x)=>{r.writeHead(s,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});r.end(JSON.stringify(x))};
const validToken=h=>{if(!h?.startsWith('Bearer '))return false;const a=createHash('sha256').update(h.slice(7)).digest(),b=createHash('sha256').update(KEY).digest();return timingSafeEqual(a,b)};
const visual=s=>{const out={};for(const [key,lo,hi]of[['hue',0,360],['speed',0,2.5],['energy',0,1]]){const v=s?.[key];if(typeof v==='number'&&Number.isFinite(v))out[key]=Math.max(lo,Math.min(hi,v))}return out};
const modelResult=txt=>{let t=String(txt||'').trim().replace(/^\x60{3}(?:json)?\s*/,'').replace(/\s*\x60{3}$/,'');try{const v=JSON.parse(t);if(typeof v.reply==='string')return {reply:v.reply.slice(0,2400),scene:visual(v.scene)}}catch{}return {reply:t.slice(0,2400),scene:{}}};
async function execute(prompt,session){if(busy)throw Error('BUSY');busy=true;const cwd=await mkdtemp(join(tmpdir(),'cryptic-'));try{const prev=history.get(session)||[],instruction='You are GAIA, a creative spatial visualization assistant. Do not call tools or issue shell commands. Return ONLY JSON: {"reply":"human response","scene":{"hue":0-360,"speed":0-2.5,"energy":0-1}}. Scene keys are optional. Existing session context: '+JSON.stringify(prev)+'. Current message: '+JSON.stringify(prompt);
return await new Promise((resolve,reject)=>{const child=spawn(process.env.CRYPTIC_GEMINI_BIN||'gemini',['--prompt',instruction,'--output-format','json','--approval-mode','plan'],{cwd,shell:false,windowsHide:true,env:{PATH:process.env.PATH||'',HOME:process.env.HOME||'',USERPROFILE:process.env.USERPROFILE||'',GEMINI_API_KEY:process.env.GEMINI_API_KEY||''},stdio:['ignore','pipe','pipe']});
let stdout='',closed=false;const timer=setTimeout(()=>child.kill('SIGKILL'),22000);child.stdout.on('data',x=>{stdout+=x.toString();if(stdout.length>48000)child.kill('SIGKILL')});child.stderr.on('data',()=>{});child.on('error',e=>{if(!closed){closed=true;clearTimeout(timer);reject(e)}});child.on('exit',c=>{if(closed)return;closed=true;clearTimeout(timer);if(c!==0)return reject(Error('CLI_EXIT_'+c));try{const result=JSON.parse(stdout);if(typeof result.response!=='string')throw Error('No model response');const o=modelResult(result.response);history.set(session,[...prev,{user:prompt,assistant:o.reply}].slice(-5));resolve({...o,receipt:randomUUID()})}catch(e){reject(Error('CLI_RESULT_INVALID'))}})})}finally{busy=false;await rm(cwd,{recursive:true,force:true})}}
http.createServer(async(req,res)=>{if(req.headers.host!==HOST+':'+PORT)return respond(res,403,{error:'UNTRUSTED_HOST'});if(req.url!=='/v1/gemini'||req.method!=='POST')return respond(res,404,{error:'NOT_FOUND'});if(!validToken(req.headers.authorization))return respond(res,401,{error:'UNAUTHORIZED'});if(busy)return respond(res,429,{error:'BUSY'});let s='';for await(const chunk of req){s+=chunk.toString();if(s.length>8000)return respond(res,413,{error:'TOO_LARGE'})}let p;try{p=JSON.parse(s)}catch{return respond(res,400,{error:'BAD_JSON'})}if(typeof p.prompt!=='string'||p.prompt.length<1||p.prompt.length>1000)return respond(res,400,{error:'INVALID_PROMPT'});const session=/^[a-f0-9]{64}$/.test(p.session||'')?p.session:'isolated-'+randomUUID();try{return respond(res,200,await execute(p.prompt,session))}catch(e){return respond(res,502,{error:String(e.message).slice(0,150)})}}).listen(PORT,HOST,()=>console.log('Cryptic Gemini CLI bridge listening on '+HOST+':'+PORT));
