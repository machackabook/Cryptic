const te = new TextEncoder();
const td = new TextDecoder();
const b64u = bytes => {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
};
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - s.length % 4) % 4)), c => c.charCodeAt(0));
const now = () => Math.floor(Date.now() / 1000);
const id = () => crypto.randomUUID();
const sha = async value => b64u(await crypto.subtle.digest("SHA-256", te.encode(value)));
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
});
const decode = part => JSON.parse(td.decode(unb64u(part)));
const splitJwt = token => {
  const p = String(token || "").split(".");
  if (p.length !== 3) throw new Error("malformed_jwt");
  return p;
};
const jwksCache = new Map();

async function verifyOidc(token, issuer, audience, jwksUrl, allowCloudflareAccess = false) {
  const [h, p, s] = splitJwt(token);
  const header = decode(h);
  if (header.alg !== "RS256" || typeof header.kid !== "string") throw new Error("unsupported_oidc_algorithm");
  let jwks = jwksCache.get(jwksUrl);
  if (!jwks || jwks.until < Date.now()) {
    const response = await fetch(jwksUrl, { redirect: "error", signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error("jwks_unavailable");
    jwks = { value: await response.json(), until: Date.now() + 300000 };
    jwksCache.set(jwksUrl, jwks);
  }
  const jwk = jwks.value.keys?.find(k => k.kid === header.kid && k.kty === "RSA" && (!k.alg || k.alg === "RS256"));
  if (!jwk) throw new Error("signing_key_not_found");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, unb64u(s), te.encode(h + "." + p));
  if (!valid) throw new Error("oidc_signature_invalid");
  const c = decode(p);
  const audOk = c.aud === audience || (Array.isArray(c.aud) && c.aud.includes(audience));
  if (c.iss !== issuer || !audOk || typeof c.sub !== "string" || !c.sub) throw new Error("oidc_claims_invalid");
  if (!Number.isInteger(c.exp) || c.exp <= now() || (c.nbf && c.nbf > now() + 30)) throw new Error("oidc_token_expired_or_early");
  if (!Number.isInteger(c.iat) || c.iat > now() + 30 || c.iat < now() - 300) throw new Error("oidc_token_too_old");
  if (Array.isArray(c.aud) && c.aud.length > 1 && c.azp !== audience) throw new Error("oidc_authorized_party_invalid");
  const trustedEmail = c.email_verified === true || (allowCloudflareAccess && c.type === "app");
  if (typeof c.email !== "string" || !trustedEmail) throw new Error("verified_email_required");
  return c;
}

async function hmac(secret, input) {
  const key = await crypto.subtle.importKey("raw", te.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  return key;
}
async function signBridge(claims, secret) {
  const head = b64u(te.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = b64u(te.encode(JSON.stringify(claims)));
  const input = head + "." + body;
  const sig = await crypto.subtle.sign("HMAC", await hmac(secret, input), te.encode(input));
  return input + "." + b64u(sig);
}
async function verifyBridge(token, env) {
  const [h, p, s] = splitJwt(token);
  const header = decode(h);
  if (header.alg !== "HS256" || header.typ !== "JWT") throw new Error("bridge_algorithm_invalid");
  const key = await hmac(env.MESH_SIGNING_SECRET);
  const ok = await crypto.subtle.verify("HMAC", key, unb64u(s), te.encode(h + "." + p));
  if (!ok) throw new Error("bridge_signature_invalid");
  const c = decode(p);
  if (c.iss !== "cryptic-mesh" || c.aud !== "cryptic-mesh" || typeof c.sub !== "string" || typeof c.jti !== "string") throw new Error("bridge_claims_invalid");
  if (!Number.isInteger(c.exp) || c.exp <= now() || c.exp > now() + 660) throw new Error("bridge_token_expired");
  const row = await env.DB.prepare("SELECT revoked_at, expires_at FROM mesh_tokens WHERE jti_hash = ?").bind(await sha(c.jti)).first();
  if (!row || row.revoked_at || row.expires_at <= now()) throw new Error("bridge_token_revoked");
  return c;
}
function bearer(req) {
  const value = req.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}
function cors(req, env) {
  const origin = req.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(x => x.trim()).filter(Boolean);
  const headers = {
    "vary": "Origin",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "Authorization,Content-Type,X-Cryptic-Agent-Time,X-Cryptic-Agent-Nonce,X-Cryptic-Agent-Signature",
    "access-control-max-age": "600"
  };
  if (allowed.includes(origin)) headers["access-control-allow-origin"] = origin;
  return headers;
}
async function audit(env, event, subject, outcome, detail = "") {
  await env.DB.prepare("INSERT INTO mesh_audit(id,event,subject,outcome,detail,created_at) VALUES(?,?,?,?,?,?)")
    .bind(id(), event, subject, outcome, String(detail).slice(0, 400), now()).run();
}
async function rateLimit(env, key, limit = 12) {
  const bucket = Math.floor(now() / 60);
  await env.DB.prepare("INSERT INTO mesh_rate(rate_key,bucket,hits) VALUES(?,?,1) ON CONFLICT(rate_key,bucket) DO UPDATE SET hits=hits+1")
    .bind(key, bucket).run();
  const row = await env.DB.prepare("SELECT hits FROM mesh_rate WHERE rate_key=? AND bucket=?").bind(key, bucket).first();
  await env.DB.prepare("DELETE FROM mesh_rate WHERE bucket < ?").bind(bucket - 2).run();
  return (row?.hits || 0) <= limit;
}
async function signAgentEnvelope(env, envelope) {
  const key = await hmac(env.AGENT_HMAC_SECRET);
  const signature = await crypto.subtle.sign("HMAC", key, te.encode(JSON.stringify(envelope)));
  return b64u(signature);
}
async function verifyAgent(req, raw, env) {
  const timestamp = Number(req.headers.get("X-Cryptic-Agent-Time"));
  const nonce = req.headers.get("X-Cryptic-Agent-Nonce") || "";
  const signature = req.headers.get("X-Cryptic-Agent-Signature") || "";
  if (!Number.isInteger(timestamp) || Math.abs(now() - timestamp) > 60 || !/^[A-Za-z0-9_-]{20,100}$/.test(nonce) || !signature) return false;
  const key = await hmac(env.AGENT_HMAC_SECRET);
  const input = timestamp + "." + nonce + "." + raw;
  const valid = await crypto.subtle.verify("HMAC", key, unb64u(signature), te.encode(input));
  if (!valid) return false;
  try {
    await env.DB.prepare("INSERT INTO mesh_nonces(nonce_hash,expires_at) VALUES(?,?)").bind(await sha(nonce), now() + 120).run();
  } catch {
    return false;
  }
  await env.DB.prepare("DELETE FROM mesh_nonces WHERE expires_at < ?").bind(now()).run();
  return true;
}
async function readBody(req, max = 16384) {
  const raw = await req.text();
  if (te.encode(raw).length > max) throw new Error("body_too_large");
  let data;
  try { data = JSON.parse(raw || "{}"); } catch { throw new Error("invalid_json"); }
  return { raw, data };
}
async function issue(req, env) {
  const { data } = await readBody(req, 12000);
  if (typeof data.google_id_token !== "string" || typeof data.portal_id_token !== "string") return json({ error: "both_oidc_tokens_required" }, 400);
  const [google, portal] = await Promise.all([
    verifyOidc(data.google_id_token, env.GOOGLE_ISSUER, env.GOOGLE_AUDIENCE, "https://www.googleapis.com/oauth2/v3/certs"),
    verifyOidc(data.portal_id_token, env.PORTAL_ISSUER, env.PORTAL_AUDIENCE, env.PORTAL_JWKS_URL, env.PORTAL_IDP_TYPE === "cloudflare-access")
  ]);
  const email = google.email.trim().toLowerCase();
  if (email !== portal.email.trim().toLowerCase()) throw new Error("identity_email_mismatch");
  if (!(await rateLimit(env, "exchange:" + await sha(email), 8))) return json({ error: "rate_limited" }, 429);
  const issued = now(), exp = issued + 600, jti = id();
  const scopes = ["mesh:read", "mesh:dispatch", "portal:read"];
  const claims = { iss: "cryptic-mesh", aud: "cryptic-mesh", sub: portal.sub, email, google_sub: google.sub, scope: scopes.join(" "), iat: issued, nbf: issued - 5, exp, jti };
  const access = await signBridge(claims, env.MESH_SIGNING_SECRET);
  await env.DB.prepare("INSERT INTO mesh_tokens(jti_hash,subject,google_sub,email,scopes,expires_at,created_at) VALUES(?,?,?,?,?,?,?)")
    .bind(await sha(jti), portal.sub, google.sub, email, scopes.join(" "), exp, issued).run();
  await audit(env, "auth.exchange", portal.sub, "success", "paired_google_portal_identity");
  return json({ access_token: access, token_type: "Bearer", expires_in: 600, scope: scopes });
}
async function rotate(req, env) {
  const old = await verifyBridge(bearer(req), env);
  const issued = now(), exp = issued + 600, jti = id(), nextHash = await sha(jti), oldHash = await sha(old.jti);
  const update = await env.DB.prepare("UPDATE mesh_tokens SET revoked_at=?,rotated_to=? WHERE jti_hash=? AND revoked_at IS NULL AND rotated_to IS NULL AND expires_at>?")
    .bind(issued, nextHash, oldHash, issued).run();
  if (!update.meta.changes) throw new Error("rotation_replay_or_revoked");
  await env.DB.prepare("INSERT INTO mesh_tokens(jti_hash,subject,google_sub,email,scopes,expires_at,created_at) VALUES(?,?,?,?,?,?,?)")
    .bind(nextHash, old.sub, old.google_sub, old.email, old.scope, exp, issued).run();
  const access = await signBridge({ ...old, iat: issued, nbf: issued - 5, exp, jti }, env.MESH_SIGNING_SECRET);
  await audit(env, "auth.rotate", old.sub, "success");
  return json({ access_token: access, token_type: "Bearer", expires_in: 600, scope: String(old.scope).split(" ") });
}
async function dispatch(req, env) {
  const claims = await verifyBridge(bearer(req), env);
  if (!String(claims.scope).split(" ").includes("mesh:dispatch")) return json({ error: "insufficient_scope" }, 403);
  const { data } = await readBody(req);
  if (typeof data.action !== "string" || !/^[a-z][a-z0-9_.-]{0,63}$/.test(data.action)) return json({ error: "invalid_action" }, 400);
  const allowedActions = new Set(["nexus.health", "nexus.echo", "sos.mesh.status"]);
  if (!allowedActions.has(data.action)) return json({ error: "action_not_allowlisted" }, 403);
  const args = data.arguments ?? {};
  const payload = JSON.stringify({ action: data.action, arguments: args });
  if (te.encode(payload).length > 10000) return json({ error: "payload_too_large" }, 413);
  const created = now(), jobId = id(), correlation = data.correlation_id || id();
  const envelope = {
    version: "cryptic-mesh/1",
    message_id: jobId,
    correlation_id: String(correlation).slice(0, 100),
    origin: "sos-aistudio",
    destination: "nexus-local",
    issued_at: created,
    expires_at: created + 90,
    nonce: id(),
    hop_count: 0,
    max_hops: 8,
    payload_sha256: await sha(payload),
    payload: { action: data.action, arguments: args }
  };
  envelope.edge_signature = await signAgentEnvelope(env, envelope);
  await env.DB.prepare("INSERT INTO mesh_jobs(id,subject,envelope,status,created_at) VALUES(?,?,?,'queued',?)")
    .bind(jobId, claims.sub, JSON.stringify(envelope), created).run();
  await audit(env, "mesh.dispatch", claims.sub, "queued", "job=" + jobId + ";action=" + data.action);
  return json({ job_id: jobId, status: "queued", correlation_id: envelope.correlation_id }, 202);
}
async function agent(req, env, path) {
  const { raw, data } = await readBody(req, 16000);
  if (!(await verifyAgent(req, raw, env))) {
    await audit(env, "agent.auth", null, "denied");
    return json({ error: "agent_unauthorized" }, 401);
  }
  if (path === "/v1/mesh/agent/poll") {
    const staleBefore = now() - 120;
    const row = await env.DB.prepare("SELECT id,envelope FROM mesh_jobs WHERE status='queued' OR (status='claimed' AND claimed_at < ?) ORDER BY created_at LIMIT 1").bind(staleBefore).first();
    if (!row) return json({ job: null });
    const claim = await env.DB.prepare("UPDATE mesh_jobs SET status='claimed',claimed_at=? WHERE id=? AND (status='queued' OR (status='claimed' AND claimed_at < ?))").bind(now(), row.id, staleBefore).run();
    if (!claim.meta.changes) return json({ job: null });
    const envelope = JSON.parse(row.envelope);
    if (envelope.expires_at <= now() || envelope.hop_count >= envelope.max_hops) {
      await env.DB.prepare("UPDATE mesh_jobs SET status='failed',completed_at=?,result=? WHERE id=?").bind(now(), JSON.stringify({ error: "envelope_expired_or_hop_limit" }), row.id).run();
      return json({ job: null });
    }
    envelope.hop_count += 1;
    envelope.last_hop = env.AGENT_ID || "nexus-local";
    await audit(env, "mesh.agent.claim", null, "success", "job=" + row.id);
    return json({ job: envelope });
  }
  if (path === "/v1/mesh/agent/result") {
    if (typeof data.message_id !== "string" || !["completed", "failed"].includes(data.status)) return json({ error: "invalid_result" }, 400);
    const result = JSON.stringify(data.result ?? null).slice(0, 12000);
    const saved = await env.DB.prepare("UPDATE mesh_jobs SET status=?,completed_at=?,result=? WHERE id=? AND status='claimed'")
      .bind(data.status, now(), result, data.message_id).run();
    if (!saved.meta.changes) return json({ error: "job_not_claimed" }, 409);
    await audit(env, "mesh.agent.result", null, data.status, "job=" + data.message_id);
    return json({ stored: true });
  }
  return json({ error: "not_found" }, 404);
}
async function route(req, env) {
  const path = new URL(req.url).pathname;
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req, env) });
  if (path === "/health" && req.method === "GET") {
    await env.DB.prepare("SELECT 1").first();
    return json({ ok: true, service: "CRYPTIC-SOS-MESH", agent_id: env.AGENT_ID || "unconfigured", timestamp: new Date().toISOString() }, 200, cors(req, env));
  }
  if (path === "/v1/mesh/auth/exchange" && req.method === "POST") return issue(req, env);
  if (path === "/v1/mesh/auth/rotate" && req.method === "POST") return rotate(req, env);
  if (path === "/v1/mesh/auth/revoke" && req.method === "POST") {
    const c = await verifyBridge(bearer(req), env);
    await env.DB.prepare("UPDATE mesh_tokens SET revoked_at=? WHERE jti_hash=? AND revoked_at IS NULL").bind(now(), await sha(c.jti)).run();
    await audit(env, "auth.revoke", c.sub, "success");
    return json({ revoked: true });
  }
  if (path === "/v1/mesh/dispatch" && req.method === "POST") return dispatch(req, env);
  if (path === "/v1/mesh/jobs" && req.method === "GET") {
    const c = await verifyBridge(bearer(req), env);
    const rows = await env.DB.prepare("SELECT id,status,created_at,completed_at,result FROM mesh_jobs WHERE subject=? ORDER BY created_at DESC LIMIT 30").bind(c.sub).all();
    return json({ jobs: rows.results });
  }
  if (path === "/v1/mesh/portal/status" && req.method === "GET") {
    const c = await verifyBridge(bearer(req), env);
    const rows = await env.DB.prepare("SELECT status,COUNT(*) AS count FROM mesh_jobs WHERE subject=? GROUP BY status").bind(c.sub).all();
    return json({ authenticated: true, subject: c.sub, scopes: String(c.scope).split(" "), jobs: rows.results });
  }
  if ((path === "/v1/mesh/agent/poll" || path === "/v1/mesh/agent/result") && req.method === "POST") return agent(req, env, path);
  return json({ error: "not_found" }, 404);
}
export default {
  async fetch(req, env) {
    const headers = cors(req, env);
    const origin = req.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(x => x.trim()).filter(Boolean);
    if (origin && !allowed.includes(origin)) return json({ error: "origin_not_allowed" }, 403);
    try {
      const response = await route(req, env);
      const merged = new Headers(response.headers);
      for (const [k, v] of Object.entries(headers)) merged.set(k, v);
      return new Response(response.body, { status: response.status, headers: merged });
    } catch (error) {
      const message = String(error?.message || "request_failed").slice(0, 120);
      try { await audit(env, "request.rejected", null, "denied", message); } catch {}
      const unauthorized = /token|signature|oidc|issuer|audience|identity|revoked|jwks|email/.test(message);
      return json({ error: "request_rejected", reason: message }, unauthorized ? 401 : 400, headers);
    }
  }
};
