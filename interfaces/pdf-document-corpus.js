
const DOCUMENTS = [
  {
    id: "tdoc-sentinel",
    title: "TDOC Sentinel Master V11 — Dual Authority & Sovereign Runtime",
    category: "Security & Sovereignty",
    date: "2026-10-07",
    osModule: "/interfaces/tdoc-sentinel-v11.html",
    terminalCommand: "sentinel verify",
    status: "CATALOGUE ONLY — NOT RUNTIME VERIFIED",
    description: "Sovereign node pair verification between Samsung ARM64 and Chromebook x86 systems. Ed25519 node keypair authentication, quarantine receipts, and outbox/inbox pipeline.",
    integrationSummary: "Related interface path is listed for navigation; this catalogue entry does not verify deployment, authentication, or operational status.",
    content: `[IDENTITY] Establishing node key...
Generating public/private ed25519 key pair.
Device key material, fingerprint, and private filesystem paths have been omitted from this public catalogue. Device ownership is not verified here.

[OS SUBSYSTEM VERIFICATION]
  ssh      OK  /data/data/com.termux/files/usr/bin/ssh
  sshd     OK  /data/data/com.termux/files/usr/bin/sshd
  rsync    OK  /data/data/com.termux/files/usr/bin/rsync
  git      OK  /data/data/com.termux/files/usr/bin/git
  python   OK  /data/data/com.termux/files/usr/bin/python
  node     OK  /data/data/com.termux/files/usr/bin/node
  jq       OK  /data/data/com.termux/files/usr/bin/jq

STATUS: BOOTSTRAP COMPLETE · Role: SAMSUNG · Outbox: /data/data/com.termux/files/home/Æ/sync/outbox`
  },
  {
    id: "pnt-matrix",
    title: "PNT Hardware Matrix & Autonomous Navigation Timing Architecture",
    category: "Hardware & Navigation",
    date: "2026-09-28",
    osModule: "/interfaces/pnt-hardware-matrix.html",
    terminalCommand: "open pnt",
    status: "CATALOGUE ONLY — NOT RUNTIME VERIFIED",
    description: "Position, Navigation, and Timing (PNT) hardware matrix covering atomic clocks, GNSS constellation receivers (GPS, Galileo, GLONASS, BeiDou), INS/IMU, Kalman filtering, and disciplined oscillators.",
    integrationSummary: "Related interface path is listed for navigation; this catalogue entry does not verify deployment, authentication, or operational status.",
    content: `[PNT HARDWARE MATRIX SPECIFICATION]
Position, Navigation, and Timing (PNT) Core Architecture:
  1. Primary Reference Clocks: Rubidium Atomic Frequency Standard (10 MHz, 1 PPS).
  2. Multi-GNSS Engine: Quad-constellation tracking (L1/L2/L5/E1/E5a).
  3. Inertial Measurement Unit: 6-DoF tactical grade MEMS IMU with 1000 Hz loop rate.
  4. State Estimation: 15-state Extended Kalman Filter (EKF) with position covariance < 0.05m².
  5. Holdover Oscillator: Oven-Controlled Crystal Oscillator (OCXO) drift < 1 μs/24h.`
  },
  {
    id: "polyglot-quine",
    title: "Polyglot Quine Shell Living Artifact Architecture",
    category: "Quine Runtime",
    date: "2026-10-02",
    osModule: "/interfaces/polyglot-quine-shell.html",
    terminalCommand: "quine",
    status: "CATALOGUE ONLY — NOT RUNTIME VERIFIED",
    description: "Zero-payload, self-assembling, multimodal living artifact template. Dynamic Webpack chunking, code splitting, reactive HTML size monitor, and automated config generator.",
    integrationSummary: "Related interface path is listed for navigation; this catalogue entry does not verify deployment, authentication, or operational status.",
    content: `[POLYGLOT QUINE SHELL LIVING ARTIFACT]
Specification:
  - Zero-payload, self-assembling multimodal container.
  - Environmental sensors & WebSockets telemetry hub.
  - Dynamic auth & ephemeral scratchpad volume.
  - Webpack chunking & code splitting engine.
  - Real-time token streaming playground with DOM substitution.
  - Multi-target router: Auto-Sphinx, ePub, Canvas, and Smart Contract IDE.`
  },
  {
    id: "gaia-suite",
    title: "GAIA Autonomous Verification Suite & Command Protocols",
    category: "Autonomous Mesh",
    date: "2026-10-04",
    osModule: "/magic/surfaces/terminal.html",
    terminalCommand: "gaia verify --everything",
    status: "CATALOGUE ONLY — NOT RUNTIME VERIFIED",
    description: "Comprehensive 14-step autonomous verification and node lifecycle protocol: gaia verify, init, login, node enroll, mesh, storage, models, mcp, evolve, promote, rollback, recover.",
    integrationSummary: "Related interface path is listed for navigation; this catalogue entry does not verify deployment, authentication, or operational status.",
    content: `[GAIA COMMAND PROTOCOL]
Execution Pipeline:
  1. gaia verify --everything
  2. gaia init
  3. gaia login
  4. gaia node enroll <name>
  5. gaia mesh verify
  6. gaia storage verify
  7. gaia models verify
  8. gaia mcp verify
  9. gaia image create
  10. gaia test --full
  11. gaia status
  12. gaia evolve
  13. gaia promote
  14. gaia rollback / gaia recover`
  },
  {
    id: "gemini-embedding",
    title: "Gemini Multimodal Embedding 2 Preview Specification",
    category: "Neural Embeddings",
    date: "2026-10-05",
    osModule: "/interfaces/gemini-multimodal-embedding.html",
    terminalCommand: "embed",
    status: "CATALOGUE ONLY — NOT RUNTIME VERIFIED",
    description: "Multimodal content embedding (text, image, and audio) into 768/1536-dimensional latent vector spaces using gemini-embedding-2-preview and Poincaré hyper-spherical projections.",
    integrationSummary: "Related interface path is listed for navigation; this catalogue entry does not verify deployment, authentication, or operational status.",
    content: `[GEMINI MULTIMODAL EMBEDDING 2 PREVIEW]
API Calling Pattern:
  from google import genai
  from google.genai import types

  client = genai.Client()
  with open("example.png", "rb") as f: image_bytes = f.read()
  with open("sample.mp3", "rb") as f: audio_bytes = f.read()

  result = client.models.embed_content(
      model="gemini-embedding-2-preview",
      contents=[
          "What is the meaning of life?",
          types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
          types.Part.from_bytes(data=audio_bytes, mime_type="audio/mpeg"),
      ],
  )
  print(result.embeddings)`
  },
  {
    id: "skybox-orbitals",
    title: "7-Galaxies Deep Skybox & Relativistic Kerr Metric Orbitals",
    category: "Graphics & Astrodynamics",
    date: "2026-10-06",
    osModule: "/interfaces/enhanced-skybox-7-galaxies.html",
    terminalCommand: "galaxies warp",
    status: "CATALOGUE ONLY — NOT RUNTIME VERIFIED",
    description: "Deep celestial skybox featuring 7 major galaxies (Andromeda, Triangulum, Sombrero, Whirlpool, Cartwheel, Cigar, Gateway Core), Kerr black hole frame dragging, and 3,200 Keplerian orbital particles.",
    integrationSummary: "Related interface path is listed for navigation; this catalogue entry does not verify deployment, authentication, or operational status.",
    content: `[RELATIVISTIC ORBITAL & SKYBOX SPECIFICATION]
Cosmic Objects:
  - M31 Andromeda: Blue-violet spiral arm particle cloud (800 particles)
  - M33 Triangulum: Cyan open-spiral star-forming region (450 particles)
  - M104 Sombrero: Golden galactic bulge & dark dust lane (400 particles)
  - M51 Whirlpool: Grand-design spiral with tidal interaction bridge
  - Kerr Metric Black Hole: Horizon radius Rs = 2GM/c², spin a* = 0.942, frame-dragging accretion disk.`
  },
  {
    id: "d3-consensus",
    title: "D3 Multi-AI Consensus Quorum Engine Specification",
    category: "AI Governance",
    date: "2026-10-06",
    osModule: "/interfaces/d3-multi-ai-consensus.html",
    terminalCommand: "consensus",
    status: "CATALOGUE ONLY — NOT RUNTIME VERIFIED",
    description: "Byzantine fault-tolerant multi-agent consensus quorum engine spanning Gemini, Genie Djinn, Claude, GPT, Ollama, DeepSeek, and TDOC Sentinel with topological force-directed graph visualization.",
    integrationSummary: "Related interface path is listed for navigation; this catalogue entry does not verify deployment, authentication, or operational status.",
    content: `[D3 MULTI-AI CONSENSUS SPECIFICATION]
Consensus Topology:
  - 7 Active Sovereign Nodes
  - Supermajority Quorum Threshold: 67% (2/3 + 1)
  - Byzantine Fault Tolerance: 33.3% tolerance threshold
  - Real-time cryptographic vote sealing into local continuity ledger.`
  },
  {
    id: "polyneuromorphic-voice",
    title: "Polyneuromorphic Live Voice & Synaptic Waveform Engine",
    category: "Neuromorphic Audio",
    date: "2026-10-06",
    osModule: "/interfaces/polyneuromorphic-live-voice.html",
    terminalCommand: "voice",
    status: "CATALOGUE ONLY — NOT RUNTIME VERIFIED",
    description: "Neuromorphic Web Audio synthesis engine with 48 synaptic channels, leaky integrate-and-fire neural spike trains, and 963 Hz solfeggio frequency harmonic driver.",
    integrationSummary: "Related interface path is listed for navigation; this catalogue entry does not verify deployment, authentication, or operational status.",
    content: `[POLYNEUROMORPHIC VOICE SPECIFICATION]
Synaptic Parameters:
  - 48 Continuous Hodgkin-Huxley / Leaky Integrate-and-Fire neurons
  - 963 Hz solfeggio pure sine carrier wave
  - Web Audio API real-time buffer scheduling
  - Interactive tactile keyboard for manual pulse modulation.`
  }
];

