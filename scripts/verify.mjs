import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd(),files=[];
function walk(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){if(['.git','node_modules'].includes(e.name))continue;const f=path.join(p,e.name);e.isDirectory()?walk(f):files.push(f);}}
walk(root);

const patterns=[
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /AIza[0-9A-Za-z_-]{30,}/,
  /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/,
  /gh[pousr]_[A-Za-z0-9]{20,}/,
  /xox[baprs]-[A-Za-z0-9-]{10,}/
];

const bad=[];
for(const f of files){
  if(fs.statSync(f).size>2_000_000)continue;
  const s=fs.readFileSync(f,'utf8');
  for(const re of patterns) if(re.test(s)) bad.push(`${path.relative(root,f)} matches ${re}`);
}

const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const required of ['mintToken(','COSMIC GUARDIAN','963','MANDELBROT','runtime request token']) {
  if(!index.includes(required)) bad.push(`index.html missing ${required}`);
}

if(bad.length){
  console.error('VERIFY FAIL\n'+bad.join('\n'));
  process.exit(1);
}
console.log(`VERIFY PASS: ${files.length} files scanned; no blocked secret patterns; core runtime markers present.`);
