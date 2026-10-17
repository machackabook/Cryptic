import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MAGIC_ROUTES,resolveMagicRoute,routeFromFragment,safeMagicSurfaceUrl} from '../routes.mjs';
const root=new URL('../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root),'utf8');
test('all 20 routes resolve only to committed local fragments',()=>{
 const names=Object.keys(MAGIC_ROUTES);assert.equal(names.length,20);
 for(const n of names){const route=resolveMagicRoute(n);assert.ok(route);assert.ok(fs.statSync(new URL(route.file,root)).isFile(),n);}
 assert.equal(resolveMagicRoute('comms').id,'bus');
 assert.equal(resolveMagicRoute('docs').id,'rules');
 assert.equal(resolveMagicRoute('../secrets'),null);
 assert.equal(resolveMagicRoute('file:///etc/passwd'),null);
 assert.equal(routeFromFragment('./surfaces/telemetry.html').id,'telemetry');
 assert.equal(routeFromFragment('https://evil.example/x'),null);
});
test('Magic Browser tab buttons link to allowlisted routes',()=>{
 const html=read('index.html');
 const buttons=[...html.matchAll(/<button\b[^>]*\bdata-route="([^"]+)"/g)].map(x=>x[1]);
 assert.ok(buttons.length>=17);
 for(const route of buttons)assert.ok(resolveMagicRoute(route),'missing route '+route);
 assert.ok(buttons.includes('rules'),'No rules/documentation tab');
});
test('home surface shortcuts resolve to actual local fragments',()=>{
 const home=read('surfaces/home.html');
 const links=[...home.matchAll(/\bhx-get="([^"]+)"/g)].map(x=>x[1]);
 assert.ok(links.length>=8);
 for(const link of links){const route=routeFromFragment(link);assert.ok(route,link);assert.ok(fs.existsSync(new URL(route.file,root)),route.id);}
});
test('no backend access or executable instructions in public document route',()=>{
 const html=read('surfaces/rules.html');
 assert.match(html,/SECURITY-OPERATIONS\.md/);
 assert.match(html,/PUBLIC-PRIVATE-PAIRING\.md/);
 assert.match(html,/AI-ACCESS-POLICY\.md/);
 assert.doesNotMatch(html,/<script|\beval\(|ghp_[A-Za-z0-9]|sk-proj-/);
});
test('magic frame allowlist rejects invalid origin, traversal and arbitrary remote URLs',()=>{
 const base='https://machackabook.github.io/Cryptic/magic/index.html';
 assert.ok(safeMagicSurfaceUrl('../interfaces/welcome-sentience.html',base,'https://machackabook.github.io'));
 assert.ok(safeMagicSurfaceUrl('../panel.html?module=nodes',base,'https://machackabook.github.io'));
 for(const input of ['../../.env','javascript:alert(1)','../docs/secret.md','https://evil.example/x','../interfaces/../../config/nodes.public.json']){
  assert.equal(safeMagicSurfaceUrl(input,base,'https://machackabook.github.io'),null,input);
 }
});
test('router is same-origin and does not evaluate arbitrary commands',()=>{
 const src=read('router.mjs'),html=read('index.html');
 assert.match(src,/route_origin_denied/);
 assert.match(src,/if\(!response\.ok\)/);
 assert.doesNotMatch(src,/\beval\(|new Function\(|child_process|window\.open\(/);
 assert.match(html,/router\.mjs/);
 assert.doesNotMatch(html,/htmx\.min\.js/);
});
