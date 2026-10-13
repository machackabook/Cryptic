import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {timingSafeEqual,randomUUID} from 'node:crypto';
import path from 'node:path';

const source=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}};
test('terminal escapes hostile AI text and does not persist receipt tokens or wishes',async()=>{
 const nodes=[];
 const log={appendChild:n=>nodes.push(n)};
 const sessionStorage=storage(),localStorage=storage();
 const window={dispatchEvent(){}};
 const ctx=vm.createContext({window,sessionStorage,localStorage,crypto,TextEncoder,btoa,CustomEvent:class{},document:{getElementById:id=>id==='log'?log:null,createElement:()=>({classList:{add(){}}})}});
 vm.runInContext(await source('core/terminal-core.js'),ctx);
 window.out('**hello** <img src=x onerror=alert(1)>','ai');
 assert.match(nodes[0].innerHTML,/<strong>hello<\/strong>/);
 assert.ok(!nodes[0].innerHTML.includes('<img'));
 await window.mintToken('test',{wish:'private intent'});
 assert.equal(sessionStorage.getItem('cryptic.runtime.tokens'),null);
 window.ledger('wish',{wish:'private intent',fp:'public receipt'});
 assert.ok(!localStorage.getItem('cryptic.ledger').includes('private intent'));
});
test('cross-tab messages cannot execute terminal commands; aggregation stays local',async()=>{
 let channel,executed=0,network=0;
 const window={dispatchEvent(){},CrypticTerminal:{exec(){executed++}}};
 const ctx=vm.createContext({window,crypto,sessionStorage:storage(),location:{origin:'https://machackabook.github.io',href:'https://machackabook.github.io/Cryptic/'},BroadcastChannel:class{constructor(){channel=this}postMessage(){}},navigator:{},CustomEvent:class{},console:{info(){}},fetch(){network++;throw Error('unexpected network')}});
 window.BroadcastChannel=ctx.BroadcastChannel;
 vm.runInContext(await source('cryptic-bus.js'),ctx);
 channel.onmessage({data:{id:'hostile',kind:'terminal.command',payload:{command:'bridge action git.pull-ff'}}});
 assert.equal(executed,0);
 const r=await window.CrypticBus.aggregate('telemetry.snapshot',{private:'data'});
 assert.equal(r.receipts.length,1);assert.equal(network,0);
 assert.throws(()=>window.CrypticBus.url('bridge connect http://localhost:7331 secret'),/credentials/);
});
test('service worker bypasses external, credentialed and query-bearing requests',async()=>{
 const handlers={};
 const self={registration:{scope:'https://machackabook.github.io/Cryptic/'},location:{origin:'https://machackabook.github.io'},addEventListener:(k,v)=>handlers[k]=v};
 vm.runInNewContext(await source('sw.js'),{self,URL,Set});
 for(const [url,auth] of [['https://api.crypticnews.org/v1/status',false],['https://machackabook.github.io/Cryptic/?secret=value',false],['https://machackabook.github.io/Cryptic/index.html',true],['https://machackabook.github.io/other-project/',false]]){
  let intercepted=false;handlers.fetch({request:{method:'GET',url,headers:{has:()=>auth}},respondWith(){intercepted=true}});assert.equal(intercepted,false,url);
 }
});
test('bridge rejects hostile origins, credentials, inherited actions, mutations, expired and replayed capabilities',async()=>{
 let handler,claims={aud:'cryptic-runtime',scope:'bridge.action.git.status',exp:Math.floor(Date.now()/1000)+60,jti:'one'};
 const token='security-test-credential-32-characters';
 const process={env:{CRYPTIC_BRIDGE_TOKEN:token},cwd:()=>'/test',platform:'test',arch:'test',version:'test',exit(){throw Error('invalid configuration')}};
 const ctx=vm.createContext({process,Buffer,URL,Map,Set,Object,Number,Date,JSON,AbortSignal,console:{log(){}},path,timingSafeEqual,randomUUID,promisify:fn=>fn,execFile:async()=>({stdout:'clean',stderr:''}),mkdir:async()=>{},appendFile:async()=>{},http:{createServer:fn=>{handler=fn;return {listen(){}}}},fetch:async()=>({ok:true,json:async()=>({claims})})});
 const text=(await source('runtime/bridge.mjs')).replace(/^#!.*\n/,'').replace(/^import .*;\n/gm,'');
 vm.runInContext(text,ctx);
 async function request(url,body,headers={}){
  let status,response;
  const req={url,method:body?'POST':'GET',headers,async *[Symbol.asyncIterator](){if(body)yield Buffer.from(JSON.stringify(body))}};
  const res={writeHead:s=>status=s,end:s=>response=JSON.parse(s)};
  await handler(req,res);return {status,response};
 }
 const auth={authorization:'Bearer '+token};
 assert.equal((await request('/health',null)).status,401);
 assert.equal((await request('/health',null,{...auth,origin:'https://hostile.example'})).status,403);
 assert.equal((await request('/health',null,auth)).response.root,undefined);
 assert.equal((await request('/v1/action',{action:'constructor'},auth)).status,400);
 assert.equal((await request('/v1/action',{action:'git.pull-ff'},auth)).status,403);
 const signed={...auth,'x-cryptic-request-token':'test-capability'};
 assert.equal((await request('/v1/action',{action:'git.status'},signed)).status,200);
 assert.equal((await request('/v1/action',{action:'git.status'},signed)).status,403);
 claims={...claims,jti:'expired',exp:Math.floor(Date.now()/1000)-1};
 assert.equal((await request('/v1/action',{action:'git.status'},signed)).status,403);
});
