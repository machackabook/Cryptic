import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {auditDns,evaluateDns,publicAddress,validateNetworkPolicy,validateTailnetPolicy,validateDocumentManifest} from '../scripts/network-security.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const base=read('config/network-security.public.json');
const dns={...base.dns,expectedCaaIssuers:['letsencrypt.org']};
test('DNS checks reject disabled validation, private names, injected resolvers and incomplete live configuration',()=>{
 assert.deepEqual(validateNetworkPolicy(base),[]);
 assert.ok(validateNetworkPolicy(base,{live:true}).some(x=>x.id==='operator_configuration_required'));
 assert.ok(validateNetworkPolicy({...base,dns:{...dns,requireDnssec:false}}).length);
 assert.ok(validateNetworkPolicy({...base,dns:{...dns,hosts:['bridge.example.ts.net']}}).length);
 assert.ok(validateNetworkPolicy({...base,dns:{...dns,resolvers:['cloudflare','https://hostile.example']}}).length);
});
test('public DNS addresses reject loopback, link-local, CGNAT, mapped IPv4 and reserved IPv6',()=>{
 for(const s of ['127.0.0.1','10.1.2.3','100.64.0.1','169.254.169.254','192.0.2.1','198.18.0.1','224.0.0.1','::1','fc00::1','fe80::1','::ffff:127.0.0.1','2001:db8::1','3fff::1','2002:7f00:1::'])assert.equal(publicAddress(s),false,s);
 for(const s of ['1.1.1.1','8.8.8.8','2606:4700:4700::1111','2001:4860:4860::8888'])assert.equal(publicAddress(s),true,s);
});
test('DNS evidence rejects unsigned, stale TTL and unapproved CAA or wildcard issuance',()=>{
 const answer={Status:0,AD:true,Answer:[{type:1,TTL:300,data:'1.1.1.1'}]};
 assert.deepEqual(evaluateDns('api.crypticnews.org','A',answer,dns),[]);
 assert.ok(evaluateDns('api.crypticnews.org','A',{...answer,AD:false},dns).some(x=>x.id==='dnssec_not_asserted'));
 assert.ok(evaluateDns('api.crypticnews.org','A',{...answer,Answer:[{type:1,TTL:1,data:'127.0.0.1'}]},dns).length>=2);
 const caa={Status:0,AD:true,Answer:[{type:257,TTL:300,data:'0 issue "letsencrypt.org"'},{type:257,TTL:300,data:'0 issuewild ";"'}]};
 assert.deepEqual(evaluateDns('crypticnews.org','CAA',caa,dns),[]);
 assert.ok(evaluateDns('crypticnews.org','CAA',{...caa,Answer:caa.Answer.slice(0,1)},dns).some(x=>x.id==='wildcard_issuance_not_denied'));
 assert.ok(evaluateDns('crypticnews.org','CAA',{...caa,Answer:[{type:257,TTL:300,data:'0 issue "hostile.example"'}]},dns).some(x=>x.id==='caa_issuer_not_approved'));
});
test('DoH uses fixed HTTPS resolvers, refuses redirects and emits only bounded metadata',async()=>{
 const requests=[];
 const fake=async(url,opts)=>{
  const u=new URL(url);requests.push([u,opts]);
  const type=u.searchParams.get('type');
  const Answer=type==='CAA'?[{type:257,TTL:300,data:'0 issue "letsencrypt.org"'},{type:257,TTL:300,data:'0 issuewild ";"'}]:type==='A'?[{type:1,TTL:300,data:'1.1.1.1'}]:[];
  return new Response(JSON.stringify({Status:0,AD:true,Answer}));
 };
 const r=await auditDns(dns,{fetchImpl:fake});assert.equal(r.findings.length,0);assert.equal(requests.length,10);
 for(const [u,opts] of requests){assert.ok(['cloudflare-dns.com','dns.google'].includes(u.hostname));assert.equal(opts.redirect,'error');assert.equal(opts.headers.authorization,undefined);assert.equal(u.searchParams.get('cd'),'false')}
 assert.ok(!JSON.stringify(r).includes('1.1.1.1'));
 const invalid=await auditDns({...dns,resolvers:['https://hostile.example']},{fetchImpl:()=>{throw Error('must not run')}});assert.ok(invalid.findings.length);assert.equal(invalid.observations.length,0);
 const missing=await auditDns(dns,{fetchImpl:async()=>{throw Error('private sensitive diagnostic')}});assert.ok(missing.findings.length);assert.ok(!JSON.stringify(missing).includes('sensitive'));
});
test('Tailscale template enforces explicit operators, narrow ports, no SSH or broad grants, and deny tests',()=>{
 const p=read('security/tailscale-policy.example.json');assert.deepEqual(validateTailnetPolicy(p),[]);
 assert.ok(validateTailnetPolicy({...p,grants:[...p.grants,{src:['*'],dst:['*'],ip:['*']}]}).length);
 assert.ok(validateTailnetPolicy({...p,grants:[p.grants[0],p.grants[0]]}).length);
 assert.ok(validateTailnetPolicy({...p,nodeAttrs:[{target:['*'],attr:['funnel']}]}).length);
 assert.ok(validateTailnetPolicy({...p,ssh:[{action:'accept'}]}).length);
 assert.ok(validateTailnetPolicy({...p,tests:[]}).length);
 assert.ok(validateTailnetPolicy({...p,tagOwners:{...p.tagOwners,'tag:cryptic-bridge':['autogroup:member']}}).length);
});
test('all five document fingerprints are present with bounded evidence references',()=>{
 const p=read('config/document-provenance.public.json');assert.deepEqual(validateDocumentManifest(p),[]);
 assert.equal(new Set(p.sources.map(s=>s.sha256)).size,5);
 for(const s of p.sources){assert.equal(s.verification.independentValidation,'not-performed');assert.ok(s.evidence.every(e=>e.location&&e.limits))}
 assert.ok(!JSON.stringify(p).includes('/tmp/'));assert.ok(!JSON.stringify(p).includes('@'));
});
