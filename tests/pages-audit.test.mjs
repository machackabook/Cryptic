import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm, readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {assertTrustedUrl, createAudit, main, markdownEscape, readBoundedResponse, reportMarkdown, validateOwners, validateRepository} from '../scripts/pages-security-audit.mjs';

const sha = 'a'.repeat(40);
const repo = {full_name:'owner/site',owner:{login:'owner'},name:'site',default_branch:'main',private:false,has_pages:true};
const source = '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'">';
const json = value => new Response(JSON.stringify(value),{headers:{'content-type':'application/json'}});
function fixture({entries=[{path:'index.html',type:'blob',size:source.length,mode:'100644'}],truncated=false,raw,ref} = {}) {
  const calls = [];
  const fetchImpl = async (url,options) => {
    calls.push({url,options});
    if (url.includes('/git/ref/heads/')) return json(ref || {object:{type:'commit',sha}});
    if (url.includes('/git/trees/')) return json({tree:entries,truncated});
    if (url.startsWith('https://raw.githubusercontent.com/')) return raw ? raw(url) : new Response(source);
    if (url.includes('.github.io')) return new Response('');
    throw Error('unexpected request');
  };
  return {fetchImpl,calls};
}
async function directory(t) {
  const root = await mkdtemp(path.join(os.tmpdir(),'cryptic-pages-audit-'));
  t.after(() => rm(root,{recursive:true,force:true}));
  return root;
}

test('trust boundary rejects malformed owners, metadata and credential-bearing URLs', () => {
  for (const owners of ['', 'owner,', 'owner/evil', 'bad_name', 'owner\nother']) assert.throws(() => validateOwners(owners));
  assert.deepEqual(validateOwners(' owner,OWNER '),['owner']);
  for (const url of ['http://api.github.com/repos/a/b','https://api.github.com.evil.test/repos/a/b','https://secret@api.github.com/repos/a/b','https://api.github.com:444/repos/a/b','https://localhost/repos/a/b']) assert.throws(() => assertTrustedUrl(url,'api'));
  assert.throws(() => assertTrustedUrl('https://raw.githubusercontent.com/owner/site/main/app.js','source'));
  assert.throws(() => validateRepository({...repo,full_name:'owner/../../evil'},'owner'));
  assert.throws(() => validateRepository({...repo,default_branch:'../private'},'owner'));
  assert.throws(() => validateRepository({...repo,owner:{login:'other'}},'owner'));
  assert.throws(() => createAudit({fileCap:513}));
});

test('source is pinned to immutable SHA; only exact API requests receive credentials', async () => {
  const {fetchImpl,calls} = fixture(), audit = createAudit({fetchImpl,token:'test-only-token'});
  await audit.inspectRepository(repo,'owner');
  const report = audit.report();
  assert.equal(report.inventory[0].source_commit,sha);
  assert.equal(report.inventory[0].coverage,'selected-source-complete');
  assert.equal(report.coverage_errors.length,0);
  for (const {url,options} of calls) {
    if (url.startsWith('https://api.github.com/')) {
      assert.equal(options.headers.authorization,'Bearer test-only-token');
      assert.equal(options.redirect,'error');
    } else {
      assert.equal(options.headers.authorization,undefined);
      if (url.includes('raw.githubusercontent.com')) {
        assert.ok(url.includes('/' + sha + '/'));
        assert.equal(options.redirect,'error');
      } else assert.equal(options.redirect,'manual');
    }
  }
});

test('hostile repository metadata never generates a network request', async () => {
  let calls = 0;
  const audit = createAudit({fetchImpl:async () => {calls++;throw Error('unexpected');}});
  await audit.inspectRepository({...repo,owner:{login:'localhost:123'}});
  await audit.inspectRepository({...repo,full_name:'owner/evil?redirect=private'});
  assert.equal(calls,0);
  assert.equal(audit.report().coverage_errors.length,2);
});

test('redirect and failed fetch evidence stays partial and does not echo thrown data', async () => {
  const secret = 'private-error-data';
  const broken = fixture({raw:() => {throw Error(secret);}});
  const audit = createAudit({fetchImpl:broken.fetchImpl});
  await audit.inspectRepository(repo);
  const report = audit.report();
  assert.equal(report.inventory[0].files,0);
  assert.equal(report.inventory[0].coverage,'partial');
  assert.equal(report.files_skipped,1);
  assert.ok(report.coverage_errors.length);
  assert.ok(!JSON.stringify(report).includes(secret));
  const redirected = createAudit({fetchImpl:async () => new Response('',{status:302,headers:{location:'https://hostile.test'}})});
  await redirected.inspectRepository(repo);
  assert.equal(redirected.report().inventory[0].coverage,'partial');
  assert.ok(redirected.report().coverage_errors.some(s => s.includes('HTTP 302')));
});

test('streamed byte limits apply before decoding and stalled streams are aborted', async () => {
  const stream = new ReadableStream({start(controller) {controller.enqueue(new TextEncoder().encode('🙂🙂'));controller.close();}});
  await assert.rejects(readBoundedResponse(new Response(stream),7),/byte limit/);
  await assert.rejects(readBoundedResponse(new Response('short',{headers:{'content-length':'999'}}),8),/byte limit/);
  const abort = new AbortController();
  const stalled = new Response(new ReadableStream({start() {}}));
  const pending = readBoundedResponse(stalled,100,abort.signal);
  abort.abort();
  await assert.rejects(pending,/timeout/);
  const ok = new ReadableStream({start(controller) {controller.enqueue(new TextEncoder().encode('first'));controller.enqueue(new TextEncoder().encode('second'));controller.close();}});
  assert.equal(await readBoundedResponse(new Response(ok),11),'firstsecond');
});

