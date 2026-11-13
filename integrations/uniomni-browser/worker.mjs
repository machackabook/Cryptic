const HTML = nonce => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#030712">
<meta name="referrer" content="no-referrer">
<title>UNIOMNI · Public Knowledge Browser</title>
<style>
:root{color-scheme:dark;--cyan:#67e8f9;--gold:#facc15;--ink:#030712;--panel:rgba(3,12,28,.84)}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:var(--ink);color:#e5f5ff;font:14px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace}
#field{position:fixed;inset:0;width:100%;height:100%;z-index:0}
body:after{content:"";position:fixed;inset:0;z-index:1;pointer-events:none;background:radial-gradient(ellipse at 50% 45%,transparent 8%,rgba(2,6,23,.4) 65%,#020617 100%)}
#toggleUI{position:fixed;z-index:5;top:14px;left:14px;border:1px solid #67e8f977;background:#071426e8;color:#dffaff;border-radius:9px;padding:10px 13px;cursor:pointer;backdrop-filter:blur(12px)}
#hud{position:relative;z-index:2;width:min(1120px,100%);margin:0 auto;padding:72px 16px 28px;transition:opacity .25s ease,transform .25s ease}
.panel{border:1px solid #67e8f955;background:var(--panel);backdrop-filter:blur(16px);border-radius:16px;padding:clamp(18px,3vw,32px);box-shadow:0 20px 80px #0009}
.eyebrow{color:var(--cyan);letter-spacing:.2em;font-size:.7rem;text-transform:uppercase}
h1{font-size:clamp(2.4rem,8vw,5.5rem);line-height:.95;letter-spacing:-.07em;margin:10px 0}
h1 span{color:var(--cyan)}
p{color:#b8cadb}
nav{display:flex;flex-wrap:wrap;gap:14px;margin:16px 0}
a{color:#8be9f8}
.controls{display:grid;grid-template-columns:minmax(0,1fr) 170px auto;gap:10px;margin:22px 0}
input,select,button{font:inherit}
input,select{width:100%;background:#071426;color:#e5f5ff;border:1px solid #31546e;border-radius:9px;padding:12px}
button.action{background:#0b2738;border:1px solid #67e8f977;color:#dffaff;border-radius:9px;padding:10px 14px;cursor:pointer}
#status{font-size:.78rem;color:#9fb6c8;margin:8px 0 14px}
#results{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px}
.result{border:1px solid #29445c;border-radius:11px;padding:14px;background:#071426cc;min-width:0}
.result h3{font-size:.92rem;margin:0 0 7px;color:#b9f5ff;overflow-wrap:anywhere}
.result p{font-size:.78rem;margin:6px 0;color:#a9bdce;overflow-wrap:anywhere}
.meta{display:flex;gap:8px;flex-wrap:wrap;font-size:.68rem;color:#facc15;margin:6px 0}
.result a{font-size:.75rem}
.note{border-left:3px solid var(--gold);padding:9px 13px;background:#facc1510;color:#d7e5ef;font-size:.78rem;margin-top:18px}
body.clear #hud{opacity:0;transform:scale(.985);pointer-events:none}
body.clear:after{background:radial-gradient(ellipse at 50% 45%,transparent 8%,rgba(2,6,23,.1) 80%,rgba(2,6,23,.3) 100%)}
@media(max-width:650px){.controls{grid-template-columns:1fr}.panel{padding:18px}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{transition:none!important}}
</style>
</head>
<body>
<canvas id="field" aria-hidden="true"></canvas>
<button id="toggleUI" type="button" aria-pressed="false">◌ Clear UI</button>
<main id="hud">
<section class="panel">
<div class="eyebrow">GAIA · NEXUS · UNIOMNI</div>
<h1>PUBLIC <span>KNOWLEDGE BROWSER</span></h1>
<p>Search the public <strong>machackabook/ideal-enigma</strong> repository: README sections, tracked source paths, capability declarations and artifact receipts. This index does not read private memory or transfer authenticated sessions.</p>
<nav>
<a href="https://crypticnews.org/">CRYPTIC</a>
<a href="https://sos.crypticnews.org/">S.O.S</a>
<a href="https://github.com/machackabook/ideal-enigma">Source repository</a>
<a href="https://gaia-nexus-memory-bridge.machackabook.chatgpt.site/">Owner-authenticated GAIA Memory Bridge</a>
</nav>
<div class="controls">
<input id="query" type="search" placeholder="Search concepts, files, TDOCs, capabilities…" aria-label="Search public knowledge index">
<select id="filter" aria-label="Filter results">
<option value="all">All sources</option>
<option value="guide">README sections</option>
<option value="source">Repository files</option>
<option value="artifact">Artifact receipts</option>
<option value="capability">Capabilities</option>
</select>
<button class="action" id="refresh" type="button">Refresh index</button>
</div>
<div id="status" role="status" aria-live="polite">Loading public repository index…</div>
<div id="results"></div>
<div class="note"><strong>Privacy boundary:</strong> only public GitHub metadata and public documentation are indexed here. Private GAIA memory remains in the separately authenticated Memory Bridge; no tokens, cookies, private records or device files are fetched by this page.</div>
</section>
</main>
<script nonce="${nonce}">
(()=>{
 const raw="https://raw.githubusercontent.com/machackabook/ideal-enigma/main/";
 const repo="https://github.com/machackabook/ideal-enigma";
 const state={records:[],loaded:false};
 const status=document.getElementById("status"),results=document.getElementById("results");
 const query=document.getElementById("query"),filter=document.getElementById("filter");
 const safeText=v=>String(v??"");
 async function read(path,jsonMode){
  const response=await fetch(raw+path,{cache:"no-store",redirect:"error"});
  if(!response.ok)throw new Error(path+" HTTP "+response.status);
  return jsonMode?response.json():response.text();
 }
 function add(record){state.records.push(record);}
 function build(readme,manifest,caps,release){
  state.records=[];
  add({title:"README · Primary index",path:"README.md",kind:"guide",summary:"Primary UNIOMNI index and navigation",text:readme});
  const lines=readme.split("\n");let heading="",section=[];
  const flush=()=>{if(heading)add({title:heading,path:"README.md",kind:"guide",summary:section.join(" ").slice(0,420),text:heading+" "+section.join(" ")});};
  for(const line of lines){
   if(/^#{1,3} /.test(line)){flush();heading=line.replace(/^#+ /,"").trim();section=[];}
   else if(heading&&line.trim())section.push(line.trim());
  }
  flush();
  for(const [path,hash] of Object.entries(release.files||{})){
   add({title:path,path,kind:"source",summary:"Tracked source file · SHA-256 "+String(hash).slice(0,16),text:path+" "+hash});
  }
  for(const item of (Array.isArray(manifest)?manifest:[])){
   const text=[item.name,item.activation,item.status,item.sha256].join(" ");
   add({title:item.name,path:"layers/manifest.json",kind:"artifact",summary:item.status||item.activation||"Artifact receipt",text});
  }
  for(const [section,items] of Object.entries(caps||{})){
   if(Array.isArray(items))for(const item of items)add({title:String(item),path:"docs/capabilities.json",kind:"capability",summary:"Capability group: "+section,text:section+" "+item});
   else if(items&&typeof items==="object")for(const [key,value] of Object.entries(items))add({title:key,path:"docs/capabilities.json",kind:"capability",summary:String(value),text:key+" "+value+" "+section});
  }
  state.loaded=true;
  status.textContent="Indexed "+state.records.length+" public entries from ideal-enigma · private memory excluded.";
  render();
 }
 function render(){
  const terms=query.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const kind=filter.value;
  const matches=state.records.filter(r=>(kind==="all"||r.kind===kind)&&terms.every(t=>(r.title+" "+r.path+" "+r.summary+" "+r.text).toLowerCase().includes(t)));
  results.replaceChildren();
  status.textContent=state.loaded?matches.length+" matching public entries · "+state.records.length+" indexed":"Loading public repository index…";
  for(const r of matches.slice(0,80)){
   const card=document.createElement("article");card.className="result";
   const title=document.createElement("h3");title.textContent=r.title;
   const meta=document.createElement("div");meta.className="meta";meta.textContent=r.kind.toUpperCase()+" · "+r.path;
   const summary=document.createElement("p");summary.textContent=r.summary;
   const link=document.createElement("a");link.textContent="Open source ↗";link.target="_blank";link.rel="noopener noreferrer";
   link.href=repo+"/blob/main/"+r.path.split("/").map(encodeURIComponent).join("/");
   card.append(title,meta,summary,link);results.append(card);
  }
  if(state.loaded&&matches.length===0){const empty=document.createElement("p");empty.textContent="No matches. Try a broader term or select All sources.";results.append(empty);}
  if(matches.length>80){const more=document.createElement("p");more.textContent="Showing first 80 results. Narrow the query for more precise matches.";results.append(more);}
 }
 async function load(){
  state.loaded=false;state.records=[];results.replaceChildren();status.textContent="Loading public repository index…";
  try{
   const [readme,manifest,caps,release]=await Promise.all([
    read("README.md",false),read("layers/manifest.json",true),read("docs/capabilities.json",true),read("release.json",true)
   ]);
   build(readme,manifest,caps,release);
  }catch(error){
   state.loaded=true;status.textContent="Index fetch failed: "+safeText(error.message)+". Open the public repository README directly.";
   const link=document.createElement("a");link.href=repo;link.textContent="Open ideal-enigma ↗";link.rel="noopener noreferrer";results.replaceChildren(link);
  }
 }
 query.addEventListener("input",render);
 filter.addEventListener("change",render);
 document.getElementById("refresh").addEventListener("click",load);
 const toggle=document.getElementById("toggleUI");
 toggle.addEventListener("click",()=>{
  const on=document.body.classList.toggle("clear");
  toggle.setAttribute("aria-pressed",String(on));
  toggle.textContent=on?"◉ Show UI":"◌ Clear UI";
 });
 const canvas=document.getElementById("field"),ctx=canvas.getContext("2d");
 const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
 let w=0,h=0,dpr=1,stars=[],frame=0;
 function draw(t){
  ctx.clearRect(0,0,w,h);
  for(const s of stars){const y=(s.y+(reduced?0:s.v*t/16))%(h+5);ctx.beginPath();ctx.arc(s.x,y,s.r,0,Math.PI*2);ctx.fillStyle="rgba(103,232,249,"+(0.3+0.5*(0.5+0.5*Math.sin(t/900+s.p)))+")";ctx.fill();}
  if(!reduced)frame=requestAnimationFrame(draw);
 }
 function resize(){
  dpr=Math.min(devicePixelRatio||1,2);w=innerWidth;h=innerHeight;
  canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
  stars=Array.from({length:Math.max(55,Math.min(170,Math.floor(w*h/9000)))},()=>({x:Math.random()*w,y:Math.random()*h,r:.4+Math.random()*1.3,v:.05+Math.random()*.25,p:Math.random()*6.28}));
  draw(0);
 }
 resize();addEventListener("resize",resize,{passive:true});addEventListener("pagehide",()=>cancelAnimationFrame(frame),{once:true});
 load();
})();
</script>
</body>
</html>`;
export default {
 async fetch(request){
  const url=new URL(request.url);
  const base={"cache-control":"no-store","x-content-type-options":"nosniff","referrer-policy":"no-referrer","permissions-policy":"camera=(), microphone=(), geolocation=()"};
  if(url.pathname==="/healthz"&&["GET","HEAD"].includes(request.method)){
   return new Response(request.method==="HEAD"?null:JSON.stringify({ok:true,service:"cryptic-uniomni-browser",index_scope:"public repository metadata only",private_memory:"not_exposed"}),{status:200,headers:{...base,"content-type":"application/json; charset=utf-8"}});
  }
  if(!["GET","HEAD"].includes(request.method))return new Response("Method not allowed",{status:405,headers:base});
  if(url.pathname!=="/")return new Response("Not found",{status:404,headers:base});
  const nonce=crypto.randomUUID().replace(/-/g,"");
  const csp="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-"+nonce+"'; connect-src https://raw.githubusercontent.com; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
  return new Response(request.method==="HEAD"?null:HTML(nonce),{status:200,headers:{...base,"content-type":"text/html; charset=utf-8","content-security-policy":csp}});
 }
};
