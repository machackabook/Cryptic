#!/usr/bin/env node
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
function git(args){return execFileSync('git',args,{encoding:'utf8',timeout:20000,maxBuffer:5000000}).trim()}
let base=null,head=git(['rev-parse','HEAD']),status='compared';
try{base=process.env.GITHUB_EVENT_NAME==='pull_request'?git(['merge-base','HEAD','origin/main']):git(['rev-parse','HEAD^'])}
catch{status='no-comparable-parent'}
const files=base?git(['diff','--name-status',base,head]).split('\n').filter(Boolean).map(x=>{const [state,...paths]=x.split('\t');return {state,path:paths.at(-1)}}):[];
const sensitive=files.filter(x=>/(\.github\/workflows\/|auth|security|bridge|runtime|terminal|sw\.js|\.html?$)/i.test(x.path));
const report={schema:'cryptic.source.diff.v1',compared_at:new Date().toISOString(),base,head,status,files,security_relevant_files:sensitive,qualification:'Source change evidence, not deployed production security proof.'};
fs.mkdirSync('reports/security',{recursive:true});
fs.writeFileSync('reports/security/recent-diff.json',JSON.stringify(report,null,2)+'\n');
fs.writeFileSync('reports/security/recent-diff.md','# Source change comparison\n\nBase: '+(base||'unavailable')+'\nHead: '+head+'\nChanged files: '+files.length+'\n'+files.map(x=>'- '+x.state+' '+x.path).join('\n')+'\n');
console.log(JSON.stringify({base,head,status,changed:files.length,security_relevant:sensitive.length}));
