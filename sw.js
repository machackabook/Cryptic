const CACHE='cryptic-public-polyglot-v1';
const ASSETS=['./','./index.html','./polyglot-public.css','./polyglot-public.js','./manifest.webmanifest','./legacy.html'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('cryptic-public-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET'||u.origin!==self.location.origin||e.request.headers.has('authorization'))return;
 if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)));}return r;}).catch(()=>caches.match(e.request).then(c=>c||caches.match('./index.html'))));return;}
 if(!ASSETS.some(p=>new URL(p,self.registration.scope).pathname===u.pathname)||u.search)return;
 e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request)));
});