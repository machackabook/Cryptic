// Real host test. No gateway/model/production attestation is implied.
import http from 'node:http';
import {once} from 'node:events';
import {readFile, access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {DeveloperBrowser} from './broker.mjs';
const executable=process.env.NEXUS_CHROME_PATH;
if (!executable) throw new Error('NEXUS_CHROME_PATH_required');
const preview=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>NEXUS broker smoke</title><main><h1>Owned preview</h1></main>');});
preview.listen(0,'127.0.0.1');await once(preview,'listening');
const origin='http://127.0.0.1:'+preview.address().port;
const browser=new DeveloperBrowser({executable,executableSHA256:createHash('sha256').update(await readFile(executable)).digest('hex'),origins:[origin],headless:true,playwrightModule:process.env.NEXUS_TEST_PLAYWRIGHT_MODULE});
try{
  console.log('Starting owned browser profile');
  const started=await browser.start();assert.equal(started.transport,'private-pipe');
  await browser.execute('browser.navigate',{url:origin});
  let document;
  for(let attempt=0;attempt<20;attempt++){document=await browser.execute('browser.inspect',{});if(document.root.documentURL===origin+'/')break;await new Promise(r=>setTimeout(r,100));}
  assert.equal(document.root.documentURL,origin+'/');
  await browser.execute('browser.throttle',{profile:'slow3g'});
  await browser.execute('browser.throttle',{profile:'normal'});
  await assert.rejects(()=>browser.execute('browser.navigate',{url:'file:///etc/passwd'}));
  await assert.rejects(()=>browser.execute('Runtime.evaluate',{expression:'1+1'}));
  const profile=browser.profile;await browser.stop();await assert.rejects(()=>access(profile));
  console.log(JSON.stringify({gate:'host-browser-smoke',status:'passed',version:started.version.product,transport:started.transport,navigation:true,inspect:true,throttling:true,profileRemoved:true,productionVerified:false}));
}finally{await browser.stop();preview.closeAllConnections();await new Promise(r=>preview.close(r));}