test('oversize, truncated and capped source trees cannot claim complete coverage', async t => {
  const cases = [
    {fixtureOptions:{truncated:true},options:{}},
    {fixtureOptions:{entries:[{path:'index.html',type:'blob',size:180001}]},options:{}},
    {fixtureOptions:{entries:[{path:'index.html',type:'blob',size:source.length},{path:'app.js',type:'blob',size:0}]},options:{fileCap:1}},
    {fixtureOptions:{raw:() => new Response('x'.repeat(101))},options:{maxFileBytes:100}},
    {fixtureOptions:{entries:[]},options:{}}
  ];
  for (const [index,entry] of cases.entries()) await t.test(String(index),async () => {
    const {fetchImpl} = fixture(entry.fixtureOptions), audit = createAudit({...entry.options,fetchImpl});
    await audit.inspectRepository(repo);
    assert.equal(audit.report().inventory[0].coverage,'partial');
    assert.ok(audit.report().coverage_errors.length);
  });
});

test('local credentials include config/docs/env; test behavior fixtures are explicitly excluded', async t => {
  const root = await directory(t), credential = 'ghp_' + 'x'.repeat(30);
  await mkdir(path.join(root,'tests'));
  await mkdir(path.join(root,'docs'));
  await writeFile(path.join(root,'config.json'),JSON.stringify({key:credential}));
  await writeFile(path.join(root,'.env.local'),'TOKEN=' + credential);
  await writeFile(path.join(root,'docs','notes.md'),credential);
  await writeFile(path.join(root,'tests','fixture.test.mjs'),'eval("fixture"); <iframe sandbox="allow-scripts allow-same-origin"></iframe>');
  const audit = createAudit();
  await audit.auditLocal(root);
  const report = audit.report();
  assert.equal(report.files_read,4);
  assert.equal(report.counts.critical,3);
  assert.equal(report.counts.high,0);
  assert.equal(report.coverage_errors.length,0);
  assert.ok(report.scope_limitations.some(s => s.includes('exclude tests and fixtures')));
  assert.ok(!JSON.stringify(report).includes(credential));
  audit.scanSource('fixture','tests/credential.js',credential);
  assert.equal(audit.report().counts.critical,4);
});

test('local oversized and empty scans fail with reviewable reports', async t => {
  const root = await directory(t);
  const empty = createAudit();
  await empty.auditLocal(root);
  assert.ok(empty.report().coverage_errors.length);
  await writeFile(path.join(root,'app.js'),'x'.repeat(101));
  const oversized = createAudit({maxFileBytes:100});
  await oversized.auditLocal(root);
  assert.equal(oversized.report().files_read,0);
  assert.equal(oversized.report().files_skipped,1);
  assert.ok(oversized.report().coverage_errors.some(s => s.includes('byte limit')));
  assert.equal(await main({cwd:root,env:{PAGES_AUDIT_MAX_BYTES:'100'},argv:['--local-only']}),1);
  const saved = JSON.parse(await readFile(path.join(root,'reports/security/pages-audit-local.json'),'utf8'));
  assert.ok(saved.coverage_errors.length);
  assert.equal(await main({cwd:root,env:{PAGES_AUDIT_MAX_FILES:'bad-secret-configuration'},argv:[]}),1);
  assert.ok(!(await readFile(path.join(root,'reports/security/pages-audit-local.json'),'utf8')).includes('bad-secret-configuration'));
});

test('empty fleet and malformed owner lists fail evidence coverage', async () => {
  const empty = createAudit({fetchImpl:async () => json([])});
  await empty.auditFleet('owner');
  assert.ok(empty.report().coverage_errors.some(s => s.includes('no public Pages')));
  const invalid = createAudit({fetchImpl:async () => {throw Error('unexpected request');}});
  await invalid.auditFleet('!!!');
  assert.ok(invalid.report().coverage_errors.some(s => s.includes('owner list')));
});

test('integrity exceptions do not hide later scripts; origin comments cannot suppress cache indicators', () => {
  const audit = createAudit();
  const pinned = '<script src="https://cdn.test/app.js" integrity="sha256-' + 'A'.repeat(43) + '="></script>';
  audit.scanSource('fixture','page.html',pinned.repeat(8) + '<script src="https://cdn.test/app.js" integrity=""></script>');
  audit.scanSource('fixture','other.html','<script src="https://cdn.test/app.js" data-integrity="sha256-' + 'A'.repeat(43) + '="></script>');
  audit.scanSource('fixture','invalid.html','<script src="https://cdn.test/app.js" integrity="sha256-' + 'A'.repeat(32) + '"></script>');
  audit.scanSource('fixture','sw.js','// .origin\ncache.put(event.request,response)');
  assert.equal(audit.report().findings.filter(s => s.id === 'C006').length,3);
  assert.equal(audit.report().findings.filter(s => s.id === 'C009').length,1);
  assert.ok(!markdownEscape('<img>|[link](https://example.test)\n').includes('<img>'));
  assert.ok(reportMarkdown(audit.report()).includes('Scope'));
});
