// NEXUS CrypticNews v10 — Cloudflare public read-only edge, no secrets, no arbitrary proxy.
const SITE='https://crypticnews.org';
const repo='https://github.com/machackabook/Cryptic';
const source='https://github.com/machackabook/Cryptics-Hyper-Terminal-OS';
const nav=[
 {url:'/',label:'CrypticNews'}, {url:'/news/',label:'News'}, {url:'/hyperterminal/',label:'HyperTerminal OS'},
 {url:'/apps/',label:'App Gallery'}, {url:'/agents/',label:'Agent Directory'}, {url:'/docs/',label:'Documentation'}
];
const catalog=[
 {id:'hyperterminal',title:'Cryptic HyperTerminal OS',status:'SOURCE_AVAILABLE',page:'/hyperterminal/',source:repo},
 {id:'telemetry',title:'Golden Army Telemetry',status:'RELEASE_GATED',page:'/hyperterminal/',source},
 {id:'terrasphere',title:'TerraSphere Geonav',status:'INTEGRATION_PENDING',page:'/apps/',source:null},
 {id:'gaia',title:'GAIA SkillForge',status:'LOCAL_ADAPTER_ONLY',page:'/agents/',source}
];
const redirects=new Map([['/terminal','/hyperterminal/'],['/hyperterminal','/hyperterminal/'],['/appstore','/apps/'],['/news','/news/'],['/apps','/apps/'],['/agents','/agents/'],['/docs','/docs/']]);
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function htmlPage(title,body,path){
 const links=nav.map(x=>`<a href="${x.url}">${x.label}</a>`).join('');
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | CrypticNews</title><meta name="description" content="Verified updates and modular developer interfaces from the Cryptic/NEXUS project."><link rel="canonical" href="${SITE+path}"><link rel="manifest" href="/manifest.webmanifest"><style>*,*:before,*:after{box-sizing:border-box}body{margin:0;background:#0A0A1F;color:#E0E7FF;font:16px system-ui,sans-serif}header,footer{padding:1.2rem 5vw;background:#14143D}header a{color:#00FFFF;margin-right:1rem;display:inline-block;padding:.4rem}a{color:#00FFFF}main{max-width:1080px;margin:auto;padding:4rem 5vw;min-height:55vh}.hero{padding:2.5rem;background:#14143D;border:1px solid #9333EA;border-radius:18px}.label{color:#FFCC00;text-transform:uppercase;letter-spacing:.2em;font-size:.75rem}.btn{display:inline-block;padding:.75rem 1rem;background:#9333EA;color:white;border-radius:7px;margin:.4rem .4rem .4rem 0}.state{padding:.8rem;background:#020516;border:1px solid #9932CC;border-radius:10px}code{color:#34D399}h1{font-size:clamp(2rem,6vw,4rem)}</style></head><body><header><b>⨋Ⓖန⇔နⒼ NEXUS / CRYPTICNEWS</b><nav aria-label="Main navigation">${links}</nav></header><main><div class="hero"><div class="label">Public source — secure runtime gateway</div><h1>${title}</h1>${body}</div></main><footer>Source verified through GitHub repository links. Private Enclave, chat archives and privileged operations are never served here.</footer></body></html>`;
}
const pages={
 '/': ['Verified News. Living Systems.',`<p>The public entrance to NEXUS, GAIA, ADAM and Cryptic HyperTerminal OS. Runtime capabilities require live evidence and authenticated backends.</p><a class="btn" href="/hyperterminal/">Launch HyperTerminal</a><a class="btn" href="/apps/">App Gallery</a><p class="state">Release state: PRODUCTION NOT YET VERIFIED. <a href="${repo}">View source ↗</a></p>`],
 '/news/':['CrypticNews',`<p>Development updates are published from validated GitHub releases. No invented or automatically generated live claims.</p><a href="${repo}/releases">Releases ↗</a>`],
 '/apps/':['Cross-Platform App Gallery',`<p>Chrome extensions, Android packages, PWA and desktop releases are separately signed and reviewed before publishing.</p>${catalog.map(a=>`<p class="state"><a href="${a.page}">${a.title}</a> — ${a.status} ${a.source?`<a href="${a.source}">source ↗</a>`:''}</p>`).join('')}`],
 '/agents/':['AI Capability Directory',`<p>6,000 agent identities are planned as logical registry slots, not 6,000 attested running processes. AI crawlers can read public documentation without access to the private gateway.</p><a href="/.well-known/ai-plugin.json">Machine-readable capabilities</a>`],
 '/docs/':['Architecture and Verification',`<p>ADAM proof gates, Gemini/Codex instructions, source, security, provenance, and interoperability definitions.</p><a href="${repo}/blob/main/GEMINI.md">Gemini instructions ↗</a><p><a href="${repo}/blob/main/docs/ADAM_RELEASE_GATES.md">Release gates ↗</a></p>`]
};
const known=['/','/news/','/apps/','/agents/','/docs/','/hyperterminal/'];
function robot(){return 'User-agent: *\nAllow: /\nDisallow: /api/private/\nDisallow: /internal/\nDisallow: /enclave/\nSitemap: '+SITE+'/sitemap.xml\n'}
function sitemap(){return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+known.map(x=>'<url><loc>'+SITE+x+'</loc></url>').join('')+'</urlset>'}
function security(res,req){
 const h=new Headers(res.headers);
 h.set('x-content-type-options','nosniff');h.set('referrer-policy','strict-origin-when-cross-origin');h.set('x-frame-options','DENY');
 h.set('permissions-policy','camera=(), microphone=(), geolocation=(), payment=()');
 h.set('cross-origin-resource-policy','same-origin');h.set('x-nexus-surface','public');
 h.set('content-security-policy',"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
 if(new URL(req.url).hostname.endsWith('workers.dev'))h.set('x-robots-tag','noindex');
 return new Response(req.method==='HEAD'?null:res.body,{status:res.status,headers:h});
}
export default {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(!['GET','HEAD'].includes(request.method))return security(json({error:'method_not_allowed'},405),request);
 if(path.startsWith('/api/private')||path.startsWith('/internal')||path.startsWith('/enclave')||path.startsWith('/rpc')||path.startsWith('/.env'))return security(json({error:'not_found'},404),request);
 if(redirects.has(path))return security(new Response(null,{status:308,headers:{location:redirects.get(path)}}),request);
 if(path==='/healthz')return security(json({ok:true,scope:'public_worker_only',build:'v10'}),request);
 if(path==='/api/public/status')return security(json({schema:'cryptic.status.v10',edge:'SERVING',hyperterminal:'BUILD_REQUIRED',privateGateway:'NOT_EXPOSED',auth:'NOT_CONFIGURED',models:'NOT_CONNECTED',build:'v10',timestamp:new Date().toISOString()}),request);
 if(path==='/api/public/catalog')return security(json({schema:'cryptic.catalog.v10',products:catalog}),request);
 if(path==='/api/public/navigation')return security(json({schema:'cryptic.routes.v10',routes:nav,protected:['/api/private/','/internal/','/enclave/']}),request);
 if(path==='/robots.txt')return security(new Response(robot(),{headers:{'content-type':'text/plain; charset=utf-8'}}),request);
 if(path==='/llms.txt')return security(new Response('# CrypticNews — Public NEXUS Docs\n> Verified public links only.\n\n- '+SITE+'/docs/\n- '+repo+'\n- '+source+'\n\nNo credentials, private agents or internal endpoints are available to crawlers.\n',{headers:{'content-type':'text/plain; charset=utf-8'}}),request);
 if(path==='/sitemap.xml')return security(new Response(sitemap(),{headers:{'content-type':'application/xml; charset=utf-8'}}),request);
 if(path==='/manifest.webmanifest')return security(json({name:'CrypticNews — NEXUS',short_name:'CrypticNews',display:'standalone',start_url:'/',background_color:'#0A0A1F',theme_color:'#9333EA'}),request);
 if(path==='/.well-known/ai-plugin.json')return security(json({schema_version:'v1',name_for_human:'CrypticNews',name_for_model:'crypticnews',description_for_human:'Verified public Nexus and HyperTerminal documentation',description_for_model:'Read-only public info; no private agent access or authenticated operations',api:{type:'openapi',url:SITE+'/api/public/navigation'},logo_url:SITE+'/favicon.ico',contact_email:null,legal_info_url:SITE+'/docs/'}),request);
 if(path==='/hyperterminal/'||path==='/hyperterminal/index.html'){
  if(!env?.ASSETS?.fetch)return security(new Response(htmlPage('HyperTerminal release pending','<p>Cloudflare build asset binding unavailable. Review the canonical GitHub source instead.</p><a class="btn" href="'+source+'">View HyperTerminal source</a>','/hyperterminal/'),{status:503,headers:{'content-type':'text/html; charset=utf-8'}}),request);
  const entry=new URL('/index.html',url);
  const res=await env.ASSETS.fetch(new Request(entry.toString(),request));
  return security(res.status===200?res:new Response(htmlPage('HyperTerminal asset unavailable','<p>Build has not passed or is not deployed.</p><a class="btn" href="'+source+'">Source ↗</a>','/hyperterminal/'),{status:503,headers:{'content-type':'text/html'}}),request);
 }
 if(pages[path]){const [title,body]=pages[path];return security(new Response(htmlPage(title,body,path),{headers:{'content-type':'text/html; charset=utf-8'}}),request);}
 if(env?.ASSETS?.fetch){return security(await env.ASSETS.fetch(request),request);}
 return security(json({error:'not_found'},404),request);
 }};
