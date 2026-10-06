(() => {
  'use strict';

  const VERSION = '0.7.0';
  const DATA_KEY = 'cryptic.telemetry.v1';
  const SESSION_KEY = 'cryptic.telemetry.session';
  const MAX_ROWS = 200;
  const state = {
    started: false,
    lcp: 0,
    cls: 0,
    inp: 0,
    longTasks: 0,
    errorCount: 0,
    rejectionCount: 0,
    observers: []
  };

  const round = n => Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
  const cleanPath = (u) => {
    try {
      const x = new URL(u, location.href);
      return x.origin === location.origin ? x.pathname : x.origin;
    } catch {
      return '';
    }
  };
  const getSession = () => {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  };
  const safeBrands = () => {
    const d = navigator.userAgentData;
    if (!d?.brands) return [];
    return d.brands
      .filter(x => !/Not.A.Brand/i.test(x.brand))
      .map(x => ({ brand: x.brand, version: String(x.version).split('.')[0] }))
      .slice(0, 4);
  };

  function observe(type, handler) {
    if (!('PerformanceObserver' in window)) return;
    if (!PerformanceObserver.supportedEntryTypes?.includes(type)) return;
    try {
      const o = new PerformanceObserver(list => handler(list.getEntries()));
      o.observe({ type, buffered: true });
      state.observers.push(o);
    } catch {}
  }

  function start() {
    if (state.started) return true;
    state.started = true;

    observe('largest-contentful-paint', entries => {
      const e = entries.at(-1);
      if (e) state.lcp = Math.max(state.lcp, Number(e.startTime || 0));
    });
    observe('layout-shift', entries => {
      for (const e of entries) {
        if (!e.hadRecentInput) state.cls += Number(e.value || 0);
      }
    });
    observe('event', entries => {
      for (const e of entries) {
        const d = Number(e.duration || 0);
        if (d > state.inp) state.inp = d;
      }
    });
    observe('longtask', entries => {
      state.longTasks += entries.length;
    });

    window.addEventListener('error', () => state.errorCount++, { capture: true });
    window.addEventListener('unhandledrejection', () => state.rejectionCount++);

    return true;
  }

  function resourceSummary() {
    const entries = performance.getEntriesByType('resource');
    const byType = {};
    let transferBytes = 0;
    const slow = [];

    for (const e of entries) {
      const type = e.initiatorType || 'other';
      if (!byType[type]) byType[type] = { count: 0, duration_ms: 0, transfer_bytes: 0 };
      byType[type].count++;
      byType[type].duration_ms += Number(e.duration || 0);
      byType[type].transfer_bytes += Number(e.transferSize || 0);
      transferBytes += Number(e.transferSize || 0);

      try {
        const u = new URL(e.name, location.href);
        if (u.origin === location.origin) {
          slow.push({ path: u.pathname, duration_ms: round(e.duration) });
        }
      } catch {}
    }

    for (const v of Object.values(byType)) {
      v.duration_ms = round(v.duration_ms);
    }

    slow.sort((a,b) => (b.duration_ms || 0) - (a.duration_ms || 0));

    return {
      count: entries.length,
      transfer_bytes: transferBytes,
      by_type: byType,
      slowest_same_origin: slow.slice(0, 10)
    };
  }

  function navMetrics() {
    const n = performance.getEntriesByType('navigation')[0];
    if (!n) return null;
    return {
      type: n.type || null,
      dns_ms: round(n.domainLookupEnd - n.domainLookupStart),
      connect_ms: round(n.connectEnd - n.connectStart),
      tls_ms: n.secureConnectionStart > 0 ? round(n.connectEnd - n.secureConnectionStart) : 0,
      ttfb_ms: round(n.responseStart - n.requestStart),
      response_ms: round(n.responseEnd - n.responseStart),
      dom_interactive_ms: round(n.domInteractive),
      dom_content_loaded_ms: round(n.domContentLoadedEventEnd),
      load_ms: round(n.loadEventEnd || n.duration),
      total_ms: round(n.duration),
      transfer_bytes: Number(n.transferSize || 0)
    };
  }

  function connectionInfo() {
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!c) return null;
    return {
      effective_type: c.effectiveType || null,
      downlink_mbps: round(Number(c.downlink)),
      rtt_ms: Number.isFinite(c.rtt) ? c.rtt : null,
      save_data: Boolean(c.saveData)
    };
  }

  function snapshot(label='manual') {
    start();
    const row = {
      schema: 'cryptic.browser.telemetry.v1',
      version: VERSION,
      id: crypto.randomUUID(),
      session_id: getSession(),
      captured_at: new Date().toISOString(),
      label: String(label).slice(0, 120),
      page: {
        origin: location.origin,
        path: location.pathname,
        title: document.title.slice(0, 160),
        visibility: document.visibilityState
      },
      browser: {
        brands: safeBrands(),
        platform: navigator.userAgentData?.platform || navigator.platform || 'unknown',
        language: navigator.language || null,
        hardware_concurrency: Number(navigator.hardwareConcurrency || 0) || null,
        device_memory_gb: Number(navigator.deviceMemory || 0) || null
      },
      display: {
        viewport_w: innerWidth,
        viewport_h: innerHeight,
        screen_w: screen.width,
        screen_h: screen.height,
        dpr: devicePixelRatio || 1
      },
      network: connectionInfo(),
      timing: navMetrics(),
      web_vitals: {
        lcp_ms: round(state.lcp),
        cls: round(state.cls),
        inp_ms: round(state.inp),
        long_tasks: state.longTasks
      },
      runtime: {
        errors: state.errorCount,
        unhandled_rejections: state.rejectionCount,
        online: navigator.onLine
      },
      resources: resourceSummary(),
      supported_performance_entries: globalThis.PerformanceObserver?.supportedEntryTypes || []
    };

    persist(row);
    return row;
  }

  function rows() {
    try {
      const v = JSON.parse(localStorage.getItem(DATA_KEY) || '[]');
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }

  function persist(row) {
    const data = rows();
    data.push(row);
    if (data.length > MAX_ROWS) data.splice(0, data.length - MAX_ROWS);
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
    return row;
  }

  function clear() {
    localStorage.removeItem(DATA_KEY);
    return true;
  }

  function summary() {
    const data = rows();
    const latest = data.at(-1) || null;
    return {
      rows: data.length,
      session_id: getSession(),
      latest,
      storage: 'localStorage',
      remote_send: 'explicit only'
    };
  }

  function download() {
    const blob = new Blob([JSON.stringify({
      schema: 'cryptic.browser.telemetry.export.v1',
      exported_at: new Date().toISOString(),
      rows: rows()
    }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cryptic-browser-telemetry-' + new Date().toISOString().replace(/[:.]/g,'-') + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    return a.download;
  }

  async function send(label='console') {
    const row = snapshot(label);
    if (!window.CrypticBus?.aggregate) {
      return { ok: false, local: true, reason: 'CrypticBus is not loaded', row };
    }

    const routed = await window.CrypticBus.aggregate(
      'telemetry.snapshot',
      { snapshot: row },
      {
        target: 'telemetry',
        route: ['loopback','broadcast','localhost','edge']
      }
    );

    const accepted = routed.receipts.filter(r => r.ok);
    window.CrypticTerminal?.ledger?.('telemetry.routed', {
      session_id: row.session_id,
      message_id: routed.message.id,
      accepted: accepted.map(r => r.transport)
    });

    return {
      ok: accepted.length > 0,
      message_id: routed.message.id,
      receipts: routed.receipts,
      row
    };
  }

  async function exec(command) {
    if (!window.CrypticTerminal?.exec) {
      throw new Error('Cryptic terminal runtime is not mounted on this page.');
    }
    return window.CrypticTerminal.exec(String(command));
  }

  function commandUrl(command, opts={}) {
    const u = new URL('./terminal/', location.href);
    u.searchParams.set('cmd', String(command));
    if (opts.autorun) u.searchParams.set('autorun', '1');
    return u.href;
  }

  function openCommand(command, opts={}) {
    const url = commandUrl(command, opts);
    window.open(url, '_blank', 'noopener');
    return url;
  }

  async function handleDeepLink() {
    const p = new URLSearchParams(location.search);
    const command = p.get('cmd');
    if (!command) return;

    const autorun = p.get('autorun') === '1';
    const safe = /^(help|about|status|nodes|tokens|ledger|telemetry(?:\s+(?:snapshot|summary))?)$/i.test(command.trim());

    sessionStorage.setItem('cryptic.pending.command', command);

    if (autorun && safe) {
      const run = () => {
        const c = sessionStorage.getItem('cryptic.pending.command');
        if (!c || !window.CrypticTerminal?.exec) return;
        sessionStorage.removeItem('cryptic.pending.command');
        window.CrypticTerminal.exec(c);
      };
      if (document.getElementById('gate')?.style.display === 'none') run();
      else window.addEventListener('cryptic:guardian-entered', run, { once: true });
    } else {
      window.CrypticTerminal?.out?.('URL command queued: ' + command + '. Enter the Guardian gate, then run it explicitly unless it is a safe autorun command.', 'warn');
    }
  }

  window.CrypticConsole = Object.freeze({
    version: VERSION,
    exec,
    url: commandUrl,
    open: openCommand,
    telemetry: Object.freeze({
      start,
      snapshot,
      rows,
      summary,
      clear,
      export: download,
      send
    })
  });

  start();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleDeepLink, { once: true });
  } else {
    handleDeepLink();
  }

  console.info(
    '%cCRYPTIC CONSOLE v' + VERSION,
    'color:#42f5ff;background:#03050a;padding:4px 8px;border:1px solid #42f5ff',
    '\nCrypticConsole.exec("status")',
    '\nCrypticConsole.telemetry.snapshot()',
    '\nawait CrypticConsole.telemetry.send("manual")',
    '\nCrypticConsole.url("nodes",{autorun:true})'
  );
})();
