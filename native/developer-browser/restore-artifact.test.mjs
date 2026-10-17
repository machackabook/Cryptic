import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
test('local PWA backup/restore preserves exact build bytes and detects corruption',async()=>{
  const temp=await mkdtemp(path.join(tmpdir(),'nexus-artifact-restore-'));const backup=path.join(temp,'backup'),restored=path.join(temp,'restored');
  try{
    const source=new URL('./preview/',import.meta.url);await cp(source,backup,{recursive:true});await cp(backup,restored,{recursive:true});
    const digest=async file=>createHash('sha256').update(await readFile(file)).digest('hex');
    for(const name of ['index.html','preview.js','preview.css','manifest.webmanifest','icon.svg','sw.js'])assert.equal(await digest(path.join(restored,name)),await digest(new URL(name,source)));
    await writeFile(path.join(restored,'preview.js'),'corruption-fixture');assert.notEqual(await digest(path.join(restored,'preview.js')),await digest(new URL('preview.js',source)));
  }finally{await rm(temp,{recursive:true,force:true});}
});
