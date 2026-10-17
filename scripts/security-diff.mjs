#!/usr/bin/env node
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const git=(root,args)=>execFileSync('git',args,{cwd:root,stdio:['ignore','pipe','pipe'],encoding:'utf8',timeout:20000,maxBuffer:5000000});
const revision=s=>typeof s==='string'&&/^[a-f0-9]{40}$/.test(s);
function baseRevision(root,head,name,eventPath){
 if(name==='pull_request'||name==='push'){
  const file=eventPath;
  if(!file||fs.statSync(file).size>1000000)throw Error('event_evidence_missing');
  const e=JSON.parse(fs.readFileSync(file,'utf8'));
  const expected=name==='pull_request'?e.pull_request?.head?.sha:e.after;
  const base=name==='pull_request'?e.pull_request?.base?.sha:e.before;
  if(!revision(expected)||expected!==head||!revision(base))throw Error('event_revision_mismatch');
  return /^0+$/.test(base)?git(root,['hash-object','-w','-t','tree','/dev/null']).trim():base;
 }
 return git(root,['rev-parse','HEAD^']).trim();
}
export function recordSourceDiff({root=process.cwd(),eventName=process.env.GITHUB_EVENT_NAME,eventPath=process.env.GITHUB_EVENT_PATH,log=()=>{}}={}){
const reportDir=path.join(root,'reports/security');
try{
 const head=git(root,['rev-parse','HEAD']).trim(),base=baseRevision(root,head,eventName,eventPath);
 const chunks=git(root,['diff','--name-status','--no-renames','-z',base,head]).split('\0');
 const files=[];
 for(let i=0;i+1<chunks.length;i+=2)files.push({state:chunks[i],path:chunks[i+1]});
 const report={schema:'cryptic.source.diff.v2',compared_at:new Date().toISOString(),base,head,status:'compared',files,security_relevant_files:files.filter(x=>/(\.github\/workflows\/|auth|security|bridge|runtime|terminal|sw\.js|\.html?$)/i.test(x.path)),qualification:'Exact source revisions; not deployed production security proof.'};
 report.receiptSha256=createHash('sha256').update(JSON.stringify(report)).digest('hex');
 fs.mkdirSync(reportDir,{recursive:true});
 fs.writeFileSync(path.join(reportDir,'recent-diff.json'),JSON.stringify(report,null,2)+'\n');
 const clean=s=>String(s).replace(/[\r\n|`<>]/g,'_');
 fs.writeFileSync(path.join(reportDir,'recent-diff.md'),'# Source change comparison\n\nBase: '+base+'\nHead: '+head+'\nChanged files: '+files.length+'\n'+files.map(x=>'- '+clean(x.state)+' '+clean(x.path)).join('\n')+'\n');
 log(JSON.stringify({base,head,status:report.status,changed:files.length}));return {code:0,report};
}catch{
 fs.mkdirSync(reportDir,{recursive:true});
 fs.writeFileSync(path.join(reportDir,'recent-diff.json'),JSON.stringify({schema:'cryptic.source.diff.v2',status:'unverified',reason:'revision comparison unavailable',productionVerified:false})+'\n');
 log('SOURCE DIFF UNVERIFIED: no comparable validated revisions.');return {code:1,report:{status:'unverified'}};
}


}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const result=recordSourceDiff({log:console.log});process.exitCode=result.code}
