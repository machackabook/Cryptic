#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {isIP} from 'node:net';
import {fileURLToPath} from 'node:url';

const RESOLVERS=Object.freeze({cloudflare:'https://cloudflare-dns.com/dns-query',google:'https://dns.google/resolve'});
const issue=(id,subject)=>({id,subject});
export function validDomain(s){return typeof s==='string'&&s.length<=253&&/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(s)&&!s.endsWith('.invalid')&&!s.endsWith('.local')&&!s.endsWith('.internal')&&!s.endsWith('.ts.net')}
export function validateNetworkPolicy(p,{live=false}={}){
 const bad=[];
 if(p?.schema!=='cryptic.network.policy.v1')bad.push(issue('invalid_schema','policy'));
 const d=p?.dns;
 if(!validDomain(d?.zone))bad.push(issue('invalid_zone','dns'));
 if(!Array.isArray(d?.hosts)||!d.hosts.length||d.hosts.length>16||d.hosts.some(h=>!validDomain(h)||!(h===d.zone||h.endsWith('.'+d.zone))))bad.push(issue('invalid_hosts','dns'));
 if(!Array.isArray(d?.resolvers)||d.resolvers.length!==2||new Set(d.resolvers).size!==2||d.resolvers.some(r=>!Object.hasOwn(RESOLVERS,r)))bad.push(issue('independent_resolvers_required','dns'));
 if(d?.requireDnssec!==true)bad.push(issue('dnssec_required','dns'));
 if(!Number.isInteger(d?.minimumTtl)||!Number.isInteger(d?.maximumTtl)||d.minimumTtl<60||d.maximumTtl>86400||d.maximumTtl<d.minimumTtl)bad.push(issue('invalid_ttl_bounds','dns'));
 if(!Array.isArray(d?.expectedCaaIssuers)||d.expectedCaaIssuers.some(s=>!validDomain(s)))bad.push(issue('invalid_caa_issuer','dns'));
 if(p?.tailnet?.publicFunnelAllowed!==false||p?.tailnet?.privateConfigurationRequired!==true)bad.push(issue('private_tailnet_required','tailnet'));
 if(live&&(!p.configured||!d?.expectedCaaIssuers?.length))bad.push(issue('operator_configuration_required','policy'));
 return bad;
}
function v4Number(ip){return ip.split('.').reduce((n,b)=>n*256+Number(b),0)}
export function publicAddress(ip){
 if(isIP(ip)===4){
  const n=v4Number(ip);
  const denied=[['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.88.99.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]];
  return !denied.some(([base,bits])=>Math.floor(n/2**(32-bits))===Math.floor(v4Number(base)/2**(32-bits)));
 }
 if(isIP(ip)!==6||ip.includes('.')||ip.includes('%'))return false;
 const pieces=ip.toLowerCase().split('::');let groups=pieces[0]?pieces[0].split(':'):[];
 if(pieces.length===2){const tail=pieces[1]?pieces[1].split(':'):[];groups=groups.concat(Array(8-groups.length-tail.length).fill('0'),tail)}
 const n=groups.reduce((a,g)=>(a<<16n)+BigInt(parseInt(g,16)),0n);
 const prefix=(base,bits)=>(n>>BigInt(128-bits))===(base>>BigInt(128-bits));
 return prefix(0x20000000000000000000000000000000n,3)&&!prefix(0x20010db8000000000000000000000000n,32)&&!prefix(0x20010000000000000000000000000000n,32)&&!prefix(0x20020000000000000000000000000000n,16)&&!prefix(0x3fff0000000000000000000000000000n,20)&&!prefix(0x20010010000000000000000000000000n,28)&&!prefix(0x20010020000000000000000000000000n,28)&&!prefix(0x20010002000000000000000000000000n,48);
}
export function evaluateDns(host,type,answer,policy){
 const bad=[];
 if(!answer||answer.Status!==0||answer.TC===true){return [issue('dns_answer_unusable',host+':'+type)]}
 if(policy.requireDnssec&&answer.AD!==true)bad.push(issue('dnssec_not_asserted',host+':'+type));
 const records=Array.isArray(answer.Answer)?answer.Answer:[];
 const expected={A:1,AAAA:28,CAA:257}[type];
 for(const r of records){
  if(!Number.isInteger(r.TTL)||r.TTL<policy.minimumTtl||r.TTL>policy.maximumTtl)bad.push(issue('ttl_outside_policy',host+':'+type));
  if((r.type===1||r.type===28)&&!publicAddress(r.data))bad.push(issue('nonpublic_dns_address',host+':'+type));
 }
 const relevant=records.filter(r=>r.type===expected);
 if(type==='CAA'){
  const parsed=relevant.map(r=>/^([0-9]+)\s+(issue|issuewild|iodef)\s+"([^"\r\n]*)"$/.exec(r.data||''));
  if(parsed.some(x=>!x))bad.push(issue('invalid_caa_record',host));
  const issuers=parsed.filter(x=>x&&x[2]==='issue').map(x=>x[3].split(';')[0].trim());
  if(!issuers.length||issuers.some(s=>!policy.expectedCaaIssuers.includes(s)))bad.push(issue('caa_issuer_not_approved',host));
  const wild=parsed.filter(x=>x&&x[2]==='issuewild');
  if(!wild.length||wild.some(x=>x[3].split(';')[0].trim()!==''))bad.push(issue('wildcard_issuance_not_denied',host));
 }
 return bad;
}
async function boundedJson(response,limit=131072){
 if(!response.ok)throw Error('doh_http_failure');
 if(!response.body)throw Error('doh_empty_response');
 const parts=[];let size=0;
 for await(const part of response.body){size+=part.byteLength;if(size>limit)throw Error('doh_response_too_large');parts.push(Buffer.from(part))}
 return JSON.parse(Buffer.concat(parts).toString('utf8'));
}
export async function auditDns(policy,{fetchImpl=fetch}={}){
 const validation=validateNetworkPolicy({schema:'cryptic.network.policy.v1',configured:true,dns:policy,tailnet:{publicFunnelAllowed:false,privateConfigurationRequired:true}},{live:true});
 if(validation.length)return {findings:validation,observations:[],qualification:'Invalid policy; no network request made.'};
 const findings=[],observations=[];
 for(const resolver of policy.resolvers){
  for(const host of [policy.zone,...new Set(policy.hosts)]){
   const types=host===policy.zone?['CAA']:['A','AAAA'];
   let addressCount=0;
   for(const type of types){
    try{
     const u=new URL(RESOLVERS[resolver]);u.searchParams.set('name',host);u.searchParams.set('type',type);u.searchParams.set('do','true');u.searchParams.set('cd','false');
     const answer=await boundedJson(await fetchImpl(u.href,{headers:{accept:'application/dns-json'},redirect:'error',signal:AbortSignal.timeout(10000)}));
     findings.push(...evaluateDns(host,type,answer,policy));
     const records=(answer.Answer||[]).filter(r=>r.type===({A:1,AAAA:28,CAA:257}[type]));
     addressCount+=records.length;
     observations.push({resolver,host,type,status:answer.Status,dnssecAsserted:answer.AD===true,recordCount:records.length,recordsHash:await hashRecords(records)});
    }catch{findings.push(issue('dns_evidence_unavailable',resolver+':'+host+':'+type))}
   }
   if(host!==policy.zone&&addressCount===0)findings.push(issue('no_public_address',resolver+':'+host));
  }
 }
 // Equal answer sets are diagnostic only: geographic/load-balanced records may differ legitimately.
 return {findings,observations,qualification:'Pinned HTTPS resolver assertions; no local DNSSEC cryptographic validation, domain ownership, or service authentication proof.'};
}
async function hashRecords(records){const {createHash}=await import('node:crypto');return createHash('sha256').update(JSON.stringify(records.map(r=>({type:r.type,data:r.data})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))))).digest('hex')}
export function validateTailnetPolicy(p){
 const bad=[];const allowed=new Set(['groups','tagOwners','grants','ssh','tests']);
 if(!p||Object.keys(p).some(k=>!allowed.has(k)))bad.push(issue('unsupported_tailnet_policy_field','tailnet'));
 const operators=p?.groups?.['group:cryptic-operators'];
 if(!Array.isArray(operators)||!operators.length||operators.some(s=>typeof s!=='string'||!s.includes('@')||s.includes('*')))bad.push(issue('explicit_operators_required','tailnet'));
 for(const tag of ['tag:cryptic-bridge','tag:cryptic-dns'])if(JSON.stringify(p?.tagOwners?.[tag])!==JSON.stringify(['group:cryptic-operators']))bad.push(issue('restricted_tag_owners_required',tag));
 if(!Array.isArray(p?.ssh)||p.ssh.length)bad.push(issue('tailscale_ssh_must_be_disabled','tailnet'));
 const permitted=[{src:['group:cryptic-operators'],dst:['tag:cryptic-bridge'],ip:['tcp:443']},{src:['tag:cryptic-bridge'],dst:['tag:cryptic-dns'],ip:['tcp:53','udp:53']}];
 const normalize=g=>JSON.stringify({src:g.src,dst:g.dst,ip:g.ip});
 if(!Array.isArray(p?.grants)||p.grants.length!==2||p.grants.some(g=>!g||Object.keys(g).some(k=>!['src','dst','ip'].includes(k)))||!permitted.every(a=>p.grants.some(g=>normalize(a)===normalize(g))))bad.push(issue('least_privilege_grants_required','tailnet'));
 const tests=p?.tests;
 if(!Array.isArray(tests)||!tests.some(t=>operators?.includes(t?.src)&&t.accept?.includes('tag:cryptic-bridge:443')&&t.deny?.includes('tag:cryptic-bridge:22')&&t.deny?.includes('tag:cryptic-bridge:7331'))||!tests.some(t=>typeof t?.src==='string'&&!operators?.includes(t.src)&&!t.src.startsWith('tag:')&&t.deny?.includes('tag:cryptic-bridge:443')&&t.deny?.includes('tag:cryptic-dns:53')))bad.push(issue('deny_tests_required','tailnet'));
 return bad;
}
export function validateDocumentManifest(p){
 if(p?.schemaVersion!==1||!Array.isArray(p.sources)||p.sources.length!==5)return [issue('invalid_document_manifest','documents')];
 return p.sources.some(s=>typeof s.id!=='string'||typeof s.title!=='string'||! /^[a-f0-9]{64}$/.test(s.sha256)||!Array.isArray(s.evidence)||!s.evidence.length)?[issue('invalid_document_evidence','documents')]:[];
}
async function main(){
 const live=process.argv.includes('--dns-live');
 const policyPath=process.env.CRYPTIC_NETWORK_POLICY_PATH||'config/network-security.public.json';
 const policy=JSON.parse(fs.readFileSync(policyPath,'utf8'));
 const tailnet=JSON.parse(fs.readFileSync('security/tailscale-policy.example.json','utf8'));
 const documents=JSON.parse(fs.readFileSync('config/document-provenance.public.json','utf8'));
 const findings=[...validateNetworkPolicy(policy,{live}),...validateTailnetPolicy(tailnet),...validateDocumentManifest(documents)];
 let dns={observations:[],qualification:'Not executed; explicit --dns-live and operator configuration required.'};
 if(live&&!findings.length){dns=await auditDns(policy.dns);findings.push(...dns.findings)}
 const report={schema:'cryptic.network.evidence.v1',at:new Date().toISOString(),mode:live?'public-dns-observation':'offline-policy-check',findings,dnsObservations:dns.observations,dnsQualification:dns.qualification,tailnetEnforcement:'unverified: example policy only',documentVerification:'manifest schema only; attachment checksums were independently computed during document review',productionVerified:false};
 fs.mkdirSync('reports/security',{recursive:true});
 fs.writeFileSync('reports/security/network-security.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({mode:report.mode,findings:findings.length,productionVerified:false}));
 if(findings.length)process.exitCode=1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('NETWORK AUDIT FAILED: invalid or unavailable input; no sensitive details emitted.');process.exitCode=1});
