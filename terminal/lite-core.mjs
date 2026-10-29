/** Pure public commands. Never executes shell, fetches secrets, or alters access permissions. */
export const TIERS=Object.freeze({
 public:{label:'Public Lite',status:'PUBLIC · LOCAL INTERFACE',description:'Read-only documentation, navigation and locally evaluated informational commands.',abilities:['Read public source and verified announcements','Use this browser-local command console','Open the static React viewer if its build passes release gates']},
 member:{label:'Member',status:'LOCKED · AUTH BACKEND NOT CONFIGURED',description:'Member capabilities require an authenticated backend session, not a frontend tier selection.',abilities:['Scoped saved workspaces (pending)','User-visible opted-in transcript export (pending)','Authenticated AI adapter calls (pending)']},
 developer:{label:'Developer',status:'LOCKED · PROVENANCE REQUIRED',description:'Developer actions require verified GitHub identity, repository permissions, and a server-issued capability.',abilities:['Acode / Termux / Xed project bridge (pending)','Approved build and repository requests (pending)','Signed ADAM evidence receipts (pending)']},
 architect:{label:'Architect',status:'LOCKED · MFA + ADAM GATES REQUIRED',description:'Enclave actions and releases require hardware-backed MFA, server authorization, and two independently verified proof gates.',abilities:['SYNAPSE encrypted enclave access (not exposed)','ADAM proof gate promotion (pending)','Release and device operation approvals (pending)']}
});
export function runLocalCommand(command){
 const raw=String(command??'').trim().toLowerCase().replace(/\s+/g,' ');
 const name=raw.split(' ')[0];
 switch(name){
  case 'help':return {kind:'help',text:'Commands: help, status, tiers, about, source, clear. No shell, API keys, device operations or remote model access.'};
  case 'status':return {kind:'status',text:'PUBLIC_LITE=LOCAL_READY; REACT_BUILD=UNVERIFIED; PRIVATE_API=NOT_CONNECTED; AUTHORIZATION=BACKEND_REQUIRED; AGENT_PROCESSES=NOT_ATTESTED'};
  case 'tiers':return {kind:'tiers',text:'T0 Public Lite: local read-only. T1 Member: backend auth. T2 Developer: scoped repo permissions. T3 Architect: MFA + two-person ADAM review. Selection never grants access.'};
  case 'about':return {kind:'about',text:'Cryptic HyperTerminal v13 public portal. Client-side local informational interpreter only, built on GitHub Pages-compatible static assets.'};
  case 'source':return {kind:'source',text:'Source: https://github.com/machackabook/Cryptic and https://github.com/machackabook/Cryptics-Hyper-Terminal-OS'};
  case 'clear':return {kind:'clear',text:''};
  default:return {kind:'unknown',text:'Unknown public command. Type help. OS shell execution is not available in the public tier.'};
 }
}
