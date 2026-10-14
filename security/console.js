const API = '/api/security';
const BOOLEAN_METRICS = new Set(['connected', 'healthOk', 'builtInTestOk', 'signalAvailable', 'fixAvailable', 'spoofingDetected', 'jammingDetected']);
const METRIC_LIMITS = Object.freeze({loadAverage: [0, 10000], memoryPercent: [0, 100], cpuLoad: [0, 10000], memoryUsedBytes: [0, Number.MAX_SAFE_INTEGER], memoryTotalBytes: [1, Number.MAX_SAFE_INTEGER], uptimeSeconds: [0, Number.MAX_SAFE_INTEGER], sampleAgeSeconds: [0, 86400], packetLossPct: [0, 100], latencyMs: [0, 3600000], temperatureC: [-100, 200], serialBaud: [0, 10000000], supplyVoltage: [0, 1000], updateCount: [0, Number.MAX_SAFE_INTEGER]});
const PRIVATE_KEYS = /token|secret|credential|password|authorization|cookie|privatekey|prompt|latitude|longitude|coordinates|position|serialnumber|email|operator|hostname|address|privatecidr/i;
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

export class ConsoleError extends Error {
  constructor(code) { super(code); this.name = 'ConsoleError'; this.code = code; }
}

export function validateEndpoint(value, {trustedHttps = false} = {}) {
  if (typeof value !== 'string' || value !== value.trim() || !/^https?:\/\//.test(value)) throw new ConsoleError('invalid_origin');
  let parsed;
  try { parsed = new URL(value); } catch { throw new ConsoleError('invalid_origin'); }
  if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash || /[?#]/.test(value) || /[\\\s]/.test(value)) throw new ConsoleError('invalid_origin');
  // Avoid browser normalization of octal/short IPv4 and dot segments changing the trust boundary.
  const suppliedAuthority = value.slice(value.indexOf('://') + 3).replace(/\/$/, '');
  if (suppliedAuthority.toLowerCase() !== parsed.host.toLowerCase()) throw new ConsoleError('invalid_origin');
  if (parsed.protocol === 'http:' && !LOOPBACK.has(parsed.hostname)) throw new ConsoleError('https_required');
  if (parsed.protocol === 'https:' && !trustedHttps) throw new ConsoleError('origin_trust_required');
  return parsed.origin;
}

export function sanitizeExport(value, depth = 0) {
  if (depth > 16) return '[depth omitted]';
  if (Array.isArray(value)) return value.slice(0, 2000).map(item => sanitizeExport(item, depth + 1));
  if (value && typeof value === 'object') {
    const result = Object.create(null);
    for (const [key, item] of Object.entries(value)) {
      if (!PRIVATE_KEYS.test(key) && !['__proto__', 'constructor', 'prototype'].includes(key)) result[key] = sanitizeExport(item, depth + 1);
    }
    return result;
  }
  if (typeof value === 'string') {
    // Export known evidence fields, never URL credentials or bearer strings embedded in text.
    if (/Bearer\s+\S+|https?:\/\/[^\s/]*@|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value)) return '[private text omitted]';
    return value.slice(0, 8192);
  }
  return typeof value === 'number' && !Number.isFinite(value) ? null : value;
}

export function validateTelemetry(metrics, profileMetrics, profileLimits = {}) {
  if (!metrics || typeof metrics !== 'object' || Array.isArray(metrics) || Object.getPrototypeOf(metrics) !== Object.prototype) throw new ConsoleError('invalid_metrics');
  const allowed = new Set((profileMetrics || []).map(item => typeof item === 'string' ? item : item.name || item.key));
  const keys = Object.keys(metrics);
  if (!keys.length || keys.length > 20) throw new ConsoleError('invalid_metrics');
  for (const key of keys) {
    if (!allowed.has(key)) throw new ConsoleError('unsupported_metric');
    const value = metrics[key];
    if (BOOLEAN_METRICS.has(key)) {
      if (typeof value !== 'boolean') throw new ConsoleError('invalid_metrics');
    } else {
      const limits = METRIC_LIMITS[key];
      if (!limits || typeof value !== 'number' || !Number.isFinite(value) || value < limits[0] || value > limits[1]) throw new ConsoleError('invalid_metrics');
      if(key==='serialBaud'&&!Number.isInteger(value))throw new ConsoleError('invalid_metrics');
      // Vendor reference violations remain observable; the service labels them separately.
    }
  }
  return metrics;
}

export function canAction(state, action, {dnsConsent = false, copyConsent = false, credentialPresent = false} = {}) {
  if (action === 'copyCredential') return copyConsent && credentialPresent && !state.busy;
  if (action === 'dismissCredential') return credentialPresent;
  if (action === 'reloadCatalog') return !state.busy;
  if (action === 'connect') return !state.connected && !state.busy;
  if (action === 'disconnect') return state.connected || state.busy;
  if (!state.connected || state.busy) return false;
  if (action === 'dnsAudit') return dnsConsent;
  if (action === 'startAutomation') return state.status?.automation?.running === false;
  if (action === 'stopAutomation') return state.status?.automation?.running === true;
  return true;
}

export function createSecurityClient({fetchImpl = globalThis.fetch, cryptoImpl = globalThis.crypto, timeoutMs = 12000, now = () => new Date(), onState = () => {}} = {}) {
  let origin = '', adminToken = '', session = 0;
  const controllers = new Set();
  const state = {connected: false, busy: false, measuredAt: null, status: null, profiles: [], sources: [], devices: [], telemetry: null, receipts: null, vpn: null};
  const snapshot = () => structuredClone(state);
  const emit = () => onState(snapshot());

  function disconnect() {
    session++;
    adminToken = ''; origin = '';
    for (const controller of controllers) controller.abort();
    controllers.clear();
    Object.assign(state, {connected: false, busy: false, measuredAt: null, status: null, devices: [], telemetry: null, receipts: null, vpn: null});
    emit();
  }

  async function request(path, {method = 'GET', body, token = adminToken, expectedSession = session} = {}) {
    if (!origin || !token) throw new ConsoleError('not_connected');
    if (!/^\/api\/security\/[a-z0-9_\/-]+$/.test(path)) throw new ConsoleError('invalid_request');
    const headers = {Accept: 'application/json', Authorization: 'Bearer ' + token};
    if (method !== 'GET') {
      if (!cryptoImpl?.randomUUID) throw new ConsoleError('secure_browser_required');
      headers['Content-Type'] = 'application/json';
      headers['X-Cryptic-Request-Id'] = cryptoImpl.randomUUID();
      headers['X-Cryptic-Timestamp'] = now().toISOString();
    }
    const controller = new AbortController(); controllers.add(controller);
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(origin + path, {method, headers, ...(body !== undefined ? {body: JSON.stringify(body)} : {}), credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer', signal: controller.signal});
      if (session !== expectedSession) throw new ConsoleError('session_ended');
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw new ConsoleError('access_denied');
        if (response.status === 409) throw new ConsoleError('conflict');
        if (response.status === 429) throw new ConsoleError('rate_limited');
        if (response.status === 400 || response.status === 422) throw new ConsoleError('invalid_request');
        throw new ConsoleError('service_error');
      }
      const data = await response.json();
      if (data.ok !== true || session !== expectedSession) throw new ConsoleError('invalid_response');
      return data;
    } catch (error) {
      if (error instanceof ConsoleError) throw error;
      throw new ConsoleError(session !== expectedSession ? 'session_ended' : 'connection_failed');
    } finally { clearTimeout(timer); controllers.delete(controller); }
  }

  async function load(expectedSession = session) {
    const [status, profiles, devices, telemetry, receipts, vpn] = await Promise.all([
      request(API + '/status', {expectedSession}), request(API + '/profiles', {expectedSession}), request(API + '/devices', {expectedSession}), request(API + '/telemetry', {expectedSession}), request(API + '/receipts', {expectedSession}), request(API + '/vpn', {expectedSession})
    ]);
    if (session !== expectedSession) throw new ConsoleError('session_ended');
    if (!status.status || !Array.isArray(profiles.profiles) || !Array.isArray(devices.devices)) throw new ConsoleError('invalid_response');
    Object.assign(state, {connected: true, measuredAt: now().toISOString(), status: status.status, profiles: profiles.profiles, sources: profiles.sources || [], devices: devices.devices, telemetry, receipts, vpn: vpn.vpn});
    emit();
    return snapshot();
  }

  async function busy(operation) {
    if (state.busy) throw new ConsoleError('operation_busy');
    const expectedSession = session;
    state.busy = true; emit();
    try { return await operation(expectedSession); }
    finally { if (expectedSession === session) { state.busy = false; emit(); } }
  }

  async function connect(endpoint, token, options) {
    const validatedOrigin = validateEndpoint(endpoint, options);
    if (typeof token !== 'string' || !token.trim() || /[\r\n]/.test(token)) throw new ConsoleError('invalid_token');
    disconnect(); origin = validatedOrigin; adminToken = token.trim();
    return busy(async currentSession => {
      try { return await load(currentSession); }
      catch (error) { disconnect(); throw error; }
    });
  }

  const refresh = () => busy(currentSession => load(currentSession));
  async function mutate(path, body, {token, reload = true} = {}) {
    return busy(async currentSession => {
      const result = await request(API + path, {method: 'POST', body, ...(token ? {token} : {}), expectedSession: currentSession});
      if (reload) {
        try { await load(currentSession); }
        catch (error) {
          if (session !== currentSession) throw error;
          // Preserve a one-time registration credential even if the following status refresh fails.
          result.refreshFailed = true;
        }
      }
      return result;
    });
  }
  return {
    connect, disconnect, refresh, snapshot,
    setCatalog(profiles, sources) { state.profiles = profiles; state.sources = sources; emit(); },
    register: data => mutate('/devices', data),
    revoke: id => mutate('/devices/' + encodeURIComponent(id) + '/revoke', {}),
    ingest: (id, body, token) => mutate('/devices/' + encodeURIComponent(id) + '/telemetry', body, {token}),
    automation: (action, body = {}) => {
      if (!['start', 'stop', 'config'].includes(action)) throw new ConsoleError('invalid_request');
      return mutate('/automation/' + action, body);
    },
    audit: mode => {
      if (!['offline', 'dns'].includes(mode)) throw new ConsoleError('invalid_request');
      return mutate('/audit', {mode, ...(mode === 'dns' ? {networkConsent: true} : {})});
    },
    vpnPlan: body => mutate('/vpn/plan', body, {reload: false}),
    exportEvidence: () => busy(async () => sanitizeExport(await request(API + '/export')))
  };
}

const ERROR_COPY = {
  invalid_origin: 'Enter a complete service origin without credentials, path, query or fragment.',
  https_required: 'Use HTTPS for a remote service. HTTP is allowed only for localhost, 127.0.0.1 or [::1].',
  origin_trust_required: 'Review the HTTPS origin and select the trust checkbox before sending your credential.',
  invalid_token: 'Enter a valid operator credential.', access_denied: 'Access denied. Check the credential and the service origin allowlist; reconnect if needed.',
  conflict: 'The operation conflicts with existing state or was already processed. Refresh the evidence before retrying.',
  rate_limited: 'The service rate limit was reached. Wait before retrying.',
  invalid_request: 'The service rejected these parameters. Check the profile limits and operator configuration.',
  invalid_response: 'The service did not return the expected security API response.',
  connection_failed: 'Connection failed or timed out. Check that the service is running, allows this page origin and is reachable through your configured access route.',
  service_error: 'The service could not complete the request. Check its local logs.',
  invalid_metrics: 'Provide a nonempty JSON object of finite, bounded numbers or allowed booleans.',
  unsupported_metric: 'A metric is outside the selected device profile. Use only the displayed allowlist.',
  not_connected: 'Connect to an authenticated service first.', session_ended: 'The session ended. No pending operation was accepted by this page.',
  operation_busy: 'Wait for the current operation to complete.', secure_browser_required: 'This action requires a secure browser context supporting request IDs.',
  consent_required: 'Select the consent checkbox before this action.', clipboard_unavailable: 'Clipboard access is unavailable. Copy the displayed credential manually.',
  catalog_unavailable: 'The reviewed catalog could not be loaded. Reload it when the site is available.', invalid_device: 'Choose a registered, nonrevoked device.',
  invalid_time: 'Use a valid UTC ISO timestamp for the observation.', invalid_interval: 'Choose an interval of 5 to 3600 whole seconds.'
};

export function mount(root, {clientFactory = createSecurityClient, fetchImpl = globalThis.fetch} = {}) {
  if(globalThis.location?.hostname==='security.crypticnews.org'){const endpoint=root.querySelector('[name="endpoint"]');if(endpoint)endpoint.value=location.origin;}
  const view = key => root.querySelector('[data-view="' + key + '"]');
  const field = name => root.querySelector('[name="' + name + '"]');
  const text = (key, value) => { const el = view(key); if (el) el.textContent = String(value ?? '—'); };
  let poll = null, destroyed = false, observer = null;
  const message = (content, error = false) => { text('message', content); view('message').classList.toggle('error', error); };
  const clearCredential = () => { view('deviceToken').value = ''; view('handoff').hidden = true; view('copyConsent').checked = false; };
  const stopPolling = () => { if (poll !== null) clearInterval(poll); poll = null; };
  const client = clientFactory({fetchImpl, onState: render});

  function node(tag, content, className) {
    const el = document.createElement(tag);
    if (content !== undefined) el.textContent = String(content);
    if (className) el.className = className;
    return el;
  }
  function emptyRow(content) { const row = node('tr'); const cell = node('td', content); cell.colSpan = 4; row.append(cell); return row; }
  function option(value, label) { const el = node('option', label); el.value = value; return el; }

  function render(state) {
    if (destroyed) return;
    const connected = state.connected;
    text('connection', connected ? 'Authenticated' : state.busy ? 'Connecting…' : 'Disconnected');
    view('connection').classList.toggle('connected', connected);
    text('serviceStatus', connected ? 'Authenticated' : 'Disconnected');
    text('lastRefresh', state.measuredAt ? 'Measured ' + state.measuredAt : 'No measurement');
    text('deviceCount', connected ? state.devices.length : '—');
    text('automationStatus', !connected ? 'Unverified' : state.status?.automation?.running ? 'Running' : 'Stopped');
    text('automationDetail', connected ? 'Interval ' + (state.status?.automation?.intervalMs / 1000) + ' seconds; last run ' + (state.status?.automation?.lastRunAt || 'none') : 'No measurement');
    const vpn = state.vpn || state.status?.vpn;
    text('vpnStatus', connected ? vpn?.status || 'Unverified' : 'Unverified');
    if (connected) text('vpn', JSON.stringify(sanitizeExport(vpn || {status: 'unverified'}), null, 2));
    else text('vpn', 'VPN enforcement is unverified. Authenticate to load the service\'s measured access evidence.');
    for (const button of root.querySelectorAll('[data-action]')) button.disabled = !canAction(state, button.dataset.action, {dnsConsent: view('dnsConsent').checked, copyConsent: view('copyConsent').checked, credentialPresent: Boolean(view('deviceToken').value)});
    field('endpoint').disabled = connected || state.busy;
    field('adminToken').disabled = connected || state.busy;
    view('endpointTrust').disabled = connected || state.busy;
    if (!connected) stopPolling();

    const priorProfile = field('profileId').value;
    const profiles = state.profiles || [];
    field('profileId').replaceChildren(option('', 'Choose a reviewed document profile'), ...profiles.map(p => option(p.id, p.name || p.title || p.id)));
    if (profiles.some(p => p.id === priorProfile)) field('profileId').value = priorProfile;
    const priorDevice = field('telemetryDeviceId').value;
    const activeDevices = state.devices.filter(d => !d.revokedAt && d.status !== 'revoked');
    field('telemetryDeviceId').replaceChildren(option('', connected ? 'Choose a registered device' : 'Connect to select a device'), ...activeDevices.map(d => option(d.id, d.name + ' / ' + d.id)));
    if (activeDevices.some(d => d.id === priorDevice)) field('telemetryDeviceId').value = priorDevice;
    renderMetricHelp(state);
    const rows = state.devices.map(d => {
      const row = node('tr'), name = node('td', d.name); name.append(node('small', d.id));
      const evidence = node('td', d.status); evidence.append(node('small', 'Last sample: ' + (d.lastSeenAt || 'none')));
      const control = node('td'), revoke = node('button', 'Revoke'); revoke.type = 'button'; revoke.dataset.action = 'revoke'; revoke.dataset.deviceId = d.id; revoke.disabled = !connected || state.busy || Boolean(d.revokedAt) || d.status === 'revoked'; control.append(revoke);
      row.append(name, node('td', d.profileId), evidence, control); return row;
    });
    view('devices').replaceChildren(...(rows.length ? rows : [emptyRow(connected ? 'No devices registered. Register an explicitly reviewed profile above.' : 'Connect to view registered devices.')]));
    if (connected) {
      const samples = state.telemetry?.samples || [];
      text('telemetry', JSON.stringify({host: state.telemetry?.host || null, latestDeviceSamples: samples.slice(-5)}, null, 2));
      text('audit', state.status?.latestAudit ? JSON.stringify(sanitizeExport(state.status.latestAudit), null, 2) : 'No audit results have been recorded.');
      text('receipts', JSON.stringify({receiptCount: state.receipts?.receipts?.length || 0, latest: state.receipts?.receipts?.slice(-1)[0] || null, anchor: state.receipts?.anchor || null}, null, 2));
    } else {
      text('telemetry', 'No telemetry evidence loaded.'); text('audit', 'No audit results loaded.'); text('receipts', 'No receipt anchor loaded. A hash chain needs a separately retained trusted anchor.');
    }
    renderCatalog(state.profiles, state.sources);
  }

  function renderMetricHelp(state = client.snapshot()) {
    const device = state.devices.find(d => d.id === field('telemetryDeviceId').value);
    const profile = state.profiles.find(p => p.id === device?.profileId);
    const metrics = (profile?.metrics || profile?.metricKeys || []).map(m => typeof m === 'string' ? m : m.name || m.key).filter(Boolean);
    text('metricHelp', metrics.length ? 'Allowed metrics: ' + metrics.join(', ') + '. Submit only measurements your agent actually observed.' : 'Select a device to view its profile\'s allowed metric names.');
  }

  function renderCatalog(profiles = [], sources = []) {
    const cards = profiles.map(p => {
      const card = node('article', undefined, 'catalog-card');
      card.append(node('h3', p.name || p.title || p.id), node('p', 'Profile: ' + p.id + ' · ' + (p.kind || 'reviewed derivative')), node('p', 'Interfaces: ' + (p.interfaces || []).map(i => typeof i === 'string' ? i : JSON.stringify(i)).join(', ')));
      const list = node('ul');
      const limits = Array.isArray(p.limits) ? p.limits : Object.entries(p.limits || {}).map(([key, limit]) => key + ': ' + JSON.stringify(limit));
      for (const limit of limits) list.append(node('li', typeof limit === 'string' ? limit : JSON.stringify(limit)));
      card.append(node('p', 'Metric allowlist: ' + (p.metrics || p.metricKeys || []).map(m => typeof m === 'string' ? m : m.name || m.key).join(', ')), list, node('code', 'Source SHA-256: ' + (p.sourceSha256 || 'unavailable')));
      if (p.runtimeControls) card.append(node('p', 'Runtime controls: ' + JSON.stringify(p.runtimeControls)));
      return card;
    });
    view('profiles').replaceChildren(...(cards.length ? cards : [node('p', 'No reviewed profile catalog loaded.')]));
    const sourceCards = sources.map(s => {
      const detail = node('details', undefined, 'source-card'); detail.append(node('summary', s.title || s.id), node('p', 'SHA-256: ' + s.sha256), node('p', 'Verification: ' + JSON.stringify(s.verification || {})));
      const evidence = node('dl');
      for (const e of s.evidence || []) {
        evidence.append(node('dt', e.location), node('dd', 'Supplied claim: ' + e.suppliedClaim), node('dd', 'Integration use: ' + e.integrationUse), node('dd', 'Limits: ' + e.limits));
      }
      detail.append(evidence); return detail;
    });
    view('sources').replaceChildren(...(sourceCards.length ? sourceCards : [node('p', 'No source fingerprints loaded.')]));
  }

  async function loadCatalog() {
    const [profileResponse, sourceResponse] = await Promise.all([
      fetchImpl(new URL('../config/device-profiles.public.json', import.meta.url), {cache: 'no-store', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer'}),
      fetchImpl(new URL('../config/document-provenance.public.json', import.meta.url), {cache: 'no-store', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer'})
    ]);
    if (!profileResponse.ok || !sourceResponse.ok) throw new ConsoleError('catalog_unavailable');
    const [profiles, sources] = await Promise.all([profileResponse.json(), sourceResponse.json()]);
    if (!Array.isArray(profiles.profiles) || !Array.isArray(sources.sources)) throw new ConsoleError('catalog_unavailable');
    if (!client.snapshot().connected && !destroyed) client.setCatalog(profiles.profiles, sources.sources);
  }

  function startPolling() {
    stopPolling();
    poll = setInterval(async () => {
      if (destroyed || !client.snapshot().connected || client.snapshot().busy || document.visibilityState === 'hidden') return;
      try { await client.refresh(); } catch (error) { message(ERROR_COPY[error.code] || ERROR_COPY.connection_failed, true); }
    }, 10000);
  }
  function selectedDevice() {
    const state = client.snapshot();
    const device = state.devices.find(d => d.id === field('telemetryDeviceId').value && !d.revokedAt && d.status !== 'revoked');
    if (!device) throw new ConsoleError('invalid_device');
    return {device, profile: state.profiles.find(p => p.id === device.profileId)};
  }

  const actions = {
    async connect() {
      const token = field('adminToken').value; field('adminToken').value = ''; clearCredential();
      await client.connect(field('endpoint').value, token, {trustedHttps: view('endpointTrust').checked});
      startPolling(); message('Authenticated service evidence loaded. Browser polling runs every 10 seconds while this page is visible.');
    },
    disconnect() {
      stopPolling(); client.disconnect(); clearCredential(); field('adminToken').value = ''; field('deviceCredential').value = ''; view('vpnPlan').hidden = true; view('vpnPlan').textContent = ''; render(client.snapshot()); message('Disconnected. Credentials were cleared and browser polling stopped.');
    },
    async refresh() { await client.refresh(); message('Authenticated evidence refreshed.'); },
    async register() {
      if (!field('reviewed').checked) throw new ConsoleError('consent_required');
      clearCredential();
      const response = await client.register({id: field('deviceId').value, name: field('deviceName').value, profileId: field('profileId').value, reviewed: true});
      if (!response.deviceToken || typeof response.deviceToken !== 'string') throw new ConsoleError('invalid_response');
      view('deviceToken').value = response.deviceToken; view('handoff').hidden = false; render(client.snapshot());
      message('Device registered. Save the displayed one-time credential. This registration does not prove a physical receiver connection.');
    },
    async revoke(button) { await client.revoke(button.dataset.deviceId); clearCredential(); field('deviceCredential').value = ''; render(client.snapshot()); message('Device credential revoked by the authenticated service.'); },
    async telemetry() {
      const {device, profile} = selectedDevice();
      let metrics;
      try { metrics = JSON.parse(field('metrics').value); } catch { throw new ConsoleError('invalid_metrics'); }
      validateTelemetry(metrics, profile?.metrics || profile?.metricKeys, profile?.limits);
      const rawTime = field('observedAt').value.trim(), observedAt = rawTime || new Date().toISOString();
      if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(observedAt) || !Number.isFinite(Date.parse(observedAt))) throw new ConsoleError('invalid_time');
      const token = field('deviceCredential').value; field('deviceCredential').value = '';
      if (token.trim().length<32) throw new ConsoleError('invalid_token');
      await client.ingest(device.id, {observedAt, metrics}, token);
      message('The authenticated service accepted this device-bound telemetry sample.');
    },
    async configureAutomation() {
      const seconds = Number(field('intervalSeconds').value);
      if (!Number.isInteger(seconds) || seconds < 5 || seconds > 3600) throw new ConsoleError('invalid_interval');
      await client.automation('config', {intervalMs: seconds * 1000}); message('The service saved the monitoring interval.');
    },
    async startAutomation() { await client.automation('start'); message('The authenticated service started its owned monitoring loop.'); },
    async stopAutomation() { await client.automation('stop'); message('The authenticated service stopped its owned monitoring loop.'); },
    async offlineAudit() { await client.audit('offline'); message('Offline evidence audit complete. Review the recorded findings and limits.'); },
    async dnsAudit() {
      if (!view('dnsConsent').checked) throw new ConsoleError('consent_required');
      await client.audit('dns'); message('Public DNS observation complete. Review findings; network evidence does not establish VPN enforcement.');
    },
    async export() {
      const evidence = await client.exportEvidence();
      const objectUrl = URL.createObjectURL(new Blob([JSON.stringify(evidence, null, 2)], {type: 'application/json'}));
      const link = node('a'); link.href = objectUrl; link.download = 'cryptic-security-evidence-' + new Date().toISOString().slice(0, 10) + '.json'; root.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      message('Sanitized evidence exported. Retain its receipt anchor separately for later verification.');
    },
    async copyCredential() {
      if (!view('copyConsent').checked) throw new ConsoleError('consent_required');
      if (!globalThis.navigator?.clipboard?.writeText) throw new ConsoleError('clipboard_unavailable');
      await navigator.clipboard.writeText(view('deviceToken').value); message('Device credential copied with your consent. Clear it from the page after storing it securely.');
    },
    dismissCredential() { clearCredential(); render(client.snapshot()); message('One-time credential cleared from this page.'); },
    async reloadCatalog() { await loadCatalog(); message('Reviewed public catalog reloaded.'); },
    async vpnPlan() {
      const target = field('vpnTarget').value.trim();
      const operators = field('vpnOperators').value.split(',').map(value => value.trim()).filter(Boolean);
      const response = await client.vpnPlan({provider: field('vpnProvider').value, ...(target.includes('/')?{cidr:target}:{hostname:target}), operators});
      view('vpnPlan').hidden = false; text('vpnPlan', JSON.stringify(response.plan || response, null, 2));
      message('VPN configuration plan created for operator review. No tunnel, client or access policy was deployed.');
    }
  };

  async function run(action, button) {
    if (destroyed || !actions[action] || !canAction(client.snapshot(), action, {dnsConsent: view('dnsConsent').checked, copyConsent: view('copyConsent').checked, credentialPresent: Boolean(view('deviceToken').value)})) return;
    try { await actions[action](button); }
    catch (error) { message(ERROR_COPY[error.code] || 'The action could not be completed. Review the local service configuration.', true); }
    render(client.snapshot());
  }
  const click = event => {
    const button = event.target.closest('[data-action]');
    if (!button || !root.contains(button) || button.type === 'submit') return;
    run(button.dataset.action, button);
  };
  const submit = event => {
    if (!event.target.matches('[data-form]')) return;
    event.preventDefault();
    const button = event.target.querySelector('button[type="submit"]');
    if (event.target.reportValidity()) run(button.dataset.action, button);
  };
  const change = event => {
    if (event.target === view('copyConsent') || event.target === view('dnsConsent')) render(client.snapshot());
    if (event.target === field('telemetryDeviceId')) renderMetricHelp();
    if (event.target === field('endpoint')) view('endpointTrust').checked = false;
  };
  function destroy() {
    if (destroyed) return;
    stopPolling(); client.disconnect(); clearCredential(); field('adminToken').value = ''; field('deviceCredential').value = ''; view('vpnPlan').textContent = '';
    destroyed = true; root.removeEventListener('click', click); root.removeEventListener('submit', submit); root.removeEventListener('change', change); observer?.disconnect(); globalThis.removeEventListener?.('pagehide', destroy);
  }
  root.addEventListener('click', click); root.addEventListener('submit', submit); root.addEventListener('change', change);
  globalThis.addEventListener?.('pagehide', destroy, {once: true});
  if (globalThis.MutationObserver) { observer = new MutationObserver(() => { if (!root.isConnected) destroy(); }); observer.observe(document.body, {childList: true, subtree: true}); }
  render(client.snapshot());
  loadCatalog().catch(() => { if (!destroyed && !client.snapshot().connected) message(ERROR_COPY.catalog_unavailable, true); });
  return {destroy, client, run};
}

if (typeof document !== 'undefined') {
  const root = document.querySelector('#securityConsole');
  if (root) mount(root);
}
