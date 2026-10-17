import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {recordSourceDiff} from '../scripts/security-diff.mjs';
function repo(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'cryptic-diff-'));
 const git=args=>execFileSync('git',['-c','user.name=Security Test','-c','user.email=test@example.invalid',...args],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git(['init']);fs.writeFileSync(path.join(root,'index.html'),'one');git(['add','.']);git(['commit','-m','one']);const base=git(['rev-parse','HEAD']);
 const odd='config\twith\nnewline.json';fs.writeFileSync(path.join(root,odd),'{}');git(['add','.']);git(['commit','-m','two']);const head=git(['rev-parse','HEAD']);
 return {root,base,head,odd};
}
function run(r,event){
 const eventPath=path.join(r.root,'event.json');fs.writeFileSync(eventPath,JSON.stringify(event));
 const {code}=recordSourceDiff({root:r.root,eventName:'push',eventPath});const result={status:code,stderr:''};
 return {result,report:JSON.parse(fs.readFileSync(path.join(r.root,'reports/security/recent-diff.json'),'utf8'))};
}
test('diff receipts use exact push revisions and preserve filenames containing tabs/newlines',()=>{
 const r=repo();try{
  const {result,report}=run(r,{before:r.base,after:r.head});assert.equal(result.status,0,result.stderr);assert.equal(report.base,r.base);assert.equal(report.head,r.head);assert.ok(report.files.some(f=>f.path===r.odd));assert.match(report.receiptSha256,/^[a-f0-9]{64}$/);
 }finally{fs.rmSync(r.root,{recursive:true,force:true})}
});
test('mismatched revision fails closed and initial pushes compare against the empty tree',()=>{
 const r=repo();try{
  const bad=run(r,{before:r.base,after:'f'.repeat(40)});assert.equal(bad.result.status,1);assert.equal(bad.report.status,'unverified');
  const first=run(r,{before:'0'.repeat(40),after:r.head});assert.equal(first.result.status,0,first.result.stderr);assert.ok(first.report.files.some(f=>f.path==='index.html'));
 }finally{fs.rmSync(r.root,{recursive:true,force:true})}
});