let activeDocIndex = 0;

function renderDocList(filter = '') {
  const listEl=document.getElementById('docList');listEl.replaceChildren();
  const query=String(filter||'').trim().toLowerCase();
  const matches=DOCUMENTS.map((doc,idx)=>({doc,idx})).filter(({doc})=>!query||String(doc.title).toLowerCase().includes(query)||String(doc.description).toLowerCase().includes(query)||String(doc.category).toLowerCase().includes(query));
  if(!matches.length){const empty=document.createElement('li');empty.className='doc-item';empty.textContent='No catalogue entries match this search.';listEl.appendChild(empty);return}
  for(const {doc,idx} of matches){
    const li=document.createElement('li');li.className='doc-item'+(idx===activeDocIndex?' active':'');li.tabIndex=0;li.setAttribute('role','button');li.setAttribute('aria-label','Inspect catalogue entry: '+doc.title);
    const title=document.createElement('div');title.className='doc-title';title.textContent=doc.title;
    const meta=document.createElement('div');meta.className='doc-meta';
    const category=document.createElement('span');category.textContent=doc.category;
    const status=document.createElement('span');status.className='doc-status';status.textContent=doc.status;
    meta.append(category,status);li.append(title,meta);
    li.addEventListener('click',()=>selectDoc(idx));li.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectDoc(idx)}});
    listEl.appendChild(li);
  }
}
function makeRow(label,value){const row=document.createElement('div');row.className='mapping-row';const key=document.createElement('span');key.textContent=label;const val=document.createElement('span');val.textContent=String(value??'—');row.append(key,val);return row}
function appUrl(path){const base=new URL('../',location.href);const target=new URL(String(path||'').replace(/^\\/+/,''),base);if(target.origin!==location.origin)throw new Error('Cross-origin destination rejected');return target.href}
function sourceUrl(doc){const path=String(doc.osModule||'').replace(/^\\/+/, '');if(!/^[a-zA-Z0-9_./-]+$/.test(path)||path.split('/').includes('..'))return null;return 'https://github.com/machackabook/Cryptic/blob/main/'+path}
function selectDoc(idx) {
  activeDocIndex=idx;const doc=DOCUMENTS[idx];if(!doc)return;
  renderDocList(document.getElementById('searchInput').value);
  const heading=document.getElementById('activeDocTitle');heading.replaceChildren();
  const badge=document.createElement('span');badge.textContent='[CATALOGUE-'+String(idx+1).padStart(2,'0')+'] ';
  heading.append(badge,document.createTextNode(doc.title));
  const content=document.getElementById('viewerContent');content.replaceChildren();
  const card=document.createElement('div');card.className='os-mapping-card';
  const cardTitle=document.createElement('div');cardTitle.style.cssText='font-weight:700;color:var(--accent);margin-bottom:.5rem';cardTitle.textContent='CATALOGUE DETAILS · NOT A PRODUCTION ATTESTATION';card.appendChild(cardTitle);
  card.append(makeRow('Catalogue status:',doc.status),makeRow('Related interface:',doc.osModule),makeRow('Suggested terminal command:',doc.terminalCommand),makeRow('Relationship note:',doc.integrationSummary));
  const source=sourceUrl(doc);if(source){const link=document.createElement('a');link.href=source;link.target='_blank';link.rel='noopener noreferrer';link.textContent='View corresponding source file on GitHub';link.style.cssText='display:inline-block;color:var(--accent);margin-top:.6rem';card.appendChild(link)}
  const section=document.createElement('div');section.className='doc-section';
  const h=document.createElement('h2');h.textContent='DOCUMENT SPECIFICATION & EXCERPT';
  const desc=document.createElement('p');desc.style.color='var(--muted)';desc.textContent=doc.description;
  const pre=document.createElement('pre');pre.style.cssText='background:rgba(0,0,0,.4);padding:1rem;border-radius:4px;border:1px solid rgba(255,255,255,.05);overflow-x:auto';pre.textContent=doc.content;
  section.append(h,desc,pre);content.append(card,section);
}
function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function filterDocs(val){renderDocList(val)}
function launchLiveOSModule(){
  const doc=DOCUMENTS[activeDocIndex];if(!doc?.osModule)return;
  try{window.location.assign(appUrl(doc.osModule))}catch(e){setCorpusStatus('Navigation blocked: '+String(e.message||e))}
}
async function copyDocumentText(){
  const doc=DOCUMENTS[activeDocIndex];if(!doc)return;
  try{await navigator.clipboard.writeText(String(doc.content||''));setCorpusStatus('Catalogue excerpt copied to clipboard.')}
  catch{setCorpusStatus('Clipboard permission unavailable. Select and copy the excerpt manually.')}
}
function setCorpusStatus(text){const node=document.getElementById('corpusActionStatus');if(node)node.textContent=text}
function exportCorpusReceipt(){
 const doc=DOCUMENTS[activeDocIndex];if(!doc)return;
 const record={kind:'local-catalogue-export',id:doc.id,title:doc.title,created_at:new Date().toISOString(),status:'LOCAL EXPORT ONLY',note:'Not a cryptographic signature, remote acknowledgement, or production attestation.'};
 const blob=new Blob([JSON.stringify(record,null,2)+'\\n'],{type:'application/json'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='cryptic-catalogue-record-'+String(doc.id).replace(/[^a-z0-9_-]/gi,'_')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
document.getElementById('searchInput')?.addEventListener('input',event=>filterDocs(event.currentTarget.value));
document.getElementById('launchLiveOSModuleBtn')?.addEventListener('click',launchLiveOSModule);
document.getElementById('copyDocumentTextBtn')?.addEventListener('click',copyDocumentText);
document.getElementById('exportCorpusReceiptBtn')?.addEventListener('click',exportCorpusReceipt);
renderDocList();selectDoc(0);
