import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDrawingApi } from '../browser-extension/read-api.js';
import { createProtocol } from './protocol.mjs';
test('HTTP 406 retains business reason without returning session payload', async () => {
  const oldLocation = globalThis.location, oldFetch = globalThis.fetch;
  globalThis.location = { origin: 'https://www.kujiale.com', pathname: '/pub/saas/workbench/construction/drawing_config/config/comment' };
  globalThis.fetch = async () => new Response(JSON.stringify({ code: 'CONDITION_REQUIRED', message: 'Missing request condition', data: { token: 'PRIVATE' } }), { status: 406, headers: { 'content-type': 'application/json' } });
  try {
    const result = await readDrawingApi({ resource: 'templates' });
    assert.equal(result.error, 'Drawing API HTTP 406');
    assert.equal(result.businessError.code, 'CONDITION_REQUIRED');
    assert.equal(result.businessError.message, 'Missing request condition');
    assert.equal(JSON.stringify(result).includes('PRIVATE'), false);
    assert.equal(result.saved, false);
  } finally { globalThis.location = oldLocation; globalThis.fetch = oldFetch; }
});
test('full config requires a unique observed ID before fetching', async () => {
  const oldLocation = globalThis.location, oldFetch = globalThis.fetch, oldPerformance = globalThis.performance;
  globalThis.location = { origin: 'https://www.kujiale.com', pathname: '/pub/saas/workbench/construction/drawing_config/config/comment' };
  globalThis.performance = { getEntriesByType: () => [] };
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error('unexpected'); };
  try { assert.equal((await readDrawingApi({ resource: 'full-config' })).status, 'blocked'); assert.equal(called, false); }
  finally { globalThis.location = oldLocation; globalThis.fetch = oldFetch; globalThis.performance = oldPerformance; }
});
test('MCP validates resource and routes an explicit target', async () => {
  let called;
  const dispatch = createProtocol({ page: async (...args) => { called = args; return { replayed: false }; } });
  const call = resource => dispatch({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'drawing_read_api', arguments: { pageId: 'chosen-page', resource } } });
  assert.equal((await call('save')).error.code, -32602);
  assert.equal(called, undefined);
  assert.equal((await call('observed-requests')).result.isError, undefined);
  assert.equal(called[0], 'chosen-page');
  assert.equal(called[1], 'api-read');
});
test('wrong origin is blocked before network access', async () => {
  const old = globalThis.location;
  globalThis.location = { origin: 'https://example.com', pathname: '/' };
  try { await assert.rejects(readDrawingApi({ resource: 'templates' }), /Not a drawing/); }
  finally { globalThis.location = old; }
});
test('templates uses fixed authenticated GET; rejects login HTML', async () => {
  const oldLocation = globalThis.location, oldFetch = globalThis.fetch;
  globalThis.location = { origin: 'https://www.kujiale.com', pathname: '/pub/saas/workbench/construction/drawing_config/config/style' };
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.equal(url, 'https://www.kujiale.com/construction-cms/api/templates');
    assert.equal(options.method, 'GET'); assert.equal(options.credentials, 'include');
    assert.equal(options.headers, undefined, 'Do not force JSON content negotiation or invent request headers');
    assert.equal(options.redirect, 'error');
    return new Response('<html>login</html>', { headers: { 'content-type': 'text/html' } });
  };
  try {
    await assert.rejects(readDrawingApi({ resource: 'save' }), /Unsupported/);
    assert.equal(calls, 0);
    const failed = await readDrawingApi({ resource: 'templates' });
    assert.match(failed.error, /Non-configuration page suspected/);
    assert.equal(failed.responseEvidence.bodyFormat, 'html');
    assert.ok(failed.responseEvidence.bodyMarkers.includes('login'));
    assert.equal(failed.responseEvidence.httpStatus, 200);
    assert.equal(failed.responseEvidence.contentType, 'text/html');
    assert.equal(calls, 1);
  } finally { globalThis.location = oldLocation; globalThis.fetch = oldFetch; }
});
