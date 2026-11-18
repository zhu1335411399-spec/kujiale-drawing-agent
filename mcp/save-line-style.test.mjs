import test from 'node:test';
import assert from 'node:assert/strict';
import { saveAndVerifyLineStyle } from '../browser-extension/save-line-style.js';
function fixture({ acknowledged = true, changedAfterSave = false, redirect = false, wrongFreshValue = false } = {}) {
  const style = { id: 'fixture-style', name: 'MCP_TEST_saved', lineType: 'CONTINUOUS', color: '1', widthMm: '0.25' };
  let reads = 0, saves = 0, reloads = 0;
  const listeners = new Set();
  const chromeApi = {
    scripting: { executeScript: async ({ args: [action] }) => {
      if (action.action === 'save') { saves++; return [{ result: { executed: true, saveAcknowledged: acknowledged, saveNotice: acknowledged ? '保存成功' : null } }]; }
      reads++;
      const mismatch = changedAfterSave && reads === 2 || wrongFreshValue && reloads > 0;
      return [{ result: { status: 'observed', before: [{ ...style, widthMm: mismatch ? '0.50' : style.widthMm }] } }];
    } },
    tabs: {
      get: async () => ({ url: redirect && reloads ? 'https://www.kujiale.com/other' : 'https://www.kujiale.com/config/style' }),
      reload: async () => { reloads++; for (const listener of [...listeners]) listener(1, { status: 'complete' }); },
      onUpdated: { addListener: fn => listeners.add(fn), removeListener: fn => listeners.delete(fn) }
    }
  };
  return { chromeApi, tabId: 1, target: { configName: 'MCP样式引用测试', customerName: 'fixture-customer' }, styleId: style.id,
    expectedValues: style, counts: () => ({ reads, saves, reloads, listeners: listeners.size }) };
}
test('requires a save acknowledgement and fresh-page readback', async () => {
  const f = fixture(); const result = await saveAndVerifyLineStyle(f);
  assert.equal(result.saved, true); assert.equal(result.persistedReadback, true);
  assert.equal(result.serverApiVerified, false); assert.equal(result.published, false);
  assert.deepEqual(f.counts(), { reads: 3, saves: 1, reloads: 1, listeners: 0 });
});
test('does not reload or retry when acknowledgement is missing', async () => {
  const f = fixture({ acknowledged: false }); const result = await saveAndVerifyLineStyle(f);
  assert.equal(result.saved, false); assert.equal(result.status, 'save-outcome-unverified');
  assert.equal(f.counts().saves, 1); assert.equal(f.counts().reloads, 0);
});
test('cancels reload if the visible values changed after saving', async () => {
  const f = fixture({ changedAfterSave: true }); const result = await saveAndVerifyLineStyle(f);
  assert.equal(result.saved, false); assert.equal(f.counts().reloads, 0);
});
test('rejects navigation to another page after reload', async () => {
  const f = fixture({ redirect: true }); const result = await saveAndVerifyLineStyle(f);
  assert.equal(result.saved, false); assert.match(result.error, /target URL/);
  assert.equal(f.counts().listeners, 0);
});
test('does not claim persistence if reloaded values differ', async () => {
  const f = fixture({ wrongFreshValue: true }); const result = await saveAndVerifyLineStyle(f);
  assert.equal(result.saved, false); assert.equal(result.persistedReadback, false);
  assert.equal(f.counts().saves, 1);
});
