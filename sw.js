// Cryptic static-app offline cache: same-origin, allowlisted assets only.
const CACHE='cryptic-v0.9.1-security';
const ASSETS=[
  './','./index.html','./panel.html','./manifest.webmanifest',
  './ui/tokens.css','./ui/dashboard.css','./ui/modules.css','./ui/dashboard.js',
  './ui/panel.css','./ui/panel.js','./core/terminal-core.js',
  './cryptic-runtime.js','./cryptic-bus.js','./cryptic-console.js',
  './modules/manifest.json','./modules/session-geometry.js','./config/nodes.public.json',
  './magic/','./magic/index.html','./magic/magic.css','./magic/magic.js',
  './magic/surfaces/home.html','./magic/surfaces/terminal.html',
  './magic/surfaces/telemetry.html','./magic/surfaces/bus.html',
  './magic/surfaces/nodes.html','./magic/surfaces/singularity.html',
  './magic/surfaces/welcome.html','./magic/surfaces/network.html'
];
const APP_SCOPE=new URL(self.registration.scope);
const STATIC=new Set(ASSETS.map(x=>new URL(x,APP_SCOPE).href));
self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())
));
self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys
    .filter(k=>k.startsWith('cryptic-')&&k!==CACHE)
    .map(k=>caches.delete(k)))).then(()=>self.clients.claim())
));
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET'||req.mode==='no-cors'||req.headers.has('Authorization'))return;
  const url=new URL(req.url);
  if(url.origin!==APP_SCOPE.origin||!url.pathname.startsWith(APP_SCOPE.pathname))return;
  if(!STATIC.has(url.href)||url.search)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cached=await cache.match(req);
    try{
      const response=await fetch(req);
      if(response.ok&&response.type==='basic'&&response.status===200){
        await cache.put(req,response.clone());
      }
      return response;
    }catch(error){
      if(cached)return cached;
      throw error; // No HTML fallback for failed JS, JSON, or API requests.
    }
  })());
});
