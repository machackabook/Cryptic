import test from "node:test";
import assert from "node:assert/strict";
import worker from "../integrations/sos-mesh/public.mjs";

test("S.O.S public page is real, read-only, and CSP protected", async () => {
  const response = await worker.fetch(new Request("https://sos.test/"));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/html/);
  assert.match(response.headers.get("content-security-policy"), /script-src 'nonce-/);
  const body = await response.text();
  assert.match(body, /SOVEREIGN OPERATING SYSTEM/);
  assert.match(body, /Clear UI/);
  assert.match(body, /Protected Mesh Gateway/);
  assert.match(body, /GAIA Memory Bridge/);
  assert.doesNotMatch(body, /AGENT_HMAC_SECRET|MESH_SIGNING_SECRET|OPENAI_KEY|Bearer /i);
});

test("health endpoint reports only public service metadata", async () => {
  const response = await worker.fetch(new Request("https://sos.test/healthz"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.service, "cryptic-sos-public");
  assert.equal(body.mesh, "access-protected");
});

test("unsupported methods and paths fail closed", async () => {
  const post = await worker.fetch(new Request("https://sos.test/", { method: "POST" }));
  const path = await worker.fetch(new Request("https://sos.test/private"));
  assert.equal(post.status, 405);
  assert.equal(path.status, 404);
});
