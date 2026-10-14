import test from 'node:test';
import assert from 'node:assert/strict';
import {buildVpnPlan} from '../scripts/vpn-plan.mjs';
test('VPN plan requires an explicit provider, private destination and operator identities',()=>{
 const input={provider:'cloudflare',cidr:'10.24.0.0/24',operators:['operator@example.invalid']};
 const plan=buildVpnPlan(input);assert.equal(plan.applied,false);assert.equal(plan.connectivity,'unverified');assert.equal(plan.steps.length,5);
 for(const cidr of ['0.0.0.0/0','127.0.0.1/32','169.254.169.254/32','8.8.8.8/32','10.24.0.1/24'])assert.throws(()=>buildVpnPlan({...input,cidr}));
 assert.throws(()=>buildVpnPlan({...input,operators:[]}));assert.throws(()=>buildVpnPlan({...input,hostname:'https://bad.example/path'}));assert.throws(()=>buildVpnPlan({...input,apply:true}));
 const tail=buildVpnPlan({...input,provider:'tailscale'});assert.ok(tail.steps.some(s=>s.includes('Funnel')));
});
