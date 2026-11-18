import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestLineStyle } from '../browser-extension/create-line-style.js';
import { createProtocol } from './protocol.mjs';
function fixture({ unknownCreation = false, noAcknowledgement = false } = {}) {
  const calls = []; let rows = []; const listeners = new Set();
  const args = { pageId: 'fixture:1', expectedConfigName: 'MCP样式引用测试', expectedCustomerName: 'fixture-customer', name: 'MCP_TEST_unique_1234' };
  const clone = value => JSON.parse(JSON.stringify(value));
  const chromeApi = {
    scripting: { executeScript: async ({ args: [action] }) => {
      calls.push(action.action);
      let result;
      if (action.action === 'inspect') result = { status: 'observed', before: clone(rows) };
      else if (action.action === 'create') {
        rows = [{ id: 'new-row', name: 'New style', lineType: 'CONTINUOUS', color: '7', widthMm: '0.13' }];
        result = unknownCreation ? { executed: true, status: 'creation-outcome-unknown' } : { executed: true, status: 'created-ui-only', createdRow: clone(rows[0]) };
      } else if (action.action === 'rename') {
        rows[0].name = action.value; result = { executed: true, status: 'edited-ui-only', after: clone(rows[0]) };
      } else if (action.action === 'save') result = { executed: true, saveAcknowledged: !noAcknowledgement, saveNotice: noAcknowledgement ? null : '保存成功' };
      return [{ result }];
    } },
    tabs: { get: async () => ({ url: 'https://www.kujiale.com/config/style' }),
      reload: async () => { calls.push('reload'); for (const fn of [...listeners]) fn(1, { status: 'complete' }); },
      onUpdated: { addListener: fn => listeners.add(fn), removeListener: fn => listeners.delete(fn) } }
  };
  return { chromeApi, tabId: 1, args, calls };
}
test('creates, names, saves and reloads without publishing or activation', async () => {
  const f = fixture(); const result = await createTestLineStyle(f);
  assert.equal(result.status, 'created-saved-page-readback-verified');
  assert.equal(result.saved, true); assert.equal(result.published, false); assert.equal(result.activated, false);
  assert.equal(f.calls.filter(name => name === 'create').length, 1);
  assert.equal(f.calls.filter(name => name === 'save').length, 1);
});
test('does not rename, save or retry if creation outcome is unknown', async () => {
  const f = fixture({ unknownCreation: true }); const result = await createTestLineStyle(f);
  assert.equal(result.status, 'stopped-review-required'); assert.deepEqual(f.calls, ['inspect', 'create']);
});
test('does not reload or claim completion when save receipt is absent', async () => {
  const f = fixture({ noAcknowledgement: true }); const result = await createTestLineStyle(f);
  assert.equal(result.status, 'created-save-unverified'); assert.equal(result.saved, false);
  assert.equal(f.calls.includes('reload'), false);
});
test('rejects a non-test target before any browser script', async () => {
  const f = fixture(); f.args.expectedConfigName = 'production';
  assert.equal((await createTestLineStyle(f)).status, 'blocked'); assert.deepEqual(f.calls, []);
});
test('MCP dispatch uses a distinct scoped write operation', async () => {
  const calls = [];
  const dispatch = createProtocol({ page: async (...args) => { calls.push(args); return { created: false, saved: false }; } });
  const f = fixture();
  const reply = await dispatch({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'drawing_create_line_style', arguments: f.args } });
  assert.equal(reply.result.isError, undefined); assert.equal(calls[0][1], 'create-line-style');
  const rejected = await dispatch({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'drawing_create_line_style', arguments: { ...f.args, expectedConfigName: 'production' } } });
  assert.equal(rejected.error.code, -32602); assert.equal(calls.length, 1);
});
