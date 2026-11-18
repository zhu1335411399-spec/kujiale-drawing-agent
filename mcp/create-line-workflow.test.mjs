import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLineWorkflow, validateLineRequest } from '../browser-extension/create-line-workflow.js';
const args = { requestId: 'request-001', expectedConfigName: '模板A', expectedCustomerName: '客户A', name: '测试线条', lineType: 'DASHED', scale: '200', colorIndex: '251', widthMm: '0.13' };
test('runs all five fields through save and fresh readback', async () => {
  const ledger = {}; let row, listener; const actions = [];
  const chromeApi = {
    storage: { local: { get: async key => ({ [key]: ledger[key] }), set: async value => Object.assign(ledger, value) } },
    tabs: { get: async () => ({ url: 'same' }), onUpdated: { addListener: fn => { listener = fn; }, removeListener: () => {} }, reload: async () => listener(1, { status: 'complete' }) },
    scripting: { executeScript: async options => {
      if (!options.args) return [{ result: { page: '1', hasNext: false } }];
      const a = options.args[0]; actions.push(a.action);
      if (a.action === 'inspect') return [{ result: { status: 'observed', before: row ? [{ ...row }] : [] } }];
      if (a.action === 'create') { row = { id: '1', name: 'new', lineType: 'CONTINUOUS', scale: '', color: '7', widthMm: '0.25' }; return [{ result: { status: 'created-ui-only', createdRow: { ...row } } }]; }
      if (a.action === 'save') return [{ result: { executed: true, saveAcknowledged: true, saveNotice: '保存成功' } }];
      row[a.action === 'rename' ? 'name' : a.action === 'colorIndex' ? 'color' : a.action] = a.value;
      return [{ result: { status: 'edited-ui-only', after: { ...row } } }];
    } }
  };
  const result = await createLineWorkflow({ chromeApi, tabId: 1, args });
  assert.equal(result.saved, true); assert.equal(result.persistedReadback, true);
  assert.deepEqual(actions.filter(a => a !== 'inspect'), ['create', 'rename', 'lineType', 'scale', 'colorIndex', 'widthMm', 'save']);
  assert.equal(result.published, false);
});
test('validates all fields before contacting browser', async () => {
  assert.doesNotThrow(() => validateLineRequest(args));
  for (const bad of [{ scale: 'NaN' }, { colorIndex: '256' }, { widthMm: '0' }, { lineType: 'anything()' }])
    assert.throws(() => validateLineRequest({ ...args, ...bad }));
  const result = await createLineWorkflow({ chromeApi: {}, tabId: 1, args: { ...args, scale: '0' } });
  assert.equal(result.status, 'blocked');
});
test('used request never creates a second row', async () => {
  const chromeApi = { storage: { local: { get: async key => ({ [key]: { status: 'needs-review' } }) } } };
  const result = await createLineWorkflow({ chromeApi, tabId: 1, args });
  assert.equal(result.status, 'request-already-used');
});
test('duplicate name blocks before creation', async () => {
  const chromeApi = { storage: { local: { get: async () => ({}) } }, scripting: { executeScript: async () => [{ result: { status: 'observed', before: [{ name: args.name }] } }] } };
  const result = await createLineWorkflow({ chromeApi, tabId: 1, args });
  assert.equal(result.created, false); assert.match(result.error, /Duplicate|duplicate/);
});
test('uncertain creation is retained and never saved or retried', async () => {
  const ledger = {}; let calls = 0;
  const chromeApi = { storage: { local: { get: async key => ({ [key]: ledger[key] }), set: async value => Object.assign(ledger, value) } },
    scripting: { executeScript: async options => {
      calls++;
    if (!options.args) return [{ result: { page: '1', hasNext: false } }];
      return [{ result: options.args[0].action === 'inspect' ? { status: 'observed', before: [] } : { status: 'creation-outcome-unknown' } }];
    } } };
  const result = await createLineWorkflow({ chromeApi, tabId: 1, args });
  assert.equal(result.status, 'needs-review'); assert.equal(result.saved, false);
  const count = calls; await createLineWorkflow({ chromeApi, tabId: 1, args }); assert.equal(calls, count);
});
