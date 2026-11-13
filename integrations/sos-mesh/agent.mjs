import { createHmac, randomBytes } from "node:crypto";
const base = (process.env.CRYPTIC_MESH_URL || "").replace(/\/+$/, "");
const secret = process.env.CRYPTIC_MESH_AGENT_SECRET || "";
const interval = Math.max(2000, Number(process.env.CRYPTIC_MESH_POLL_MS || 5000));
if (!/^https:\/\//.test(base) || Buffer.byteLength(secret) < 32) {
  console.error("Set CRYPTIC_MESH_URL (HTTPS) and a 32+ byte CRYPTIC_MESH_AGENT_SECRET.");
  process.exit(2);
}
const actions = Object.freeze({
  "nexus.health": async () => ({ ok: true, node: process.env.CRYPTIC_MESH_AGENT_ID || "nexus-local", at: new Date().toISOString() }),
  "nexus.echo": async args => ({ echo: args ?? null }),
  "sos.mesh.status": async () => ({ agent: "online", allowlisted_actions: ["nexus.health", "nexus.echo", "sos.mesh.status"] })
});
async function signedPost(path, body) {
  const raw = JSON.stringify(body ?? {});
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomBytes(18).toString("base64url");
  const signature = createHmac("sha256", secret).update(timestamp + "." + nonce + "." + raw).digest("base64url");
  const response = await fetch(base + path, {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(10000),
    headers: { "content-type": "application/json", "X-Cryptic-Agent-Time": timestamp, "X-Cryptic-Agent-Nonce": nonce, "X-Cryptic-Agent-Signature": signature },
    body: raw
  });
  if (!response.ok) throw new Error("gateway_http_" + response.status);
  return response.json();
}
async function cycle() {
  try {
    const data = await signedPost("/v1/mesh/agent/poll", {});
    const job = data.job;
    if (!job) return;
    if (job.version !== "cryptic-mesh/1" || job.expires_at <= Math.floor(Date.now() / 1000) || job.hop_count > job.max_hops) {
      await signedPost("/v1/mesh/agent/result", { message_id: job.message_id, status: "failed", result: { error: "invalid_or_expired_envelope" } });
      return;
    }
    const handler = actions[job.payload?.action];
    if (!handler) {
      await signedPost("/v1/mesh/agent/result", { message_id: job.message_id, status: "failed", result: { error: "action_not_allowlisted" } });
      return;
    }
    try {
      const result = await handler(job.payload.arguments);
      await signedPost("/v1/mesh/agent/result", { message_id: job.message_id, status: "completed", result });
    } catch (error) {
      await signedPost("/v1/mesh/agent/result", { message_id: job.message_id, status: "failed", result: { error: String(error?.message || "action_failed") } });
    }
  } catch (error) {
    console.error(new Date().toISOString(), String(error?.message || error));
  }
}
console.log("CRYPTIC ↔ NEXUS mesh agent online; allowlisted actions only.");
for (;;) {
  await cycle();
  await new Promise(resolve => setTimeout(resolve, interval));
}
