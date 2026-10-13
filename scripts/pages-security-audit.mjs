#!/usr/bin/env node
// CRYPTIC PAGES SENTINEL 1.0 — passive, public GitHub Pages security inventory.
// All findings are source-based indicators, not exploitation or production proof.
import fs from 'node:fs';
import path from 'node:path';
const fleet=process.argv.includes('--fleet');
const token=process.env.GITHUB_TOKEN||'';
const owners=(process.env.PAGES_AUDIT_OWNERS||'machackabook,Azazeleous,crypticmetaverse,thearchitectofgaia-boop').split(',').map(s=>s.trim()).filter(s=>/^[\w-]{1,39}$/.test(s));
const findings=[],inventory=[],errors=[];
let files=0,skipped=0;
const rules=[
 {id:'C001',level:'critical',name:'Potential reusable credential',re:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{25,}|AIza[0-9A-Za-z_-]{35,}|sk-(?:proj-)?[A-Za-z0-9_-]{35,}/g},
 {id:'C002',level:'high',name:'Code execution sink',re:/\beval\s*\(|\bnew\s+Function\s*\(|\bdocument\.write\s*\(/g},
 {id:'C003',level:'high',name:'Scriptable same-origin sandbox',re:/sandbox\s*=\s*["'][^"']*allow-scripts[^"']*allow-same-origin[^"']*["']|sandbox\s*=\s*["'][^"']*allow-same-origin[^"']*allow-scripts[^"']*["']/g},
 {id:'C004',level:'high',name:'Persistent secret storage',re:/(?:sessionStorage|localStorage)\.setItem\s*\(\s*['"][^'"]*(?:secret|password|api[_-]?key|access[_-]?token)[^'"]*['"]/gi},
 {id:'C005',level:'medium',name:'Potential HTML injection sink',re:/\.innerHTML\s*=\s*(?:[^\n;]{0,150}\+|\x60)/g},
 {id:'C006',level:'medium',name:'Unpinned external JavaScript',re:/<script\b[^>]*\bsrc=["']https?:\/\/[^"']+["'][^>]*>/gi},
 {id:'C007',level:'medium',name:'Inline event handler',re:/\son(?:click|error|load|mouseover|submit)\s*=/gi}
];
function push(repo,file,rule,index,body){
 findings.push({repository:repo,path:file,id:rule.id,severity:rule.level,reason:rule.name,line:body?1+body.slice(0,index).split('\n').length-1:0});
}
function scan(repo,file,body){
 files++;
 for(const rule of rules){
   rule.re.lastIndex=0;
   let match,count=0;
   while((match=rule.re.exec(body))!==null&&count++<8){
     if(rule.id==='C006'&&/\bintegrity\s*=/i.test(match[0]))continue;
     push(repo,file,rule,match.index,body);
     if(!match[0].length)rule.re.lastIndex++;
   }
 }
 if(/(^|\/)index\.html$/i.test(file)&&!/http-equiv\s*=\s*["']Content-Security-Policy["']/i.test(body)){
   push(repo,file,{id:'C008',level:'medium',name:'No HTML Content Security Policy'},0,'');
 }
 if(/(^|\/)sw\.js$/i.test(file)&&/cache\.put\s*\(\s*(?:e|event)\.request/.test(body)&&!body.includes('.origin')){
   push(repo,file,{id:'C009',level:'high',name:'Unrestricted service worker caching'},0,'');
 }
}
async function api(url){
 const headers={accept:'application/vnd.github+json','user-agent':'Cryptic-Pages-Sentinel'};
 if(token)headers.authorization='Bearer '+token;
 const r=await fetch(url,{headers,signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('GitHub API HTTP '+r.status+' '+new URL(url).pathname);
 return r.json();
}
function rank(file){
 const f=file.toLowerCase();
 if(f==='index.html')return 0;
 if(/(^|\/)(sw|service-worker)\.js$/.test(f))return 1;
 if(/(^|\/)(main|app|terminal-core|bridge|runtime|magic|dashboard|panel|server)\.(html|js|mjs|cjs|jsx|tsx)$/.test(f))return 2;
 if(/(^|\/)index\.html$/.test(f))return 3;
 if(/\.html$/.test(f))return 4;
 if(/\.(js|mjs|cjs|jsx|tsx)$/.test(f))return 5;
 return 9;
}
async function inspect(repo){
 const item={name:repo.full_name,site:'https://'+repo.owner.login+'.github.io/'+repo.name+'/',files:0,coverage:'partial',http:null};
 inventory.push(item);
 try{
   const branch=repo.default_branch||'main';
   const data=await api('https://api.github.com/repos/'+repo.full_name+'/git/trees/'+encodeURIComponent(branch)+'?recursive=1');
   const candidates=(data.tree||[]).filter(f=>f.type==='blob'&&rank(f.path)<9&&f.size<=180000&&!/^(node_modules|vendor|dist|build)\//.test(f.path)).sort((a,b)=>rank(a.path)-rank(b.path)||a.path.localeCompare(b.path));
   if(data.truncated)errors.push(repo.full_name+': truncated Git tree');
   if(candidates.length>24)errors.push(repo.full_name+': source scan limited to 24 of '+candidates.length+' applicable files');
   for(const entry of candidates.slice(0,24)){
     try{
       const url='https://raw.githubusercontent.com/'+repo.full_name+'/'+encodeURIComponent(branch)+'/'+entry.path.split('/').map(encodeURIComponent).join('/');
       const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(12000)});
       if(!r.ok)throw Error('source HTTP '+r.status);
       const body=await r.text();
       if(body.length>180000){skipped++;continue}
       scan(repo.full_name,entry.path,body);item.files++;
     }catch(e){errors.push(repo.full_name+'/'+entry.path+': '+e.message)}
   }
   if(!data.truncated&&candidates.length<=24)item.coverage='selected-source-complete';
 }catch(e){errors.push(repo.full_name+': '+e.message)}
 try{
   const r=await fetch(item.site,{redirect:'manual',signal:AbortSignal.timeout(12000)});
   item.http=r.status;
   if(r.status>=400)push(repo.full_name,item.site,{id:'C010',level:'medium',name:'Pages HTTP '+r.status},0,'');
 }catch(e){errors.push(item.site+': '+e.message)}
}
async function local(){
 function walk(dir){
   for(const d of fs.readdirSync(dir,{withFileTypes:true})){
     if(['node_modules','.git','dist','build','vendor','reports'].includes(d.name))continue;
     const file=path.join(dir,d.name);
     if(d.isDirectory())walk(file);
     else if(d.isFile()&&rank(path.relative(process.cwd(),file))<9){
       if(fs.statSync(file).size>180000){skipped++;continue}
       scan('local:Cryptic',path.relative(process.cwd(),file).replaceAll('\\','/'),fs.readFileSync(file,'utf8'));
     }
   }
 }
 walk(process.cwd());
}
async function allPages(){
 for(const owner of owners){
   try{
     for(let page=1;page<=4;page++){
       const repos=await api('https://api.github.com/users/'+encodeURIComponent(owner)+'/repos?type=owner&per_page=100&page='+page);
       if(!Array.isArray(repos))throw Error('invalid repository list');
       for(const r of repos.filter(x=>x.has_pages===true&&!x.private&&!x.archived))await inspect(r);
       if(repos.length<100)break;
       if(page===4)errors.push(owner+': repository pagination cap');
     }
   }catch(e){errors.push(owner+': '+e.message)}
 }
}
if(fleet)await allPages();else await local();
const counts={critical:0,high:0,medium:0};
for(const f of findings)counts[f.severity]++;
const report={schema:'cryptic.pages.sentinel.v1',ts:new Date().toISOString(),mode:fleet?'public-fleet':'local',owners:fleet?owners:[],files_read:files,files_skipped:skipped,inventory,counts,findings,coverage_errors:errors,qualification:'Passive static review only; no production verification; public repositories only.'};
fs.mkdirSync('reports/security',{recursive:true});
const baseName=fleet?'pages-audit-fleet':'pages-audit-local';
fs.writeFileSync('reports/security/'+baseName+'.json',JSON.stringify(report,null,2)+'\n');
let md='# Cryptic Pages Sentinel\n\nMode: '+report.mode+' · '+report.ts+'\n\nFiles read: '+files+' · skipped: '+skipped+'\n\nCounts: '+JSON.stringify(counts)+'\n\n## Sites\n\n| Repository | HTTP | Files | Coverage |\n|---|---:|---:|---|\n';
for(const r of inventory)md+='| '+r.name+' | '+(r.http??'?')+' | '+r.files+' | '+r.coverage+' |\n';
md+='\n## Findings\n\n| Severity | Rule | Repo | File | Line |\n|---|---|---|---|---:|\n';
for(const r of findings)md+='| '+r.severity+' | '+r.id+' | '+r.repository+' | '+r.path.replaceAll('|','_')+' | '+r.line+' |\n';
md+='\n## Coverage limitations\n\n'+(errors.length?errors.map(x=>'- '+x.replaceAll('\n',' ')).join('\n'):'No scanner errors, but manual dynamic security verification remains necessary.')+'\n';
fs.writeFileSync('reports/security/'+baseName+'.md',md);
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md.slice(0,900000));
console.log(JSON.stringify({mode:report.mode,sites:inventory.length,files,counts,coverage_errors:errors.length,report:'reports/security/'+baseName+'.json'}));
if(counts.critical||counts.high||errors.length)process.exitCode=1;
