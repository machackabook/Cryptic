#!/usr/bin/env node
// Passive source indicators only; a default-branch snapshot is not a live Pages artifact.
import fs from 'node:fs';
import {open, readdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

export const DEFAULT_OWNERS = 'machackabook,Azazeleous,crypticmetaverse,thearchitectofgaia-boop';
const SHA = /^[a-f0-9]{40}$/i;
const OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const REPO = /^[A-Za-z0-9_.-]{1,100}$/;
const EXCLUDED_DIRS = new Set(['.git', 'node_modules', 'vendor', 'dist', 'build', 'reports', '.codex', '.agents']);
const SCOPE = [
  'Default-branch commit snapshots are reviewed; Pages deployment branches, artifacts, custom domains and runtime behavior are not verified.',
  'Credential indicators inspect eligible code, JSON, YAML, Markdown, environment and key files, including test fixtures.',
  'Source behavior indicators exclude tests and fixtures, and apply only to HTML and JavaScript/TypeScript.',
  'Dependencies, generated dist/build output, reports and tool metadata directories are excluded; Git submodules, binary assets and Git history are not inspected.',
  'Pattern indicators require review and do not prove the presence or absence of a vulnerability.'
];
class AuditError extends Error {}
const problem = message => new AuditError(message);
const safeReason = error => error instanceof AuditError ? error.message : 'request or source read failed';
function integer(value, fallback, minimum, maximum, name) {
  const number = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) throw problem('invalid ' + name);
  return number;
}
export function validateOwners(value = DEFAULT_OWNERS) {
  if (typeof value !== 'string') throw problem('invalid owner list');
  const owners = value.split(',').map(s => s.trim());
  if (!owners.length || owners.some(s => !OWNER.test(s)) || owners.length > 16) throw problem('invalid or empty owner list');
  return owners.filter((owner,index) => owners.findIndex(s => s.toLowerCase() === owner.toLowerCase()) === index);
}
export function validateRepository(repo, expectedOwner) {
  if (!repo || !OWNER.test(repo.owner?.login || '') || typeof repo.name !== 'string' || !REPO.test(repo.name) || ['.', '..'].includes(repo.name)) throw problem('invalid repository metadata');
  const fullName = repo.owner.login + '/' + repo.name;
  if (repo.full_name !== fullName || repo.private !== false || repo.has_pages !== true || !validTreePath(repo.default_branch) || repo.default_branch.length > 255 || /[~^:?*\[]/.test(repo.default_branch)) throw problem('invalid public Pages repository metadata');
  if (expectedOwner && repo.owner.login.toLowerCase() !== expectedOwner.toLowerCase()) throw problem('repository owner does not match requested owner');
  return {fullName, owner: repo.owner.login, name: repo.name, branch: repo.default_branch};
}
export function assertTrustedUrl(value, kind) {
  let url;
  try { url = new URL(value); } catch { throw problem('invalid request URL'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.port) throw problem('untrusted request URL');
  if (kind === 'api' && url.origin !== 'https://api.github.com') throw problem('untrusted GitHub API origin');
  if (kind === 'source' && (url.origin !== 'https://raw.githubusercontent.com' || !/^\/[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+\/[a-f0-9]{40}\//i.test(url.pathname) || url.search)) throw problem('untrusted source URL');
  if (!['api', 'source'].includes(kind)) throw problem('invalid request kind');
  return url;
}
function validTreePath(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 4096 && !/[\x00-\x1f\x7f\\]/.test(value) && !value.startsWith('/') && value.split('/').every(s => s && s !== '.' && s !== '..');
}
function sourceRank(file) {
  const f = file.toLowerCase();
  if (f === 'index.html') return 0;
  if (/(^|\/)(sw|service-worker)\.js$/.test(f)) return 1;
  if (/(^|\/)(main|app|terminal-core|bridge|runtime|magic|dashboard|panel|server)\.(html|js|mjs|cjs|jsx|tsx|ts)$/.test(f)) return 2;
  if (/(^|\/)index\.html$/.test(f)) return 3;
  if (/\.html?$/.test(f)) return 4;
  if (/\.(js|mjs|cjs|jsx|tsx|ts)$/.test(f)) return 5;
  if (/\.(json|webmanifest|ya?ml|md|mdx|txt|toml|ini|conf|config|pem|key|css|svg|xml|csv|vue|svelte|py|sh|bash|zsh|sql|lock|cfg|tf|hcl)$/.test(f) || /(^|\/)\.env(?:\.[^/]*)?$/.test(f) || /(^|\/)(id_rsa|id_ed25519|dockerfile)$/.test(f)) return 6;
  return 9;
}
const excluded = file => file.split('/').some(part => EXCLUDED_DIRS.has(part));
const testFixture = file => /(^|\/)(tests?|__tests__|fixtures?|__fixtures__)(\/|$)|\.(test|spec)\.[^/]+$/i.test(file);
function hasIntegrityMetadata(tag) {
  // Consume whole quoted attributes so data-integrity and attribute contents cannot masquerade as SRI.
  const attributes = /\s+([A-Za-z_:][A-Za-z0-9_:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>\x60]+)))?/g;
  let attribute;
  while ((attribute = attributes.exec(tag)) !== null) {
    if (attribute[1].toLowerCase() !== 'integrity') continue;
    const value = attribute[2] ?? attribute[3] ?? attribute[4] ?? '';
    return value.trim().split(/\s+/).some(part => {
      const digest = /^sha(256|384|512)-([A-Za-z0-9+/_-]+={0,2})$/.exec(part);
      if (!digest) return false;
      const encoded = digest[2].replaceAll('-', '+').replaceAll('_', '/');
      const bytes = Buffer.from(encoded, 'base64');
      return bytes.length === Number(digest[1]) / 8 && bytes.toString('base64').replace(/=+$/, '') === encoded.replace(/=+$/, '');
    });
  }
  return false;
}
export function markdownEscape(value) {
  return String(value).replace(/[\x00-\x1f\x7f]/g, ' ').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replace(/([\\\`*_{}\[\]()#+.!|~\-])/g, '\\$1');
}
async function readChunk(reader, signal) {
  if (signal?.aborted) throw problem('request timeout');
  let abort;
  const aborted = new Promise((_, reject) => {
    abort = () => reject(problem('request timeout'));
    signal?.addEventListener('abort', abort, {once: true});
  });
  try { return await Promise.race([reader.read(), aborted]); }
  finally { signal?.removeEventListener('abort', abort); }
}
export async function readBoundedResponse(response, maxBytes, signal) {
  const length = response.headers?.get('content-length');
  if (length && /^\d+$/.test(length) && Number(length) > maxBytes) {
    response.body?.cancel().catch(() => {});
    throw problem('response exceeds byte limit');
  }
  if (!response.body?.getReader) throw problem('missing response stream');
  const reader = response.body.getReader(), chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const result = await readChunk(reader, signal);
      if (result.done) break;
      bytes += result.value.byteLength;
      if (bytes > maxBytes) throw problem('response exceeds byte limit');
      chunks.push(result.value);
    }
    try { return new TextDecoder('utf-8', {fatal: true}).decode(Buffer.concat(chunks, bytes)); }
    catch { throw problem('source is not valid UTF-8'); }
  } catch (error) {
    reader.cancel().catch(() => {});
    throw error;
  } finally { reader.releaseLock(); }
}
const RULES = [
  {id:'C001',level:'critical',name:'Potential reusable credential',re:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{30,}|AIza[0-9A-Za-z_-]{35,}|sk-(?:proj-)?[A-Za-z0-9_-]{35,}|xox[baprs]-[A-Za-z0-9-]{10,}|tskey-(?:auth|api)-[A-Za-z0-9_-]{20,}/g},
  {id:'C002',level:'high',name:'Code execution sink',re:/\beval\s*\(|\bnew\s+Function\s*\(|\bdocument\.write\s*\(/g},
  {id:'C003',level:'high',name:'Scriptable same-origin sandbox',re:/sandbox\s*=\s*["'][^"']*allow-scripts[^"']*allow-same-origin[^"']*["']|sandbox\s*=\s*["'][^"']*allow-same-origin[^"']*allow-scripts[^"']*["']/g},
  {id:'C004',level:'high',name:'Persistent secret storage',re:/(?:sessionStorage|localStorage)\.setItem\s*\(\s*['"][^'"]*(?:secret|password|api[_-]?key|access[_-]?token)[^'"]*['"]/gi},
  {id:'C005',level:'medium',name:'Potential HTML injection sink',re:/\.innerHTML\s*=\s*(?:[^\n;]{0,150}\+|\x60)/g},
  {id:'C006',level:'medium',name:'External JavaScript without SHA integrity metadata',re:/<script\b[^>]*\bsrc=["']https?:\/\/[^"']+["'][^>]*>/gi},
  {id:'C007',level:'medium',name:'Inline event handler',re:/\son(?:click|error|load|mouseover|submit)\s*=/gi}
];

export function createAudit(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch, token = options.token || '';
  const fileCap = integer(options.fileCap, 256, 1, 512, 'file cap');
  const maxFileBytes = integer(options.maxFileBytes, 180000, 1, 1000000, 'source byte limit');
  const maxApiBytes = integer(options.maxApiBytes, 8000000, 1, 32000000, 'API byte limit');
  const timeoutMs = integer(options.timeoutMs, 15000, 1, 30000, 'request timeout');
  const findings = [], inventory = [], errors = [];
  let files = 0, skipped = 0;
  function addFinding(repo, file, rule, index = 0, body) {
    findings.push({repository:repo,path:file,id:rule.id,severity:rule.level,reason:rule.name,line:body === undefined ? 0 : 1 + body.slice(0,index).split('\n').length - 1});
  }
  function scanSource(repo, file, body) {
    files++;
    const behavior = /\.(html?|js|mjs|cjs|jsx|tsx|ts)$/i.test(file) && !testFixture(file);
    for (const rule of RULES) {
      if (rule.id !== 'C001' && !behavior) continue;
      const expression = new RegExp(rule.re.source, rule.re.flags);
      let match, count = 0;
      while ((match = expression.exec(body)) !== null) {
        if (rule.id === 'C006' && hasIntegrityMetadata(match[0])) continue;
        if (count++ < 8) addFinding(repo, file, rule, match.index, body);
        // Report cap only: examine all matches, including integrity exceptions.
      }
    }
    if (behavior && /(^|\/)index\.html$/i.test(file) && !/http-equiv\s*=\s*["']Content-Security-Policy["']/i.test(body)) addFinding(repo,file,{id:'C008',level:'medium',name:'No HTML Content Security Policy'});
    if (behavior && /(^|\/)(sw|service-worker)\.js$/i.test(file) && /cache\.put\s*\(\s*(?:e|event)\.request/.test(body)) addFinding(repo,file,{id:'C009',level:'high',name:'Service worker caches incoming request; inspect all guards'});
  }
  async function requestText(value, kind) {
    const url = assertTrustedUrl(value,kind);
    const headers = kind === 'api' ? {accept:'application/vnd.github+json','user-agent':'Cryptic-Pages-Sentinel'} : {};
    if (kind === 'api' && token) headers.authorization = 'Bearer ' + token;
    const signal = AbortSignal.timeout(timeoutMs);
    let response;
    try { response = await fetchImpl(url.href,{headers,redirect:'error',signal}); }
    catch { throw problem('request failed or redirect refused'); }
    if (!response.ok) {
      response.body?.cancel().catch(() => {});
      throw problem('HTTP ' + (Number.isInteger(response.status) ? response.status : 'failure'));
    }
    return readBoundedResponse(response,kind === 'api' ? maxApiBytes : maxFileBytes,signal);
  }
  async function api(url) {
    const body = await requestText(url,'api');
    try { return JSON.parse(body); } catch { throw problem('invalid GitHub API JSON'); }
  }
  async function inspectRepository(repo, expectedOwner) {
    let meta;
    try { meta = validateRepository(repo,expectedOwner); }
    catch (error) { errors.push('repository inventory: ' + safeReason(error)); return; }
    const ownerSite = meta.name.toLowerCase() === (meta.owner + '.github.io').toLowerCase();
    const item = {name:meta.fullName,site:'https://' + meta.owner + '.github.io/' + (ownerSite ? '' : encodeURIComponent(meta.name) + '/'),files:0,eligible_files:0,coverage:'partial',http:null,source_branch:meta.branch,source_commit:null,source_kind:'default-branch-snapshot'};
    inventory.push(item);
    const initialErrors = errors.length;
    try {
      const root = 'https://api.github.com/repos/' + meta.fullName;
      const ref = await api(root + '/git/ref/heads/' + meta.branch.split('/').map(encodeURIComponent).join('/'));
      if (ref?.object?.type !== 'commit' || !SHA.test(ref?.object?.sha || '')) throw problem('invalid source commit reference');
      item.source_commit = ref.object.sha;
      const data = await api(root + '/git/trees/' + item.source_commit + '?recursive=1');
      if (!Array.isArray(data?.tree) || typeof data.truncated !== 'boolean') throw problem('invalid source tree response');
      const candidates = [];
      for (const entry of data.tree) {
        if (!validTreePath(entry?.path)) { errors.push(meta.fullName + ': invalid source tree path'); continue; }
        if (entry.type !== 'blob' || excluded(entry.path) || sourceRank(entry.path) >= 9) continue;
        if (entry.mode === '120000') { skipped++; errors.push(meta.fullName + '/' + entry.path + ': symlink source excluded'); continue; }
        candidates.push(entry);
      }
      candidates.sort((a,b) => sourceRank(a.path) - sourceRank(b.path) || a.path.localeCompare(b.path));
      item.eligible_files = candidates.length;
      if (data.truncated) errors.push(meta.fullName + ': truncated Git tree');
      if (!candidates.length) errors.push(meta.fullName + ': no eligible source files');
      if (candidates.length > fileCap) errors.push(meta.fullName + ': source file cap excludes ' + (candidates.length - fileCap) + ' files');
      for (const entry of candidates.slice(0,fileCap)) {
        try {
          if (!Number.isInteger(entry.size) || entry.size < 0) throw problem('invalid source size metadata');
          if (entry.size > maxFileBytes) throw problem('source exceeds byte limit');
          const url = 'https://raw.githubusercontent.com/' + meta.fullName + '/' + item.source_commit + '/' + entry.path.split('/').map(encodeURIComponent).join('/');
          scanSource(meta.fullName,entry.path,await requestText(url,'source'));
          item.files++;
        } catch (error) { skipped++; errors.push(meta.fullName + '/' + entry.path + ': ' + safeReason(error)); }
      }
    } catch (error) { errors.push(meta.fullName + ': ' + safeReason(error)); }
    try {
      const url = new URL(item.site);
      if (url.origin !== 'https://' + meta.owner.toLowerCase() + '.github.io' || url.username || url.password) throw problem('untrusted Pages origin');
      const response = await fetchImpl(url.href,{redirect:'manual',headers:{},signal:AbortSignal.timeout(timeoutMs)});
      item.http = response.status;
      response.body?.cancel().catch(() => {});
      if (response.status < 200 || response.status >= 300) {
        errors.push(meta.fullName + ': Pages HTTP ' + response.status + '; destination not verified');
        addFinding(meta.fullName,item.site,{id:'C010',level:'medium',name:'Pages response is not successful'});
      }
    } catch (error) { errors.push(meta.fullName + ': Pages reachability ' + safeReason(error)); }
    if (errors.length === initialErrors && item.files === item.eligible_files && item.files > 0) item.coverage = 'selected-source-complete';
  }
  async function auditFleet(ownerList) {
    let owners;
    try { owners = validateOwners(ownerList); }
    catch (error) { errors.push(safeReason(error)); return []; }
    for (const owner of owners) {
      try {
        for (let page = 1; page <= 4; page++) {
          const repos = await api('https://api.github.com/users/' + owner + '/repos?type=owner&per_page=100&page=' + page);
          if (!Array.isArray(repos)) throw problem('invalid repository list');
          for (const repo of repos) {
            if (!repo || typeof repo.private !== 'boolean' || typeof repo.has_pages !== 'boolean') throw problem('invalid repository list entry');
            if (repo.has_pages && !repo.private) await inspectRepository(repo,owner);
          }
          if (repos.length < 100) break;
          if (page === 4) errors.push(owner + ': repository pagination cap reached');
        }
      } catch (error) { errors.push(owner + ': ' + safeReason(error)); }
    }
    if (!inventory.length) errors.push('fleet inventory contains no public Pages sites');
    if (!files) errors.push('fleet scan read no eligible source files');
    return owners;
  }
  async function auditLocal(root = process.cwd()) {
    root = path.resolve(root);
    const candidates = [];
    async function walk(dir) {
      let entries;
      try { entries = await readdir(dir,{withFileTypes:true}); }
      catch { errors.push('local source directory read failed'); return; }
      for (const entry of entries) {
        const file = path.join(dir,entry.name), relative = path.relative(root,file).split(path.sep).join('/');
        if (excluded(relative)) continue;
        if (!validTreePath(relative)) { errors.push('local source contains invalid path'); continue; }
        if (entry.isSymbolicLink()) { skipped++; errors.push(relative + ': symlink source excluded'); }
        else if (entry.isDirectory()) await walk(file);
        else if (entry.isFile() && sourceRank(relative) < 9) candidates.push({file,relative});
      }
    }
    await walk(root);
    candidates.sort((a,b) => sourceRank(a.relative) - sourceRank(b.relative) || a.relative.localeCompare(b.relative));
    if (candidates.length > fileCap) errors.push('local source file cap excludes ' + (candidates.length - fileCap) + ' files');
    if (!candidates.length) errors.push('local scan contains no eligible source files');
    for (const entry of candidates.slice(0,fileCap)) {
      let handle;
      try {
        handle = await open(entry.file,fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0) | (fs.constants.O_NONBLOCK || 0));
        const stat = await handle.stat();
        if (!stat.isFile()) throw problem('non-regular source file');
        if (stat.size > maxFileBytes) throw problem('source exceeds byte limit');
        const buffer = Buffer.alloc(maxFileBytes + 1);
        let bytes = 0;
        while (bytes <= maxFileBytes) {
          const read = await handle.read(buffer,bytes,buffer.length - bytes,null);
          if (!read.bytesRead) break;
          bytes += read.bytesRead;
        }
        if (bytes > maxFileBytes) throw problem('source exceeds byte limit');
        let body;
        try { body = new TextDecoder('utf-8',{fatal:true}).decode(buffer.subarray(0,bytes)); }
        catch { throw problem('source is not valid UTF-8'); }
        scanSource('local:Cryptic',entry.relative,body);
      } catch (error) { skipped++; errors.push(entry.relative + ': ' + safeReason(error)); }
      finally { await handle?.close(); }
    }
    if (!files) errors.push('local scan read no eligible source files');
  }
  function report(mode = 'local',owners = []) {
    const counts = {critical:0,high:0,medium:0};
    for (const finding of findings) counts[finding.severity]++;
    return {schema:'cryptic.pages.sentinel.v1',ts:new Date().toISOString(),mode,owners,files_read:files,files_skipped:skipped,inventory,counts,findings,coverage_errors:errors,scope_limitations:SCOPE,limits:{files_per_repository:fileCap,source_bytes:maxFileBytes,api_bytes:maxApiBytes,request_timeout_ms:timeoutMs},qualification:'Passive static review only; no production verification; public repositories only.'};
  }
  return {scanSource,inspectRepository,auditFleet,auditLocal,report};
}
export function reportMarkdown(report) {
  const escape = markdownEscape;
  let md = '# Cryptic Pages Sentinel\n\nMode: ' + escape(report.mode) + ' · ' + report.ts + '\n\nFiles read: ' + report.files_read + ' · skipped: ' + report.files_skipped + '\n\nCounts: ' + JSON.stringify(report.counts) + '\n\n## Sites\n\n| Repository | HTTP | Files | Coverage |\n|---|---:|---:|---|\n';
  for (const item of report.inventory) md += '| ' + escape(item.name) + ' | ' + (item.http ?? '?') + ' | ' + item.files + ' | ' + escape(item.coverage) + ' |\n';
  md += '\n## Findings\n\n| Severity | Rule | Repo | File | Line |\n|---|---|---|---|---:|\n';
  for (const finding of report.findings) md += '| ' + escape(finding.severity) + ' | ' + escape(finding.id) + ' | ' + escape(finding.repository) + ' | ' + escape(finding.path) + ' | ' + finding.line + ' |\n';
  md += '\n## Coverage limitations\n\n' + (report.coverage_errors.length ? report.coverage_errors.map(error => '- ' + escape(error)).join('\n') : 'No scanner errors; scope limitations and dynamic verification requirements still apply.') + '\n';
  md += '\n## Scope\n\n' + report.scope_limitations.map(item => '- ' + escape(item)).join('\n') + '\n';
  return md;
}
export async function main({argv = process.argv.slice(2),env = process.env,cwd = process.cwd(),fetchImpl} = {}) {
  const fleet = argv.includes('--fleet');
  let audit, owners = [];
  try {
    audit = createAudit({fetchImpl,token:env.GITHUB_TOKEN,fileCap:env.PAGES_AUDIT_MAX_FILES,maxFileBytes:env.PAGES_AUDIT_MAX_BYTES});
    if (fleet) owners = await audit.auditFleet(env.PAGES_AUDIT_OWNERS);
    else await audit.auditLocal(cwd);
  } catch {
    audit ||= createAudit();
    audit.report().coverage_errors.push('invalid scanner configuration or incomplete execution');
  }
  const report = audit.report(fleet ? 'public-fleet' : 'local',owners);
  const directory = path.join(cwd,'reports/security');
  fs.mkdirSync(directory,{recursive:true});
  const baseName = fleet ? 'pages-audit-fleet' : 'pages-audit-local';
  fs.writeFileSync(path.join(directory,baseName + '.json'),JSON.stringify(report,null,2) + '\n');
  const md = reportMarkdown(report);
  fs.writeFileSync(path.join(directory,baseName + '.md'),md);
  if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY,md.slice(0,900000));
  console.log(JSON.stringify({mode:report.mode,sites:report.inventory.length,files:report.files_read,counts:report.counts,coverage_errors:report.coverage_errors.length,report:'reports/security/' + baseName + '.json'}));
  return report.counts.critical || report.counts.high || report.coverage_errors.length ? 1 : 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) process.exitCode = await main();
