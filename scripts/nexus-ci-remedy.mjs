#!/usr/bin/env node
// Only pre-reviewed and deterministic, non-executable workflow compatibility remedies.
// Never execute text from workflow logs, PR bodies, comments, branches or model output.
import fs from 'node:fs';
const allowed=['.github/workflows/cascade.yml','.github/workflows/pages-security.yml'];
const dry=process.argv.includes('--dry-run');
let changes=0;
for (const path of allowed) {
  if (!fs.existsSync(path)) continue;
  const old=fs.readFileSync(path,'utf8');
  let revised=old.replaceAll("node-version: '20'","node-version: '22'");
  revised=revised.replaceAll('node-version: "20"','node-version: "22"');
  if(revised!==old){changes++;if(!dry)fs.writeFileSync(path,revised);console.log('KNOWN_REMEDY: node-runtime-upgrade '+path);}
}
console.log(JSON.stringify({classification: changes?'KNOWN_FIXED':'NO_APPROVED_REMEDY',files:changes,mode:dry?'dry-run':'apply'}));
