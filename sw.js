const CACHE='cryptic-public-v0.9.1';
const ASSETS=[
  './',
  './index.html',
  './panel.html',
  './manifest.webmanifest',
  './ui/tokens.css',
  './ui/dashboard.css',
  './ui/modules.css',
  './ui/dashboard.js',
  './ui/panel.css',
  './ui/panel.js',
  './core/terminal-core.js',
  './cryptic-runtime.js',
  './cryptic-bus.js',
  './cryptic-console.js',
  './modules/manifest.json',
  './modules/session-geometry.js',
  './config/nodes.public.json',
  './magic/',
  './magic/index.html',
  './magic/magic.css',
  './magic/magic.js',
  './magic/surfaces/home.html',
  './magic/surfaces/terminal.html',
  './magic/surfaces/telemetry.html',
  './magic/surfaces/bus.html',
  './magic/surfaces/nodes.html',
  './magic/surfaces/singularity.html',
  './magic/surfaces/welcome.html',
  './magic/surfaces/network.html'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('cryptic-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
const PUBLIC_URLS=new Set(ASSETS.map(p=>new URL(p,self.registration.scope).href));
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(e.request.method!=='GET'||url.origin!==self.location.origin||url.search||e.request.headers.has('authorization')||!PUBLIC_URLS.has(url.href))return;
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>{
    if(res.ok&&res.type==='basic'&&!/no-store|private/i.test(res.headers.get('cache-control')||'')){
      const copy=res.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)));
    }
    return res;
  })));
});
