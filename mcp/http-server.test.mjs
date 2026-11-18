import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import http from 'node:http';
import { startHttpBridge } from './http-server.mjs';
test('HTTP MCP initialize, tool list and browser request round trip', async () => {
  const b = await startHttpBridge({ port: 0 });
  const base = 'http://127.0.0.1:' + b.port;
  const post = async (route, value) => (await fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) })).json();
  try {
    const init = await post('/mcp', { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } });
    assert.equal(init.result.protocolVersion, '2025-03-26');
    const list = await post('/mcp', { jsonrpc: '2.0', id: 2, method: 'tools/list' });
    assert.ok(list.result.tools.some(t => t.name === 'drawing_read_api'));
    const clientId = randomUUID(), instanceId = randomUUID();
    await post('/bridge', { route: '/poll', clientId, instanceId });
    const pending = b.broker.page(clientId + ':1', 'api-read', { resource: 'observed-requests' });
    const { task } = await post('/bridge', { route: '/poll', clientId, instanceId });
    assert.equal(task.operation, 'api-read');
    await post('/bridge', { route: '/result', clientId, instanceId, id: task.id, value: { replayed: false } });
    assert.deepEqual(await pending, { replayed: false });
  } finally { await b.close(); }
});
test('rejects website origin and unexpected host', async () => {
  const b = await startHttpBridge({ port: 0 });
  try {
    const url = 'http://127.0.0.1:' + b.port + '/healthz';
    assert.equal((await fetch(url, { headers: { Origin: 'https://example.com' } })).status, 403);
    const status = await new Promise((resolve, reject) => {
      const req = http.get(url, { headers: { Host: 'example.com' } }, res => { res.resume(); resolve(res.statusCode); });
      req.on('error', reject);
    });
    assert.equal(status, 403);
  } finally { await b.close(); }
});
