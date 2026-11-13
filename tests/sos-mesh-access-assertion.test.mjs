import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign, webcrypto } from "node:crypto";
import worker from "../integrations/sos-mesh/worker.mjs";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const issuer = "https://crypticnews.cloudflareaccess.com";
const audience = "fac224bcc6b364514390deb38330bd171935ea0afd09d87c31985a7c553bd828";
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "access-test-key", alg: "RS256" };

function makeAccessToken(key = privateKey, claims = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", kid: "access-test-key" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: issuer,
    aud: audience,
    sub: "access-user-subject",
    email: "operator@example.invalid",
    type: "app",
    iat: now,
    nbf: now - 1,
    exp: now + 300,
    ...claims
  })).toString("base64url");
  const input = header + "." + payload;
  return input + "." + sign("RSA-SHA256", Buffer.from(input), key).toString("base64url");
}

function fakeDb() {
  return {
    prepare() {
      return {
        bind() {
          return {
            run: async () => ({ meta: { changes: 1 } }),
            first: async () => null,
            all: async () => ({ results: [] })
          };
        }
      };
    }
  };
}

function makeEnv() {
  return {
    PORTAL_ISSUER: issuer,
    PORTAL_AUDIENCE: audience,
    PORTAL_JWKS_URL: "https://jwks.test/access",
    PORTAL_IDP_TYPE: "cloudflare-access",
    DB: fakeDb()
  };
}

test("verify-portal accepts a real RS256 Cloudflare Access app assertion", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(String(url), "https://jwks.test/access");
    return Response.json({ keys: [jwk] });
  };
  try {
    const token = makeAccessToken();
    const response = await worker.fetch(new Request("https://mesh.test/v1/mesh/auth/verify-portal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ portal_id_token: token })
    }), makeEnv());
    const result = await response.json();
    assert.equal(response.status, 200);
    assert.equal(result.authenticated, true);
    assert.equal(result.provider, "cloudflare-access");
    assert.match(result.subject_fingerprint, /^[a-f0-9]{16}$/);
    assert.equal(result.email, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("verify-portal rejects an invalid RS256 signature", async () => {
  const originalFetch = globalThis.fetch;
  const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
  globalThis.fetch = async () => Response.json({ keys: [jwk] });
  try {
    const token = makeAccessToken(other.privateKey);
    const response = await worker.fetch(new Request("https://mesh.test/v1/mesh/auth/verify-portal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ portal_id_token: token })
    }), makeEnv());
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error, "request_rejected");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("verify-portal rejects expired assertions", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ keys: [jwk] });
  try {
    const token = makeAccessToken(privateKey, { exp: Math.floor(Date.now() / 1000) - 10 });
    const response = await worker.fetch(new Request("https://mesh.test/v1/mesh/auth/verify-portal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ portal_id_token: token })
    }), makeEnv());
    assert.equal(response.status, 401);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
