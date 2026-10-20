import {test} from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {request} from 'node:http';
const BASE='http://127.0.0.1:8088/singularity/';
let proc;
async function post(path,body={},token,extra={}){return fetch(BASE+path,{method:'POST',headers:{origin:'http://127.0.0.1:8088','content-type':'application/json',...(token?{authorization:'Bearer '+token}:{}),...extra},body:JSON.stringify(body)})}
test('real opt-in volunteer cycle, result verification, origin guard and revocation',async t=>{proc=spawn(process.execPath,['singularity/coordinator.mjs'],{cwd:process.cwd(),stdio:'pipe'});t.after(()=>proc.kill());let ok=false;for(let i=0;i<30;i++){try{const h=await fetch(BASE+'api/health');if(h.ok){ok=true;break}}catch{}await new Promise(r=>setTimeout(r,150))}assert.ok(ok,'coordinator launched');
 const staticPage=await fetch(BASE);assert.equal(staticPage.status,200);assert.match(await staticPage.text(),/POLYGLOT QUINE OS/);
 for(const asset of ['shell.js','shell.css','vector-worker.js','galaxy.html']){const r=await fetch(BASE+asset);assert.equal(r.status,200,asset);assert.ok((await r.text()).length>80)}
 const hostileStatus=await new Promise((resolve,reject)=>{const r=request(BASE+'api/health',{headers:{Host:'evil.example:8088'}},res=>{res.resume();resolve(res.statusCode)});r.on('error',reject);r.end()});assert.equal(hostileStatus,403);
 const badOrigin=await post('api/node/register',{consent:true,mode:'single-worker'},null,{origin:'https://evil.example'});assert.equal(badOrigin.status,403);
 const noConsent=await post('api/node/register',{});assert.equal(noConsent.status,403);
 const reg=await post('api/node/register',{consent:true,mode:'single-worker'});assert.equal(reg.status,201);const {token}=await reg.json();assert.ok(token.length>=32);
 const invalidJob=await post('api/jobs',{kind:'js',code:'eval(1)'});assert.equal(invalidJob.status,400);
 const created=await post('api/jobs',{kind:'vector.dot',a:[1,2,3],b:[4,5,6]});assert.equal(created.status,202);const {job}=await created.json();
 const claimed=await post('api/node/claim',{},token);assert.equal(claimed.status,200);const task=await claimed.json();assert.equal(task.job,job);
 const wrong=await post('api/node/result',{job,result:9},token);assert.equal(wrong.status,422);
 const reclaimed=await post('api/node/claim',{},token);assert.equal((await reclaimed.json()).job,job);
 const done=await post('api/node/result',{job,result:32},token);assert.equal(done.status,200);assert.equal((await done.json()).verified,true);
 const status=await fetch(BASE+'api/jobs/'+job);const result=await status.json();assert.equal(result.status,'verified');assert.equal(result.result,32);assert.equal(result.receipt.length,64);
 const rev=await post('api/node/stop',{},token);assert.equal(rev.status,200);
 const after=await post('api/node/claim',{},token);assert.equal(after.status,401);
});
