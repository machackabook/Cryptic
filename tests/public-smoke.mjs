import assert from "node:assert/strict";

const checks = [
  { name: "Cryptic public root", url: "https://crypticnews.org/", statuses: [200] },
  { name: "Cryptic public health", url: "https://crypticnews.org/healthz", statuses: [200], json: true },
  { name: "Cryptic HyperTerminal", url: "https://crypticnews.org/nexus/", statuses: [200] },
  { name: "www welcome frontdoor", url: "https://www.crypticnews.org/", statuses: [302] },
  { name: "S.O.S public landing", url: "https://sos.crypticnews.org/", statuses: [200] },
  { name: "S.O.S public health", url: "https://sos.crypticnews.org/healthz", statuses: [200], json: true },
  { name: "UNIOMNI subdomain page", url: "https://uniomni.crypticnews.org/", statuses: [200] },
  { name: "ideal-enigma searchable page", url: "https://ideal-enigma.crypticnews.org/", statuses: [200] },
  { name: "ideal-enigma browser health", url: "https://ideal-enigma.crypticnews.org/healthz", statuses: [200], json: true },
  { name: "UNIOMNI subdomain health", url: "https://uniomni.crypticnews.org/api/health", statuses: [200], json: true },
  { name: "UNIOMNI search API", url: "https://uniomni.crypticnews.org/api/search?q=cryptic", statuses: [200], json: true },
  { name: "UNIOMNI path alias", url: "https://crypticnews.org/uniomni", statuses: [200] },
  { name: "Capability gateway status", url: "https://api.crypticnews.org/v1/status", statuses: [200], json: true },
  { name: "Message bus status", url: "https://bus.crypticnews.org/v1/status", statuses: [200], json: true },
  { name: "S.O.S mesh access boundary", url: "https://crypticnews.org/api/cryptic-mesh/health", statuses: [302, 401, 403] }
];

async function check(item) {
  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(item.url, {
        redirect: "manual",
        signal: AbortSignal.timeout(12000),
        headers: { "user-agent": "CRYPTIC-public-smoke/1.0", "accept": "text/html,application/json" }
      });
      if (!item.statuses.includes(response.status)) {
        const body = (await response.text()).slice(0, 220);
        throw new Error("HTTP " + response.status + " body=" + body);
      }
      if (item.json) {
        const data = await response.json();
        if (item.name === "S.O.S public health") assert.equal(data.service, "cryptic-sos-public");
        if (item.name === "UNIOMNI subdomain health") assert.equal(data.private_memory_exposed, false);
        if (item.name === "ideal-enigma browser health") assert.equal(data.private_memory, "not_exposed");
        if (item.name === "UNIOMNI search API") {
          assert.equal(data.private_memory_exposed, false);
          assert.ok(Array.isArray(data.results));
          assert.ok(data.results.length > 0);
        }
        if (item.name === "Capability gateway status") assert.equal(data.ok, true);
        if (item.name === "Message bus status") assert.equal(data.ok, true);
      }
      if (item.name === "www welcome frontdoor") {
        assert.match(response.headers.get("location") || "", /machackabook\.github\.io\/Welcome-Sentience/);
      }
      if (item.name === "S.O.S mesh access boundary") assert.notEqual(response.status, 200);
      return { name: item.name, status: response.status, attempt };
    } catch (error) {
      last = error;
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 900));
    }
  }
  throw new Error(item.name + " failed after 3 attempts: " + String(last));
}

const results = [];
for (const item of checks) {
  const result = await check(item);
  results.push(result);
  process.stdout.write("PASS " + result.name + " [" + result.status + ", attempt " + result.attempt + "]\n");
}
process.stdout.write("PUBLIC_SMOKE_OK " + results.length + "/" + checks.length + "\n");
