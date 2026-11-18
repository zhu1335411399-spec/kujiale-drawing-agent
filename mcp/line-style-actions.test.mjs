import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const source = await fs.readFile(new URL('../browser-extension/line-style-actions.js', import.meta.url), 'utf8');
const { lineStyleAction } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
function fixture() {
  let savedClicks = 0, createClicks = 0;
  const node = label => ({ innerText: label, isConnected: true, disabled: false, getClientRects: () => [1], getAttribute: () => null,
    querySelectorAll: () => [], querySelector: () => null });
  globalThis.location = { origin: 'https://www.kujiale.com', pathname: '/pub/saas/workbench/construction/drawing_config/config/style', href: 'fixture-url' };
  globalThis.getComputedStyle = () => ({ visibility: 'visible' });
  const selected = node('MCP样式引用测试');
  const status = node('当前 「基础配置」未激活 来自于 示例客户Alpha 2026-11-13 15:31:24');
  const root = node('');
  const table = node(''); table.closest = () => root; table.querySelectorAll = () => [node('线样式名称'), node('线型'), node('颜色'), node('线宽(mm)')];
  const save = node('保存'); save.click = () => savedClicks++;
  const create = node('新建样式'); create.click = () => createClicks++;
  const publish = node('发布'); publish.click = () => { throw new Error('Publish must never be clicked'); };
  globalThis.document = {
    querySelector: () => status,
    querySelectorAll: selector => selector.startsWith('.ant-select-selection') ? [selected] : selector === 'table' ? [table] : selector === 'button' ? [save, create, publish] : []
  };
  const options = { action: 'inspect', expectedConfigName: 'MCP样式引用测试', expectedCustomerName: '示例客户Alpha' };
  return { options, root, node, statusNode:status, saveButton: save, saved: () => savedClicks, created: () => createClicks };
}
test('reads without enabling writes', async () => {
  const f = fixture(); const result = await lineStyleAction(f.options);
  assert.equal(result.status, 'observed'); assert.equal(result.executed, false); assert.equal(f.saved(), 0);
});
test('rejects another customer, including substring matches', async () => {
  const f = fixture(); f.options.expectedCustomerName = '示例';
  const result = await lineStyleAction({ ...f.options, action: 'create', allowWrite: true });
  assert.equal(result.status, 'blocked'); assert.equal(f.created(), 0);
});
test('rejects writes without an explicit write-enabled invocation', async () => {
  const f = fixture(); const result = await lineStyleAction({ ...f.options, action: 'create' });
  assert.equal(result.status, 'blocked'); assert.equal(f.created(), 0);
});
test('never supports publish, activation, or deletion', async () => {
  const f = fixture();
  for (const action of ['publish', 'activate', 'delete']) assert.equal((await lineStyleAction({ ...f.options, action, allowWrite: true })).status, 'blocked');
});
test('a save click is explicitly unverified rather than saved', async () => {
  const f = fixture(); const result = await lineStyleAction({ ...f.options, action: 'save', allowWrite: true, expectedRows: [] });
  assert.equal(f.saved(), 1); assert.equal(result.status, 'save-requested-unverified');
  assert.equal(result.saved, false); assert.equal(result.persistedReadback, false);
});
test('refuses save if the expected table snapshot changed', async () => {
  const f = fixture(); const result = await lineStyleAction({ ...f.options, action: 'save', allowWrite: true, expectedRows: [{ id: 'other' }] });
  assert.equal(result.status, 'blocked'); assert.equal(f.saved(), 0);
});

test('save button tolerates the two-character label spacing inserted by the UI', async () => {
  const f=fixture();f.saveButton.innerText='保 存';
  const result=await lineStyleAction({...f.options,action:'save',allowWrite:true,expectedRows:[]});
  assert.equal(f.saved(),1);assert.equal(result.saved,false);
});

