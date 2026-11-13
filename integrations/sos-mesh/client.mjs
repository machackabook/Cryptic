// Browser-safe client: holds short-lived bridge credentials in memory only.
export function createCrypticMeshClient({ baseUrl, getGoogleIdToken, getPortalIdToken, fetchImpl = fetch }) {
  if (!baseUrl || !/^https:\/\//.test(baseUrl)) throw new Error("baseUrl must be HTTPS");
  if (typeof getGoogleIdToken !== "function" || typeof getPortalIdToken !== "function") throw new Error("identity token providers are required");
  let accessToken = null;
  let expiresAt = 0;
  const endpoint = path => baseUrl.replace(/\/+$/, "") + path;
  const tokenExpiry = token => {
    try { return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).exp || 0; }
    catch { return 0; }
  };
  async function connect() {
    const [google_id_token, portal_id_token] = await Promise.all([getGoogleIdToken(), getPortalIdToken()]);
    const response = await fetchImpl(endpoint("/v1/mesh/auth/exchange"), {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ google_id_token, portal_id_token }), redirect: "error"
    });
    if (!response.ok) throw new Error("Cryptic mesh authentication rejected: HTTP " + response.status);
    const data = await response.json();
    accessToken = data.access_token;
    expiresAt = tokenExpiry(accessToken);
    if (!accessToken || !expiresAt) throw new Error("Gateway returned an invalid access token");
    return { connected: true, expiresAt, scope: data.scope };
  }
  async function ensureToken() {
    if (!accessToken) await connect();
    if (expiresAt - Math.floor(Date.now() / 1000) < 90) {
      const response = await fetchImpl(endpoint("/v1/mesh/auth/rotate"), {
        method: "POST", headers: { authorization: "Bearer " + accessToken }, redirect: "error"
      });
      if (!response.ok) { accessToken = null; expiresAt = 0; await connect(); return; }
      const data = await response.json();
      accessToken = data.access_token;
      expiresAt = tokenExpiry(accessToken);
    }
  }
  async function request(path, options = {}) {
    await ensureToken();
    const response = await fetchImpl(endpoint(path), {
      ...options,
      headers: { ...(options.headers || {}), authorization: "Bearer " + accessToken },
      redirect: "error", cache: "no-store"
    });
    if (!response.ok) throw new Error("Cryptic mesh request failed: HTTP " + response.status);
    return response.status === 204 ? null : response.json();
  }
  return Object.freeze({
    connect,
    dispatch: (action, args = {}, correlation_id) => request("/v1/mesh/dispatch", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, arguments: args, correlation_id })
    }),
    jobs: () => request("/v1/mesh/jobs"),
    status: () => request("/v1/mesh/portal/status"),
    revoke: async () => {
      if (!accessToken) return { revoked: false };
      const result = await request("/v1/mesh/auth/revoke", { method: "POST" });
      accessToken = null; expiresAt = 0;
      return result;
    },
    // CrypticBus transport adapter. Receipts report gateway acceptance, not remote completion.
    transport: () => ({
      name: "cryptic-sos-mesh",
      send: async (kind, payload) => {
        const accepted = await request("/v1/mesh/dispatch", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: kind, arguments: payload })
        });
        return { accepted: true, remoteExecution: "pending", receipt: accepted };
      }
    })
  });
}
