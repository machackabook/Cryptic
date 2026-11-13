import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import worker from "../integrations/uniomni-browser/worker.mjs";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

test("UNIOMNI browser serves a CSP-protected searchable public index", async () => {
  const response = await worker.fetch(new Request("https://uniomni.test/"));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/html/);
  assert.match(response.headers.get("content-security-policy"), /script-src 'nonce-/);
  const body = await response.text();
  assert.match(body, /PUBLIC KNOWLEDGE BROWSER/);
  assert.match(body, /id="query"/);
  assert.match(body, /Clear UI/);
  assert.match(body, /raw.githubusercontent.com/);
  assert.match(body, /GAIA Memory Bridge/);
  assert.doesNotMatch(body, /GAIA_MEMORY_TOKEN|Bearer [A-Za-z0-9._-]+/);
});

test("health endpoint states public-only scope", async () => {
  const response = await worker.fetch(new Request("https://uniomni.test/healthz"));
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.service, "cryptic-uniomni-browser");
  assert.equal(data.private_memory, "not_exposed");
});

test("unsupported methods and paths fail closed", async () => {
  const post = await worker.fetch(new Request("https://uniomni.test/", { method: "POST" }));
  const path = await worker.fetch(new Request("https://uniomni.test/private"));
  assert.equal(post.status, 405);
  assert.equal(path.status, 404);
});
