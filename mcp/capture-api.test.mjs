import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureApi } from '../browser-extension/capture-api.js';
test('captures once, redacts secrets and restores functions', async () => {
  const old = Object.fromEntries(['window','location','XMLHttpRequest'].map(k => [k,globalThis[k]]));
  let calls = 0;
  const fetch = async () => { calls++; return new Response('{"ok":true}'); };
  class XHR { open() {} send() {} }
  globalThis.XMLHttpRequest = XHR;
  globalThis.location = { origin: 'https://www.kujiale.com', pathname: '/pub/saas/workbench/construction/drawing_config/config/style', href: 'https://www.kujiale.com/pub/saas/workbench/construction/drawing_config/config/style' };
  globalThis.window = { fetch };
  try {
    assert.equal(captureApi({action:'start'}).active,true);
    const wrapper = window.fetch;
    captureApi({action:'start'});
    assert.equal(window.fetch,wrapper);
    await window.fetch('/unrelated/analytics');
    await window.fetch('/construction-cms/api/test', {method:'POST',body:'{"token":"PRIVATE","name":"line"}'});
    await new Promise(resolve => setTimeout(resolve, 20));
    const result = captureApi({action:'stop'});
    assert.equal(calls,2); assert.equal(window.fetch,fetch);
    assert.equal(result.records.length,1);
    assert.equal(result.records[0].requestBody.value.token,'[redacted]');
    assert.equal(result.records[0].responseBody.value.ok,true);
    assert.equal(result.active,false);
  } finally { captureApi({action:'stop'}); for(const[k,v]of Object.entries(old))globalThis[k]=v; }
});
