import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {MAGIC_SURFACES,approvedSurface,safeReference,protectedFrame} from '../magic/security-guard.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const root='https://machackabook.github.io/Cryptic/',origin='https://machackabook.github.io';
test('All Magic Browser routes exist and are allowlisted',()=>{
 const page=read('magic/index.html');
 const paths=[...page.matchAll(/hx-get="\.\/surfaces\/([a-z-]+)\.html"/g)].map(x=>x[1]);
 assert.equal(new Set(paths).size,MAGIC_SURFACES.length);
 for(const route of paths){assert.ok(MAGIC_SURFACES.includes(route));assert.ok(existsSync(new URL('../magic/surfaces/'+route+'.html',import.meta.url)));assert.equal(approvedSurface('./surfaces/'+route+'.html'),'./surfaces/'+route+'.html')}
 for(const id of ['btnDash','btnFocus','rootToggle','sysClockWidget','clockCopyBtn'])assert.ok(page.includes('id="'+id+'"'),id);
 const script=read('magic/magic.js');for(const id of ['btnDash','btnFocus','rootToggle','sysClockWidget','clockCopyBtn'])assert.ok(script.includes(id),id);
});
test('No injected network URL, protocol confusion, off-origin redirect, or traversal',()=>{
 for(const raw of ['javascript:alert(1)','data:text/html,evil','//evil.example/path','https://evil.example/route','https://github.com.evil.example/machackabook/repo','http://github.com/machackabook/Cryptic','https://github.com/evil/repo','https://github.com/machackabook/repo?redirect=https://evil.example','https://github.com/machackabook/repo#frag','./interfaces/%2e%2e/evil.html','../outside/index.html']){
  assert.equal(safeReference(raw,root,origin),null,raw);
 }
 assert.equal(safeReference('./interfaces/otasonar-beacon-fabric.html',root,origin),root+'interfaces/otasonar-beacon-fabric.html');
 assert.equal(safeReference('https://github.com/machackabook/Cryptic',root,origin),'https://github.com/machackabook/Cryptic');
 assert.equal(protectedFrame({embed:true,interface_url:'https://evil.example'},root,origin),null);
 assert.equal(approvedSurface('./surfaces/home.html?url=https://evil.example'),null);
 assert.equal(approvedSurface('https://evil.example/surfaces/home.html'),null);
});
test('Browser transport is restrictive; only pinned optional CDN remains',()=>{
 const html=read('magic/index.html'),router=read('magic/surface-router.mjs'),app=read('magic/magic.js'),beacon=read('interfaces/otasonar-beacon-fabric.js');
 assert.ok(html.includes('integrity="sha384-'));assert.ok(!html.includes('<script src="https://cdn.jsdelivr.net'));
 assert.ok(router.includes("redirect:'error'"));assert.ok(router.includes('r.redirected'));assert.ok(router.includes('GOD_ROUTE_DENIED'));
 assert.ok(router.includes("setAttribute('sandbox','allow-scripts')"));assert.ok(!app.includes("frame.sandbox='allow-scripts allow-same-origin"));
 assert.ok(beacon.includes("redirect:'error'"));assert.ok(beacon.includes('crypto.subtle.verify'));
});
test('Terminal text and node cards remain injection-safe and secrets nonpersistent',()=>{
 const t=read('core/terminal-core.js'),nodes=read('modules/nodes.js');
 assert.ok(t.includes("replace(/</g,'&lt;')"));assert.ok(!t.includes("sessionStorage.setItem('cryptic.bridge.secret'"));assert.ok(!t.includes("sessionStorage.setItem('cryptic.runtime.tokens'"));
 assert.ok(nodes.includes('title.textContent'));assert.ok(!nodes.includes('b.innerHTML'));
});
