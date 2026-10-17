import {readFile,mkdir,copyFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(await readFile(new URL('./extension/manifest.json',import.meta.url)));
if(manifest.manifest_version!==3||manifest.permissions.length||manifest.host_permissions||manifest.externally_connectable)throw new Error('extension_permission_review_required');
const out=new URL('./out/extension/',import.meta.url);await mkdir(out,{recursive:true});const hashes={};
for(const name of ['manifest.json','popup.html']){const file=new URL('./extension/'+name,import.meta.url);await copyFile(file,new URL(name,out));hashes[name]=createHash('sha256').update(await readFile(file)).digest('hex');}
await writeFile(new URL('provenance.json',out),JSON.stringify({kind:'unsigned-build-manifest',files:hashes},null,2));console.log('MV3 extension built: native/developer-browser/out/extension');
