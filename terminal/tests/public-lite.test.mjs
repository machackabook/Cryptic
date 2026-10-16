import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TIERS,runLocalCommand} from '../lite-core.mjs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=readFileSync(new URL('../lite.mjs',import.meta.url),'utf8');
const policy=JSON.parse(readFileSync(new URL('../tier-policy.json',import.meta.url),'utf8'));
test('all 4 tiers declared and backend locked',()=>{
 assert.deepEqual(Object.keys(TIERS),['public','member','developer','architect']);
 assert.equal(policy.modes.architect.server_authorization_required,true);
 assert.equal(policy.modes.developer.server_authorization_required,true);
 assert.equal(policy.modes.public.server_authorization_required,false);
 assert.equal(policy.security.static_tier_selection_is_not_auth,true);
});
test('all local terminal commands are non-executing',()=>{
 for(const cmd of ['help','status','tiers','about','source','clear'])assert.notEqual(runLocalCommand(cmd).kind,'unknown');
 assert.equal(runLocalCommand('rm -rf /').kind,'unknown');
 assert.equal(runLocalCommand('gh auth login').kind,'unknown');
 assert.equal(runLocalCommand('curl https://example.com').kind,'unknown');
});
test('every tier selector and every action has a handler or real link',()=>{
 const btns=[...html.matchAll(/<button\b[^>]*>/g)].map(x=>x[0]);
 for(const button of btns){const id=button.match(/\bid="([^"]+)"/)?.[1];const tier=button.match(/data-tier="([^"]+)"/)?.[1];
  if(tier){assert.ok(script.includes("querySelectorAll('[data-tier]')"));assert.ok(TIERS[tier]);}
  else if(id){assert.ok(script.includes("'#"+id+"'"),id);}
  else assert.match(button,/type="submit"/);
 }
 for(const href of html.matchAll(/href="([^"]+)"/g))assert.ok(!href[1].startsWith('javascript:'));
 assert.ok(btns.length>=7);
});
test('no secret-bearing public runtime and no remote script',()=>{
 assert.match(html,/script-src 'self'/);
 assert.match(html,/connect-src 'self'/);
 assert.doesNotMatch(script+/ +readFileSync(new URL('../lite-core.mjs',import.meta.url),'utf8'),/\beval\(|new Function\(|child_process|process\.env|Bearer [A-Za-z0-9]/);
});
