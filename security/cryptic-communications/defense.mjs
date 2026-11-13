/**
 * Cryptic Communications EVE v1 — offline policy engine.
 * No firewall/radio changes, credentials, network calls, or shell execution.
 * Inputs are untrusted assertions until an independently authenticated broker is integrated.
 */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

export const GATES = Object.freeze([
  'DISCOVER','OBSERVE','NORMALIZE','CLASSIFY','VERIFY',
  'FINGERPRINT','LOOKUP_REMEDY','APPLY_REMEDY','REVERIFY'
]);
const directions = new Set(['ingress','egress','local','radio']);
const transports = new Set(['ethernet','wifi','bluetooth','casting','tailscale','local']);
const token = s => typeof s === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(s) && !s.includes('*');
const permittedKeys = (obj, keys) => !!obj && typeof obj === 'object' && !Array.isArray(obj) && Object.keys(obj).every(k => keys.includes(k));
const iso = s => typeof s === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString() === new Date(Date.parse(s)).toISOString();
const fields = ['id','principal','capability','resource','direction','transport','expiresAt'];
function ruleValid(r) {
  return permittedKeys(r,fields) && fields.every(k => Object.hasOwn(r,k)) &&
    ['id','principal','capability','resource'].every(k => token(r[k])) &&
    directions.has(r.direction) && transports.has(r.transport) && iso(r.expiresAt) &&
    ((r.direction === 'radio') === ['bluetooth','casting','wifi'].includes(r.transport));
}
export function validatePolicy(p) {
  const errors=[];
  if (!permittedKeys(p,['schema','version','enforcement','defaultDecision','governance','radio','nexus','allowRules','denyRules']) ||
      p.schema !== 'cryptic.communications.eve.v1' || p.version !== '1.0.0') errors.push('schema');
  if (p?.enforcement !== 'not-installed' || p?.defaultDecision !== 'deny') errors.push('default-deny');
  const gov=p?.governance;
  if (!permittedKeys(gov,['godCharterRequired','adamGates','eveDenyOverridesAllow','azazelRequiresTrustedBroker']) ||
      gov?.godCharterRequired !== true || gov?.eveDenyOverridesAllow !== true || gov?.azazelRequiresTrustedBroker !== true ||
      JSON.stringify(gov?.adamGates) !== JSON.stringify(GATES)) errors.push('governance');
  const r=p?.radio;
  if (!permittedKeys(r,['bluetooth','casting','wifi']) ||
      r?.bluetooth!=='deny-unless-explicitly-authorized-on-endpoint' ||
      r?.casting!=='deny-unless-explicitly-authorized-on-endpoint' ||
      r?.wifi!=='deny-new-clients-until-enrolled') errors.push('radio');
  if (!permittedKeys(p?.nexus,['maxLogicalIdentities','capacityIsNotEnrollment']) ||
      p?.nexus?.maxLogicalIdentities!==6000 || p?.nexus?.capacityIsNotEnrollment!==true) errors.push('nexus');
  const allows=Array.isArray(p?.allowRules)?p.allowRules:[];
  const denies=Array.isArray(p?.denyRules)?p.denyRules:[];
  if (!Array.isArray(p?.allowRules) || !Array.isArray(p?.denyRules) ||
      allows.length+denies.length>6000 ||
      [...allows,...denies].some(x=>!ruleValid(x))) errors.push('rules');
  const ids=[...allows,...denies].map(r=>r?.id);
  if (new Set(ids).size!==ids.length) errors.push('duplicate-rule-id');
  return errors;
}
function matchingRule(r,q,now) {
  return r.principal === q.principal && r.capability === q.capability &&
    r.resource === q.resource && r.direction === q.direction &&
    r.transport === q.transport && Date.parse(r.expiresAt) > Date.parse(now);
}
/**
 * Decision preview ONLY. `proof` is an assertion; it is NOT trusted authentication.
 * The production enforcement adapter must supply independently authenticated evidence.
 */
export function decide(p,q,proof={},now=new Date().toISOString()) {
  const errors=validatePolicy(p);
  if (errors.length) return {decision:'deny',reason:'invalid-policy',errors,productionVerified:false};
  if (!iso(now) || !permittedKeys(q,['principal','capability','resource','direction','transport']) ||
      !['principal','capability','resource'].every(k=>token(q[k])) ||
      !directions.has(q.direction) || !transports.has(q.transport))
    return {decision:'deny',reason:'invalid-request',productionVerified:false};
  if ((q.direction === 'radio') !== ['bluetooth','casting','wifi'].includes(q.transport))
    return {decision:'deny',reason:'invalid-transport-scope',productionVerified:false};
  if (p.denyRules.some(r=>matchingRule(r,q,now)))
    return {decision:'deny',reason:'eve-explicit-deny',productionVerified:false};
  if (!p.allowRules.some(r=>matchingRule(r,q,now)))
    return {decision:'deny',reason:'eve-default-deny',productionVerified:false};
  if (proof?.charterCompliant !== true || proof?.operatorAuthorized !== true ||
      proof?.identityEnrolled !== true || proof?.trustedBrokerValidated !== true ||
      !permittedKeys(proof?.adam,['gates']) ||
      !permittedKeys(proof.adam.gates,GATES) ||
      !GATES.every(k=>proof.adam.gates[k]==='verified'))
    return {decision:'deny',reason:'adam-god-azazel-proof-incomplete',productionVerified:false};
  // This is a dry-run preview; never treat caller-supplied assertions as trust evidence.
  return {decision:'allow-preview',reason:'claimed-gates-and-explicit-rule-match',productionVerified:false};
}
export function policyDigest(p) {return createHash('sha256').update(JSON.stringify(p)).digest('hex');}
export function publicPolicy() {return JSON.parse(readFileSync(new URL('./policy.public.json',import.meta.url),'utf8'));}

if (process.argv[1] && fileURLToPath(import.meta.url)===process.argv[1]) {
  const p=publicPolicy(), issues=validatePolicy(p);
  const report={schema:p.schema,mode:'offline-policy-validation',enforcement:'not-installed',
    violations:issues,allowRuleCount:p.allowRules.length,denyRuleCount:p.denyRules.length,
    logicalIdentityCapacity:p.nexus.maxLogicalIdentities,policySha256:policyDigest(p),
    productionVerified:false};
  console.log(JSON.stringify(report,null,2));
  if (issues.length) process.exitCode=1;
}
