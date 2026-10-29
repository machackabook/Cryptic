import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('./preview/',import.meta.url),out=new URL('./out/pwa/',import.meta.url);
await mkdir(out,{recursive:true});await cp(root,out,{recursive:true});
const names=['index.html','preview.js','preview.css','manifest.webmanifest','icon.svg','sw.js'];const hashes={};
for(const name of names)hashes[name]=createHash('sha256').update(await readFile(new URL(name,out))).digest('hex');
await writeFile(new URL('provenance.json',out),JSON.stringify({kind:'unsigned-pwa-build',files:hashes},null,2));
if(process.argv.includes('--iwa'))throw new Error('IWA signing tool, private signing key and supported-host validation are required; PWA output is not an IWA');
console.log('PWA preview built: native/developer-browser/out/pwa (installation not verified)');
