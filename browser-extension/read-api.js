// Reuses the model bridge's fetch(credentials: include) approach, with fixed
// read operations instead of arbitrary scripts or caller-provided URLs.
export async function readDrawingApi(options = {}) {
  const origin = location.origin;
  if (!['https://www.kujiale.com', 'https://beta.kujiale.com', 'https://yun.kujiale.com', 'https://yun-beta.kujiale.com'].includes(origin) ||
      !location.pathname.startsWith('/pub/saas/workbench/construction/drawing_config/')) throw new Error('Not a drawing configuration page');
  if (options.resource === 'observed-requests') {
    const items = performance.getEntriesByType('resource').flatMap(entry => {
      const url = new URL(entry.name, origin);
      if (url.origin !== origin || !/^\/(construction-cms\/api|dcs-drawing\/site\/api)\//.test(url.pathname)) return [];
      return [{ path: url.pathname, queryKeys: [...new Set(url.searchParams.keys())], initiator: entry.initiatorType }];
    });
    return { source: 'resource-timing', requests: [...new Map(items.map(x => [JSON.stringify(x), x])).values()],
      includesBodies: false, includesQueryValues: false, replayed: false,
      limitation: 'Only current resource timing entries; methods, request bodies and response bodies are unavailable.' };
  }
  if (!['templates', 'full-config'].includes(options.resource)) throw new Error('Unsupported API resource');
  let requestUrl = origin + '/construction-cms/api/templates';
  if (options.resource === 'full-config') {
    const observed = performance.getEntriesByType('resource').map(e => new URL(e.name, origin))
      .filter(url => url.origin === origin && url.pathname === '/dcs-drawing/site/api/open/config/full/get' && url.searchParams.has('obsRootConfigId'));
    if (new Set(observed.map(url => url.searchParams.get('obsRootConfigId'))).size !== 1)
      return { status: 'blocked', error: 'No unique full-config request. Refresh target page before reading.', saved: false, published: false };
    requestUrl = observed.at(-1).href;
  }
  const controller = new AbortController();
  let responseEvidence;
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(requestUrl, {
      method: 'GET', credentials: 'include', redirect: 'error', cache: 'no-store', signal: controller.signal
    });
    responseEvidence = { httpStatus: response.status, contentType: response.headers.get('content-type') || '', responsePath: new URL(response.url || requestUrl).pathname };
    const text = await response.text();
    responseEvidence.responseBytes = new TextEncoder().encode(text).length;
    if (new TextEncoder().encode(text).length > 100000) throw new Error('Response exceeds bridge limit; dedicated pagination adapter required');
    let data;
    let normalized = text.replace(/^\uFEFF/, '').trim();
    // Some endpoints use an XSSI prefix or return gzip/base64 text instead of
    // application/json. Never evaluate JavaScript or execute returned markup.
    normalized = normalized.replace(/^\)\]\}',?\s*\n/, '').replace(/^while\s*\(1\);\s*/, '');
    try {
      if (/^H4sI[A-Za-z0-9+/=\r\n]+$/.test(normalized)) {
        const bytes = Uint8Array.from(atob(normalized.replace(/\s/g, '')), c => c.charCodeAt(0));
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
        const reader = stream.getReader(); let decoded = '', decodedBytes = 0;
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { value, done } = await reader.read(); if (done) break;
            decodedBytes += value.length;
            if (decodedBytes > 100000) { await reader.cancel(); throw new Error('Decoded response exceeds bridge limit'); }
            decoded += decoder.decode(value, { stream: true });
          }
          normalized = decoded + decoder.decode();
        } finally { reader.releaseLock(); }
        responseEvidence.bodyEncoding = 'base64-gzip';
      }
      data = JSON.parse(normalized);
    } catch (parseError) {
      const looksHtml = /<(?:!doctype\s+html|html|head|body)\b/i.test(normalized);
      const markers = [];
      for (const [label, pattern] of [['login', /登录|sign[ -]?in|login/i], ['verification', /验证码|人机验证|captcha|challenge/i], ['access-denied', /access denied|forbidden|无权|禁止访问/i]]) if (pattern.test(normalized)) markers.push(label);
      responseEvidence.bodyFormat = looksHtml ? 'html' : /^[A-Za-z0-9+/=\r\n]+$/.test(normalized) ? 'base64-like' : /^\w+\s*\(/.test(normalized) ? 'javascript-wrapper-like' : 'unrecognized-text';
      responseEvidence.bodyMarkers = markers;
      responseEvidence.firstCharacterCode = normalized.length ? normalized.codePointAt(0) : null;
      responseEvidence.bodyEncoding ||= 'unidentified';
      if (looksHtml || markers.length) throw new Error('Non-configuration page suspected; inspect bodyFormat and bodyMarkers');
      return { source: 'business-api', status: 'response-received-unparsed',
        responseEvidence, businessSuccessVerified: false, configurationParsed: false,
        rawText: text, saved: false, published: false };
    }
    if (!response.ok) {
      // Return only error fields, never the whole error payload (which may
      // include session details). Do not retry or change authentication.
      const fields = {};
      const collect = (value, prefix = '', depth = 0) => {
        if (!value || typeof value !== 'object' || depth > 2) return;
        for (const [key, item] of Object.entries(value)) {
          if (/^(code|errorCode|error_code|message|msg|error|errorMessage|reason|success)$/i.test(key) && ['string', 'number', 'boolean'].includes(typeof item)) {
            fields[prefix + key] = typeof item === 'string' ? item.slice(0, 800)
              .replace(/https?:\/\/\S+/gi, '[url omitted]')
              .replace(/((?:token|cookie|authorization|session|secret|password)\s*[:=]\s*)\S+/gi, '$1[redacted]') : item;
          } else if (/^(error|errors|data|result)$/i.test(key)) collect(item, prefix + key + '.', depth + 1);
        }
      };
      collect(data);
      return { source: 'business-api', status: 'failed', error: 'Drawing API HTTP ' + response.status,
        responseEvidence, businessError: fields, responseKeys: Object.keys(data || {}).slice(0, 30), saved: false, published: false };
    }
    if (location.origin !== origin) throw new Error('Page changed during read');
    return { source: 'business-api', path: new URL(requestUrl).pathname, httpStatus: response.status,
      businessSuccessVerified: false, responseEvidence, data, saved: false, published: false };
  } catch (error) {
    return { source: 'business-api', status: 'failed', error: error.message, errorName: error.name, responseEvidence, saved: false, published: false };
  } finally { clearTimeout(timer); }
}
