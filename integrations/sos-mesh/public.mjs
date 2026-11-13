const HTML = nonce => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#030712">
<meta name="referrer" content="no-referrer">
<title>S.O.S · Sovereign Operating System</title>
<style>
:root{color-scheme:dark;--cyan:#67e8f9;--gold:#facc15;--ink:#030712;--panel:rgba(3,12,28,.82)}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:var(--ink);color:#e5f5ff;font:15px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace}
#field{position:fixed;inset:0;width:100%;height:100%;z-index:0}
body:after{content:"";position:fixed;inset:0;z-index:1;pointer-events:none;background:radial-gradient(ellipse at 50% 45%,transparent 5%,rgba(2,6,23,.35) 55%,#020617 100%)}
#toggleUI{position:fixed;z-index:5;top:14px;left:14px;border:1px solid #67e8f977;background:#071426dd;color:#dffaff;border-radius:9px;padding:10px 13px;cursor:pointer;backdrop-filter:blur(12px)}
#toggleUI:focus-visible,a:focus-visible{outline:2px solid var(--gold);outline-offset:3px}
#hud{position:relative;z-index:2;min-height:100vh;display:grid;place-items:center;padding:76px 18px 28px;transition:opacity .25s ease,transform .25s ease}
.panel{width:min(940px,100%);border:1px solid #67e8f955;background:var(--panel);backdrop-filter:blur(16px);border-radius:18px;padding:clamp(22px,5vw,48px);box-shadow:0 20px 80px #0009}
.eyebrow{color:var(--cyan);letter-spacing:.22em;font-size:.72rem;text-transform:uppercase}
h1{font-size:clamp(2.7rem,9vw,6.5rem);line-height:.94;letter-spacing:-.075em;margin:12px 0}
h1 span{display:block;color:var(--cyan)}
.lead{max-width:66ch;color:#b8cadb}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin:28px 0}
.card{display:block;min-height:112px;padding:17px;border:1px solid #31546e;border-radius:12px;background:#071426;color:#e5f5ff;text-decoration:none;transition:border-color .18s,transform .18s}
.card:hover{border-color:var(--cyan);transform:translateY(-2px)}
.card strong{display:block;color:var(--cyan);margin-bottom:7px}
.card small{color:#a8bacb}
.status{border-left:3px solid var(--gold);padding:10px 14px;background:#facc1510;color:#d7e5ef;font-size:.82rem}
footer{display:flex;flex-wrap:wrap;gap:14px;margin-top:22px;font-size:.76rem}
footer a{color:#8be9f8}
body.clear #hud{opacity:0;transform:scale(.985);pointer-events:none}
body.clear:after{background:radial-gradient(ellipse at 50% 45%,transparent 8%,rgba(2,6,23,.12) 75%,rgba(2,6,23,.35) 100%)}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{transition:none!important;scroll-behavior:auto!important}}
</style>
</head>
<body>
<canvas id="field" aria-hidden="true"></canvas>
<button id="toggleUI" type="button" aria-pressed="false" aria-label="Clear interface for visualization">◌ Clear UI</button>
<main id="hud">
<section class="panel">
<div class="eyebrow">GAIA · NEXUS · CRYPTIC MESH</div>
<h1>SOVEREIGN <span>OPERATING SYSTEM</span></h1>
<p class="lead">S.O.S is the model-facing workspace and sovereign interface layer. Cryptic provides the protected identity, policy, message routing and receipt boundary. Public visitors can explore the entry points; privileged mesh operations remain behind authentication.</p>
<div class="grid">
<a class="card" href="https://github.com/machackabook/Sovereign-Operating-System" rel="noopener noreferrer"><strong>S.O.S Source</strong><small>Repository, implementation and project history ↗</small></a>
<a class="card" href="https://aistudio.google.com/u/2/apps/6f015ad9-3029-45c2-b621-be21fae958a2" rel="noopener noreferrer"><strong>S.O.S Workspace</strong><small>Open the model-facing workspace ↗</small></a>
<a class="card" href="https://crypticnews.org/api/cryptic-mesh/health" rel="noopener noreferrer"><strong>Protected Mesh Gateway</strong><small>Cloudflare Access-protected health endpoint ↗</small></a>
<a class="card" href="https://crypticnews.org/nexus/" rel="noopener noreferrer"><strong>CRYPTIC Terminal</strong><small>Open the public Polyglot Quine terminal ↗</small></a>
<a class="card" href="https://uniomni.crypticnews.org/" rel="noopener noreferrer"><strong>UNIOMNI Knowledge Browser</strong><small>Public repository index and GAIA references ↗</small></a>
<a class="card" href="https://gaia-nexus-memory-bridge.machackabook.chatgpt.site/" rel="noopener noreferrer"><strong>GAIA Memory Bridge</strong><small>Owner-authenticated memory and MCP service ↗</small></a>
</div>
<div class="status"><strong>Security boundary:</strong> this public page exposes no device shell, credentials, local agent secret or private memory. The mesh API requires its separate authenticated session; opening this page does not grant access.</div>
<footer><a href="https://crypticnews.org/">CRYPTIC NEWS</a><a href="https://github.com/machackabook/ideal-enigma">UNIOMNI / ideal-enigma</a><a href="https://gaia-memory-portal.machackabook.chatgpt.site/">GAIA Memory Portal</a></footer>
</section>
</main>
<script nonce="${nonce}">
(()=>{
 const canvas=document.getElementById("field"),ctx=canvas.getContext("2d");
 const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
 let w=0,h=0,dpr=1,points=[],frame=0;
 function resize(){
  dpr=Math.min(devicePixelRatio||1,2);w=innerWidth;h=innerHeight;
  canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);
  canvas.style.width=w+"px";canvas.style.height=h+"px";ctx.setTransform(dpr,0,0,dpr,0,0);
  const count=Math.max(50,Math.min(190,Math.floor(w*h/8500)));
  points=Array.from({length:count},()=>({x:Math.random()*w,y:Math.random()*h,r:.4+Math.random()*1.5,v:.08+Math.random()*.32,p:Math.random()*6.28}));
  draw(0);
 }
 function draw(t){
  ctx.clearRect(0,0,w,h);
  for(const p of points){
   const y=(p.y+((reduced?0:p.v*(t/16))))%(h+8);
   const pulse=.35+.45*(.5+.5*Math.sin(t/900+p.p));
   ctx.beginPath();ctx.arc(p.x,y,p.r,0,Math.PI*2);ctx.fillStyle="rgba(103,232,249,"+pulse+")";ctx.fill();
  }
  if(!reduced)frame=requestAnimationFrame(draw);
 }
 resize();addEventListener("resize",resize,{passive:true});
 const toggle=document.getElementById("toggleUI");
 toggle.addEventListener("click",()=>{
  const on=document.body.classList.toggle("clear");
  toggle.setAttribute("aria-pressed",String(on));
  toggle.textContent=on?"◉ Show UI":"◌ Clear UI";
 });
 addEventListener("pagehide",()=>cancelAnimationFrame(frame),{once:true});
})();
</script>
</body>
</html>`;
export default {
 async fetch(request) {
  const url=new URL(request.url);
  const headers={
   "content-type":"text/html; charset=utf-8",
   "cache-control":"no-store",
   "x-content-type-options":"nosniff",
   "referrer-policy":"no-referrer",
   "permissions-policy":"camera=(), microphone=(), geolocation=()",
   "content-security-policy":"default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-"+nonce+"'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; img-src data:; connect-src 'none'"
  };
  if(url.pathname==="/healthz" && ["GET","HEAD"].includes(request.method)){
   return new Response(request.method==="HEAD"?null:JSON.stringify({ok:true,service:"cryptic-sos-public",version:"1.0.0",mode:"public-read-only",mesh:"access-protected"}),{status:200,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
  }
  if(!["GET","HEAD"].includes(request.method))return new Response("Method not allowed",{status:405,headers});
  if(url.pathname!=="/")return new Response("Not found",{status:404,headers});
  const nonce=crypto.randomUUID().replace(/-/g,"");
  const page=HTML(nonce);
  headers["content-security-policy"]="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-"+nonce+"'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; img-src data:; connect-src 'none'";
  return new Response(request.method==="HEAD"?null:page,{status:200,headers});
 }
};
