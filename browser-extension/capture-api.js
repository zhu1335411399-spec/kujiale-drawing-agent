// Fixed, passive capture. Never replays a request or reads cookies/headers.
export function captureApi(options = {}) {
  if (!['https://www.kujiale.com', 'https://beta.kujiale.com', 'https://yun.kujiale.com', 'https://yun-beta.kujiale.com'].includes(location.origin) ||
      !location.pathname.startsWith('/pub/saas/workbench/construction/drawing_config/')) throw new Error('Not a configuration page');
  const key = '__drawingApiCaptureV1';
  if (!['start', 'stop', 'read', 'clear'].includes(options.action)) throw new Error('Invalid capture action');
  let state = window[key];
  if (options.action === 'start' && !state?.active) {
    const records = [], requests = new WeakMap(); let sequence = 0;
    const clean = (value, depth = 0) => {
      if (depth > 8) return '[depth limit]';
      if (Array.isArray(value)) return value.slice(0, 100).map(v => clean(v, depth + 1));
      if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).slice(0, 120).map(([k, v]) => [k, /token|cookie|authorization|password|secret|session/i.test(k) ? '[redacted]' : clean(v, depth + 1)]));
      return value;
    };
    const body = value => {
      if (typeof value !== 'string') return value == null ? null : { format: 'non-text', captured: false };
      if (value.length > 16000) return { format: 'oversize', characters: value.length, captured: false };
      try { return { format: 'json', captured: true, value: clean(JSON.parse(value)) }; }
      catch { return { format: 'encoded-or-text', characters: value.length, captured: false }; }
    };
    const add = (method, input, payload) => {
      let url; try { url = new URL(input, location.href); } catch { return null; }
      if (url.origin !== location.origin || !/^\/(construction-cms\/api|dcs-drawing\/site\/api)\//.test(url.pathname)) return null;
      const record = { id: ++sequence, at: new Date().toISOString(), method, path: url.pathname,
        query: clean(Object.fromEntries(url.searchParams)), requestBody: body(payload), status: 'pending' };
      records.push(record); if (records.length > 20) records.shift(); return record;
    };
    const originalFetch = window.fetch, proto = XMLHttpRequest.prototype;
    const originalOpen = proto.open, originalSend = proto.send;
    const wrappedFetch = function(input, init) {
      const record = add(init?.method || input?.method || 'GET', typeof input === 'string' || input instanceof URL ? String(input) : input.url, init?.body);
      const pending = originalFetch.apply(this, arguments);
      if (record) pending.then(response => {
        record.status = response.status;
        // Read a bounded clone; leave the application's response untouched.
        let reader;
        try { reader = response.clone().body?.getReader(); } catch { record.responseBody = { captured: false }; return; }
        if (!reader) return;
        void (async () => {
          let bytes = 0, text = ''; const decoder = new TextDecoder();
          try { while (true) { const part = await reader.read(); if (part.done) break;
            bytes += part.value.length; if (bytes > 16000) { record.responseBody = { format: 'oversize', captured: false }; await reader.cancel(); return; }
            text += decoder.decode(part.value, { stream: true }); }
            record.responseBody = body(text + decoder.decode());
          } catch { record.responseBody = { captured: false }; } finally { reader.releaseLock(); }
        })();
      }, () => { record.status = 'network-error'; });
      return pending;
    };
    const wrappedOpen = function(method, url) { requests.set(this, { method, url }); return originalOpen.apply(this, arguments); };
    const wrappedSend = function(payload) {
      const meta = requests.get(this); const record = meta && add(meta.method, meta.url, payload);
      if (record) this.addEventListener('loadend', () => {
        record.status = this.status;
        try { record.responseBody = this.responseType === 'json' ? body(JSON.stringify(this.response)) : !this.responseType || this.responseType === 'text' ? body(this.responseText) : { captured: false, format: this.responseType }; }
        catch { record.responseBody = { captured: false }; }
      }, { once: true });
      return originalSend.apply(this, arguments);
    };
    const stop = () => {
      if (window.fetch === wrappedFetch) window.fetch = originalFetch;
      if (proto.open === wrappedOpen) proto.open = originalOpen;
      if (proto.send === wrappedSend) proto.send = originalSend;
      state.active = false; clearTimeout(state.timer);
    };
    state = { active: true, records, stop, startedAt: new Date().toISOString() };
    window[key] = state; window.fetch = wrappedFetch; proto.open = wrappedOpen; proto.send = wrappedSend;
    state.timer = setTimeout(stop, 600000);
  }
  if (options.action === 'stop') state?.stop();
  if (options.action === 'clear') { state?.stop(); if (state) state.records.length = 0; }
  // Return newest records fitting the existing bridge's output budget.
  const output = [];
  for (const record of [...(state?.records || [])].reverse()) {
    if (JSON.stringify([...output, record]).length > 85000) break;
    output.unshift(record);
  }
  return { active: state?.active || false, startedAt: state?.startedAt, records: output,
    totalBuffered: state?.records.length || 0, replayed: false, saved: false, published: false,
    limitation: 'Current page only; refresh clears capture. Encoded and oversized bodies are not decoded. Stopping does not cancel in-flight reads.' };
}
