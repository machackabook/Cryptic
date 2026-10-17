import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const excluded=new Set(['.git','node_modules','reports','.security-private','dist']);
let checked=0;
function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(excluded.has(entry.name))continue;
    const target=path.join(dir,entry.name);
    if(entry.isDirectory())walk(target);
    else if(entry.isFile()&&/\.(?:js|mjs|cjs)$/.test(entry.name)){
      execFileSync(process.execPath,['--check',target],{stdio:['ignore','pipe','pipe']});
      checked++;
    }
  }
}
walk(process.cwd());
console.log(`JavaScript syntax valid for ${checked} files.`);
