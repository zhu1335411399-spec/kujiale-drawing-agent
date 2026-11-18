import { pageRole } from './pages.js';

// Extension-session storage survives page reloads and service-worker restarts.
// No cookies, request headers, arbitrary URLs, replay, or website writes.
export function createCaptureStore(api, now = () => Date.now()) {
  const prefix = 'drawingCaptureV2:', alarm = 'drawingCaptureExpiryV2';
  const maxBytes = 80000, ttl = 600000;
  let queue = Promise.resolve();
  const serial = fn => { const next = queue.then(fn); queue = next.catch(() => {}); return next; };
  const key = id => prefix + id;
  const read = async id => (await api.storage.session.get(key(id)))[key(id)];
  const clean = (v, depth = 0) => {
    if (depth > 8) return '[depth limit]';
    if (Array.isArray(v)) return v.slice(0, 100).map(x => clean(x, depth + 1));
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).slice(0, 120).map(([k, x]) => [k, /token|cookie|authorization|password|secret|session/i.test(k) ? '[redacted]' : clean(x, depth + 1)]));
    return v;
  };
  const body = text => {
    if (typeof text !== 'string') return { captured: false, format: 'unavailable' };
    if (text.length > 16000) return { captured: false, format: 'oversize', characters: text.length };
    try { return { captured: true, format: 'json', value: clean(JSON.parse(text)) }; }
    catch { return { captured: false, format: 'encoded-or-text', characters: text.length }; }
  };
  const save = async (id, state) => {
    while (state.records.length > 20 || new TextEncoder().encode(JSON.stringify(state)).length > maxBytes) {
      if (!state.records.length) break;
      state.records.shift(); state.dropped++;
    }
    await api.storage.session.set({ [key(id)]: state });
  };
  const finish = async (id, state, reason) => {
    state.active = false; state.stopReason = reason; state.stoppedAt = now();
    for (const r of state.records) if (r.status === 'pending' || !r.responseBody) r.incomplete = true;
    await save(id, state);
    try { await api.debugger.detach({ tabId: id }); } catch { /* Already detached. */ }
    return state;
  };
  const view = s => ({ build: 'network-capture-2', active: !!s?.active, startedAt: s?.startedAt,
    expiresAt: s?.expiresAt, stopReason: s?.stopReason, error: s?.error,
    records: s?.records || [], totalBuffered: s?.records.length || 0, dropped: s?.dropped || 0,
    replayed: false, saved: false, published: false,
    limitation: 'Known same-origin drawing API paths only. Refresh and worker restart retain records; browser restart or extension reload clears them. Encoded, binary and oversized bodies remain unparsed. DevTools may detach capture.' });
  const expire = async (id, state) => state?.active && now() >= state.expiresAt ? finish(id, state, 'expired') : state;
  async function action(id, action) {
    if (!Number.isInteger(id) || !['start','read','stop','clear'].includes(action)) throw new Error('Invalid capture action');
    let state = await expire(id, await read(id));
    if (action === 'start') {
      const tab = await api.tabs.get(id);
      if (pageRole(tab.url) !== 'config') throw new Error('Not a configuration page');
      if (state?.active) return view(state);
      // Keep earlier records until explicitly cleared, including after refresh.
      state = { records: state?.records || [], dropped: state?.dropped || 0,
        origin: new URL(tab.url).origin, active: false, startedAt: now(), expiresAt: now() + ttl };
      await save(id, state);
      let attached = false;
      try {
        await api.debugger.attach({ tabId: id }, '1.3'); attached = true;
        await api.debugger.sendCommand({ tabId: id }, 'Network.enable', { maxPostDataSize: 16000, maxResourceBufferSize: 65536, maxTotalBufferSize: 1048576 });
        state.active = true; await save(id, state);
        await api.alarms.create(alarm, { periodInMinutes: 0.5 });
      } catch (e) {
        state.error = e.message; state.stopReason = 'attach-failed'; await save(id, state);
        if (attached) try { await api.debugger.detach({ tabId: id }); } catch {}
      }
    } else if (action === 'stop' || action === 'clear') {
      if (state?.active) state = await finish(id, state, 'user');
      if (action === 'clear') { await api.storage.session.remove(key(id)); state = undefined; }
    }
    return view(state);
  }
  async function event(source, method, params) {
    const id = source.tabId;
    if (!Number.isInteger(id)) return;
    const state = await expire(id, await read(id));
    if (!state?.active) return;
    const p = params;
    if (method === 'Network.requestWillBeSent') {
      let u; try { u = new URL(p.request.url); } catch { return; }
      if (u.origin !== state.origin || !/^\/(construction-cms\/api|dcs-drawing\/site\/api)\//.test(u.pathname)) return;
      // Redirects have another entry, never silently overwrite evidence.
      state.records.push({ id: p.requestId, at: now(), document: p.loaderId,
        method: p.request.method, path: u.pathname, query: clean(Object.fromEntries(u.searchParams)),
        requestBody: p.request.hasPostData || p.request.postData !== undefined ? body(p.request.postData) : null, status: 'pending' });
    } else {
      const r = [...state.records].reverse().find(x => x.id === p.requestId);
      if (!r) return;
      if (method === 'Network.responseReceived') {
        r.status = p.response.status; r.contentType = p.response.mimeType;
        const h = p.response.headers || {};
        const length = Object.entries(h).find(([k]) => k.toLowerCase() === 'content-length')?.[1];
        if (Number(length) > 16000) r.oversize = true;
      } else if (method === 'Network.loadingFinished') {
        if (r.oversize || p.encodedDataLength > 65536) r.responseBody = { captured: false, format: 'oversize' };
        else {
          try {
            const value = await api.debugger.sendCommand({ tabId: id }, 'Network.getResponseBody', { requestId: p.requestId });
            r.responseBody = value.base64Encoded ? { captured: false, format: 'binary' } : body(value.body);
          } catch { r.responseBody = { captured: false, format: 'unavailable' }; }
        }
      } else if (method === 'Network.loadingFailed') { r.status = 'network-error'; r.incomplete = true; }
      else return;
    }
    await save(id, state);
  }
  // Register synchronously on every service-worker start.
  api.debugger.onEvent.addListener((s, m, p) => { void serial(() => event(s,m,p)); });
  api.debugger.onDetach.addListener((s, reason) => { void serial(async () => {
    const state = await read(s.tabId);
    if (state?.active) { state.active = false; state.stopReason = 'detached:' + reason; await save(s.tabId, state); }
  }); });
  api.alarms.onAlarm.addListener(a => { if (a.name === alarm) void serial(async () => {
    const states = await api.storage.session.get(null);
    for (const [k,s] of Object.entries(states)) if (k.startsWith(prefix)) await expire(Number(k.slice(prefix.length)),s);
  }); });
  api.tabs.onUpdated.addListener((id, change) => { if (change.url && pageRole(change.url) !== 'config') void serial(async () => {
    const state = await read(id); if (state?.active) await finish(id,state,'left-configuration-page');
  }); });
  api.tabs.onRemoved.addListener(id => { void serial(async () => {
    const state = await read(id); if (state?.active) { state.active = false; state.stopReason = 'tab-closed'; await save(id,state); }
  }); });
  return { action: (id, a) => serial(() => action(id,a)), idle: () => queue };
}
