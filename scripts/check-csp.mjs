import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
const failures=[];let pages=0;
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(['.git','node_modules','tests','reports'].includes(e.name))continue;const file=path.join(dir,e.name);if(e.isDirectory())walk(file);else if(e.name.endsWith('.html')){
 const s=fs.readFileSync(file,'utf8');if(!/<head[\s>]/i.test(s))continue;pages++;
 const policy=/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^\"]*)"/i.exec(s)?.[1];
 if(!policy){failures.push(file+': missing CSP');continue}
 for(const m of s.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi))if(!/\bsrc\s*=/i.test(m[1])&&m[2].trim()){
  if(!/application\/(?:ld\+)?json|importmap/i.test(m[1]))try{new vm.Script(m[2],{filename:file})}catch{failures.push(file+': invalid inline JavaScript')}
  const hash=createHash('sha256').update(m[2]).digest('base64');if(!policy.includes("'sha256-"+hash+"'"))failures.push(file+': stale inline script hash');
 }
 const markup=s.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
 const decode=value=>value.replace(/&(?:quot|apos|amp|lt|gt|#(\d+)|#x([0-9a-f]+));/gi,(entity,decimal,hex)=>decimal||hex?String.fromCodePoint(parseInt(decimal||hex,decimal?10:16)):({'&quot;':'"','&apos;':"'",'&amp;':'&','&lt;':'<','&gt;':'>'}[entity.toLowerCase()]));
 for(const tag of markup.matchAll(/<[^>]+>/g))for(const handler of tag[0].matchAll(/\s(on[a-z]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)){
  const code=decode(handler[2]??handler[3]);
  const hash=createHash('sha256').update(code).digest('base64');
  if(!policy.includes("'unsafe-hashes'")||!policy.includes("'sha256-"+hash+"'"))failures.push(file+': blocked inline event handler '+handler[1]);
  try{new vm.Script('(function(){'+code+'\n})',{filename:file})}catch{failures.push(file+': invalid inline event handler')}
 }
}}}
walk(process.cwd());if(failures.length){console.error(failures.join('\n'));process.exitCode=1}else console.log('CSP hashes valid for '+pages+' full documents.');
