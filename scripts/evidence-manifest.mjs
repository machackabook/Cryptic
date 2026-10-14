#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const dir='reports/security';fs.mkdirSync(dir,{recursive:true});
const files=fs.readdirSync(dir).filter(s=>s.endsWith('.json')&&s!=='evidence-manifest.json').sort();
const entries=files.map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(path.join(dir,file))).digest('hex')}));
fs.writeFileSync(path.join(dir,'evidence-manifest.json'),JSON.stringify({schema:'cryptic.evidence.manifest.v1',at:new Date().toISOString(),entries,productionVerified:false,qualification:'Content hashes support comparison with a trusted retained artifact. They do not authenticate the publisher or prove deployment.'},null,2)+'\n');
console.log(JSON.stringify({evidenceFiles:entries.length,productionVerified:false}));
if(!entries.length)process.exitCode=1;