test('save confirmation checks the exact configuration and customer before submission',async()=>{
  const f=fixture();let confirmed=0;
  const confirm=f.node('保 存');confirm.click=()=>confirmed++;
  const modal=f.node('确认将基础配置MCP样式引用测试保存在示例客户Alpha? 主账号邮箱: masked');modal.querySelectorAll=()=>[confirm];
  const original=document.querySelectorAll;document.querySelectorAll=s=>s==='[role="dialog"],.ant-modal'?[modal]:original(s);
  const r=await lineStyleAction({...f.options,action:'confirmSave',allowWrite:true,expectedRows:[]});assert.equal(confirmed,1);assert.equal(f.saved(),0);assert.equal(r.saved,false);
  modal.innerText='确认将基础配置MCP样式引用测试保存在其他客户?';
  const blocked=await lineStyleAction({...f.options,action:'confirmSave',allowWrite:true,expectedRows:[]});assert.equal(blocked.executed,false);assert.equal(confirmed,1);
});
function styleRow(f) {
  const values = { name: 'MCP_TEST_initial', lineType: 'CONTINUOUS', color: '150', widthMm: '0.13' };
  const cells = Object.values(values).map(f.node);
  const row = f.node(''); row.getAttribute = () => 'fixture-style'; row.querySelectorAll = () => cells;
  f.root.querySelectorAll = () => [row];
  return { values, cells };
}
test('renames a bound test row using input/change events and UI readback', async () => {
  const f = fixture(); const { values, cells } = styleRow(f);
  class Input { constructor(value) { this._value = value; this.events = []; } get value() { return this._value; } set value(value) { this._value = value; } }
  const input = new Input(values.name);
  Object.assign(input, { getClientRects: () => [1], dispatchEvent: event => input.events.push(event.type), blur: () => {} });
  globalThis.HTMLInputElement = Input;
  cells[0].querySelectorAll = () => [input];
  const result = await lineStyleAction({ ...f.options, action: 'rename', allowWrite: true, rowId: 'fixture-style', expectedOriginal: values, value: 'MCP_TEST_edited' });
  assert.equal(result.status, 'edited-ui-only');
  assert.equal(result.after.name, 'MCP_TEST_edited');
  assert.deepEqual(input.events, ['input', 'change']);
  assert.equal(result.saved, false);
});
test('selects only the exact option linked to the intended row', async () => {
  const f = fixture(); const { values, cells } = styleRow(f);
  const input = { getAttribute: key => key === 'aria-controls' ? 'target-list' : null };
  cells[1].querySelector = () => input;
  const option = f.node('DASHED'); option.classList = { contains: () => false };
  option.click = () => { cells[1].innerText = 'DASHED'; };
  const popup = f.node(''); popup.querySelectorAll = () => [option];
  document.getElementById = id => id === 'target-list' ? { closest: () => popup } : null;
  const select = document.querySelectorAll;
  document.querySelectorAll = selector => selector === '.ant-select-dropdown' ? [popup] : select(selector);
  const result = await lineStyleAction({ ...f.options, action: 'lineType', allowWrite: true, rowId: 'fixture-style', expectedOriginal: values, value: 'DASHED' });
  assert.equal(result.status, 'edited-ui-only');
  assert.equal(result.after.lineType, 'DASHED');
  assert.equal(result.after.color, values.color);
});
test('edits the observed color-index input without choosing a guessed swatch', async () => {
  const f = fixture(); const { values, cells } = styleRow(f);
  let open = false;
  class Input { get value() { return this._value; } set value(value) { this._value = value; } }
  const input = new Input(); input.value = '150';
  Object.assign(input, { getClientRects: () => [1], getAttribute: key => key === 'min' ? '0' : key === 'max' ? '255' : null,
    dispatchEvent: () => { cells[2].innerText = input.value; }, blur: () => {} });
  globalThis.HTMLInputElement = Input;
  globalThis.MouseEvent = class { constructor(type) { this.type = type; } };
  const trigger = f.node(''); trigger.click = () => { open = true; };
  cells[2].querySelectorAll = selector => selector.startsWith('[class') ? [trigger] : [];
  const panel = f.node(''); panel.getClientRects = () => open ? [1] : []; panel.querySelectorAll = () => [input];
  document.body = { dispatchEvent: () => { open = false; } };
  const query = document.querySelectorAll;
  document.querySelectorAll = selector => selector.startsWith('[class*="ColorPickerPanel-colorPickerContainer') ? (open ? [panel] : []) : query(selector);
  const result = await lineStyleAction({ ...f.options, action: 'colorIndex', allowWrite: true, rowId: 'fixture-style', expectedOriginal: values, value: '1' });
  assert.equal(result.status, 'edited-ui-only'); assert.equal(result.after.color, '1');
  assert.equal(result.after.lineType, values.lineType); assert.equal(open, false); assert.equal(result.saved, false);
});
test('does not reinterpret an RGB string as a color index', async () => {
  const f = fixture(); const { values } = styleRow(f);
  const result = await lineStyleAction({ ...f.options, action: 'colorIndex', allowWrite: true, rowId: 'fixture-style', expectedOriginal: values, value: 'rgb(255,0,0)' });
  assert.equal(result.status, 'blocked'); assert.equal(result.executed, false);
});
test('observes a fresh business success notice without claiming persistence', async () => {
  const f = fixture(); let shown = false, callback;
  const notice = f.node('保存成功'); notice.contains = () => false;
  const query = document.querySelectorAll;
  document.querySelectorAll = selector => selector.startsWith('[role="alert"]') ? (shown ? [notice] : []) : query(selector);
  document.body = {};
  const oldObserver = globalThis.MutationObserver;
  globalThis.MutationObserver = class { constructor(fn) { callback = fn; } observe() {} disconnect() {} };
  f.saveButton.click = () => { shown = true; callback([{ target: document.body, addedNodes: [notice] }]); };
  try {
    const result = await lineStyleAction({ ...f.options, action: 'save', allowWrite: true, expectedRows: [] });
    assert.equal(result.saveAcknowledged, true); assert.equal(result.saveNotice, '保存成功');
    assert.equal(result.saved, false); assert.equal(result.persistedReadback, false);
  } finally { globalThis.MutationObserver = oldObserver; }
});
test('does not accept a stale save-success toast as a new acknowledgement', async () => {
  const f = fixture(); const notice = f.node('保存成功'); notice.contains = () => false;
  const query = document.querySelectorAll;
  document.querySelectorAll = selector => selector.startsWith('[role="alert"]') ? [notice] : query(selector);
  document.body = {};
  const oldObserver = globalThis.MutationObserver, oldTimeout = globalThis.setTimeout;
  globalThis.MutationObserver = class { observe() {} disconnect() {} };
  globalThis.setTimeout = callback => { queueMicrotask(callback); return 0; };
  try {
    const result = await lineStyleAction({ ...f.options, action: 'save', allowWrite: true, expectedRows: [] });
    assert.equal(result.saveAcknowledged, false); assert.equal(result.saved, false);
  } finally { globalThis.MutationObserver = oldObserver; globalThis.setTimeout = oldTimeout; }
});

test('a newer save time for the same customer is fresh acknowledgement without a toast',async()=>{
  const f=fixture();let callback;const oldObserver=globalThis.MutationObserver;
  document.body={};globalThis.MutationObserver=class{constructor(fn){callback=fn;}observe(){}disconnect(){}};
  f.saveButton.click=()=>{f.statusNode.innerText='当前 「基础配置」未激活 来自于 示例客户Alpha 2026-11-13 15:32:24';callback([]);};
  try{const r=await lineStyleAction({...f.options,action:'save',allowWrite:true,expectedRows:[]});assert.equal(r.saveAcknowledged,true);assert.match(r.saveNotice,/配置保存时间已更新/);assert.equal(r.saved,false);}
  finally{globalThis.MutationObserver=oldObserver;}
});
