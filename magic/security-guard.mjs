/** GOD routing policy: deny unsafe references, redirects, and untrusted origins. */
const EXT=new Set(['https://crypticnews.org','https://www.crypticnews.org','https://api.crypticnews.org','https://bus.crypticnews.org','https://github.com','https://geocore-shepard-tone-engine.vercel.app']);
const BAD=/%(?:2f|5c|2e|00)|[\\\u0000-\u001f]/i;
export const MAGIC_SURFACES=Object.freeze(['home','terminal','galaxies','genie','consensus','voice','singularity','sentinel','quine','embedding','documents','irc','matrix','telemetry','bus','nodes','welcome']);
export function safeReference(raw,projectRoot,baseOrigin){
 if(typeof raw!=='string'||!raw||raw.length>900||BAD.test(raw)||raw.startsWith('//')||raw.includes('\\'))return null;
 let u,base;
 try{base=new URL(projectRoot);u=new URL(raw.startsWith('./interfaces/')?raw.slice(2):raw,base)}catch{return null}
 if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.search||u.hash)return null;
 if(u.origin===baseOrigin){
   if(!u.pathname.startsWith(base.pathname)||u.pathname.includes('/../'))return null;
   return u.href;
 }
 if(u.protocol!=='https:'||!EXT.has(u.origin))return null;
 if(u.hostname==='github.com'&&!/^\/(machackabook|Azazeleous)\/[A-Za-z0-9_.-]+\/?$/.test(u.pathname))return null;
 if(u.hostname==='geocore-shepard-tone-engine.vercel.app'&&u.pathname!=='/')return null;
 return u.href;
}
export function approvedSurface(raw){if(typeof raw!=='string')return null;const match=/^\.\/surfaces\/([a-z-]+)\.html$/.exec(raw);return match&&MAGIC_SURFACES.includes(match[1])?match[0]:null}
export function protectedFrame(node,root,origin){if(!node?.embed)return null;const url=safeReference(node.interface_url,root,origin);return url&&new URL(url).origin===origin?url:null}
