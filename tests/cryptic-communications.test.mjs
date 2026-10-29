import test from 'node:test';
import assert from 'node:assert/strict';
import {publicPolicy,validatePolicy,decide,policyDigest,GATES} from '../security/cryptic-communications/defense.mjs';
const base=publicPolicy();
const request={principal:'enrolled-node',capability:'dns-query',resource:'resolver-1',direction:'egress',transport:'ethernet'};
const rule={id:'example-1',...request,expiresAt:'2099-01-01T00:00:00.000Z'};
const proof={charterCompliant:true,operatorAuthorized:true,identityEnrolled:true,trustedBrokerValidated:true,adam:{gates:Object.fromEntries(GATES.map(g=>[g,'verified']))}};
const now='2026-10-22T00:00:00.000Z';
test('public policy validates and starts with zero rules and noninstalled enforcement',()=>{
 assert.deepEqual(validatePolicy(base),[]);
 assert.deepEqual(base.allowRules,[]);
 assert.equal(base.enforcement,'not-installed');
 assert.equal(base.nexus.maxLogicalIdentities,6000);
 assert.match(policyDigest(base),/^[a-f0-9]{64}$/);
});
test('EVE denies by default even with all claims asserted',()=>{
 assert.equal(decide(base,request,proof,now).decision,'deny');
});
test('matching explicit permission without proof denies; with claimed proof is only a preview',()=>{
 const p={...base,allowRules:[rule]};
 assert.deepEqual(validatePolicy(p),[]);
 assert.equal(decide(p,request,{},now).decision,'deny');
 const res=decide(p,request,proof,now);
 assert.equal(res.decision,'allow-preview');
 assert.equal(res.productionVerified,false);
});
test('EVE explicit deny overrides matching allow',()=>{
 const p={...base,allowRules:[rule],denyRules:[{...rule,id:'deny-1'}]};
 assert.equal(decide(p,request,proof,now).reason,'eve-explicit-deny');
});
test('an expired rule and invented permission never grant access',()=>{
 const p={...base,allowRules:[{...rule,expiresAt:'2025-01-01T00:00:00.000Z'}]};
 assert.equal(decide(p,request,proof,now).decision,'deny');
 assert.equal(decide({...base,allowRules:[rule]},{...request,resource:'other'},proof,now).decision,'deny');
});
test('radio access remains denied without exact scoped exception and all gates',()=>{
 const radio={principal:'enrolled-node',capability:'device-pairing',resource:'bluetooth-peer',direction:'radio',transport:'bluetooth'};
 const allow={id:'pair-1',...radio,expiresAt:'2099-01-01T00:00:00.000Z'};
 assert.equal(decide(base,radio,proof,now).decision,'deny');
 assert.equal(decide({...base,allowRules:[allow]},radio,{...proof,adam:{gates:{...proof.adam.gates,REVERIFY:'unverified'}}},now).decision,'deny');
 assert.equal(decide({...base,allowRules:[allow]},radio,proof,now).decision,'allow-preview');
});
test('reject wildcards, malformed scopes, extra fields, altered invariants and rule IDs',()=>{
 for(const bad of [
   {...base,defaultDecision:'allow'},
   {...base,allowRules:{broken:true}},
   {...base,nexus:{maxLogicalIdentities:6001,capacityIsNotEnrollment:true}},
   {...base,allowRules:[{...rule,principal:'*'}]},
   {...base,allowRules:[{...rule,transport:'bluetooth'}]},
   {...base,allowRules:[{...rule,unexpected:true}]},
   {...base,allowRules:[rule],denyRules:[rule]},
   {...base,governance:{...base.governance,godCharterRequired:false}}
 ]) assert.notDeepEqual(validatePolicy(bad),[]);
});
test('malformed and overbroad request inputs fail shut',()=>{
 assert.equal(decide(base,{...request,principal:'*'},proof,now).decision,'deny');
 assert.equal(decide(base,{...request,arbitrary:'x'},proof,now).decision,'deny');
 assert.equal(decide(base,request,proof,'invalid').decision,'deny');
});
