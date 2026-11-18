import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const source = await fs.readFile(new URL('../browser-extension/read-options.js', import.meta.url), 'utf8');
const { readLineStyleOptions } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
function fixture({ changed = false, openFails = false, escapeFails = false, outsideFails = false } = {}) {
  let open = false, top = 0, interactions = 0;
  const make = (label = '') => ({ innerText: label, tagName: 'DIV', className: '', isConnected: true,
    getClientRects: () => [1], getAttribute: () => null, querySelectorAll: () => [], querySelector: () => null,
    dispatchEvent: () => { throw new Error('Unexpected UI mutation'); } });
  globalThis.location = { origin: 'https://www.kujiale.com', pathname: '/pub/saas/workbench/construction/drawing_config/config/style', href: 'https://www.kujiale.com/pub/saas/workbench/construction/drawing_config/config/style' };
  globalThis.getComputedStyle = () => ({ visibility: 'visible' });
  globalThis.MouseEvent = class { constructor(type, options) { this.type = type; Object.assign(this, options); } };
  globalThis.KeyboardEvent = globalThis.MouseEvent;
  const input = make(); input.value = 'original'; input.getAttribute = key => ({ 'aria-controls': 'list', 'aria-expanded': String(open) })[key] ?? null;
  input.dispatchEvent = event => { assert.equal(event.key, 'Escape'); if (!escapeFails) open = false; };
  const trigger = make(); trigger.dispatchEvent = event => { assert.equal(event.type, 'mousedown'); interactions++; if (!openFails) open = !open; };
  const headers = ['颜色', '线型', '线宽(mm)', '线样式名称'];
  const cells = headers.map(header => {
    const cell = make(header === '颜色' ? '150' : 'original');
    cell.querySelector = selector => header === '颜色' ? null : selector.startsWith('input') ? input : trigger;
    return cell;
  });
  const row = make('original'); row.getAttribute = () => 'row-1';
  row.querySelectorAll = selector => selector === 'td' ? cells : [];
  Object.defineProperty(row, 'innerText', { get: () => changed && interactions ? 'changed' : 'original' });
  const root = make(); root.querySelectorAll = () => [row];
  const table = make(); table.closest = () => root; table.querySelectorAll = () => headers.map(make);
  const holder = make(); holder.clientHeight = 100; holder.scrollHeight = 300;
  Object.defineProperty(holder, 'scrollTop', { get: () => top, set: value => { top = Math.max(0, Math.min(200, value)); } });
  holder.dispatchEvent = event => assert.equal(event.type, 'scroll');
  const popup = make(); popup.getClientRects = () => open ? [1] : [];
  popup.querySelector = () => holder;
  popup.querySelectorAll = () => {
    const option = make(['A', 'B', 'C'][Math.min(2, Math.floor(top / 75))]);
    option.classList = { contains: () => false };
    return [option];
  };
  globalThis.document = {
    body: { dispatchEvent: event => { assert.ok(['pointerdown', 'mousedown'].includes(event.type)); if (!outsideFails) open = false; } },
    querySelectorAll: selector => selector === 'table' ? [table] : [popup],
    querySelector: () => make('fixture-config'),
    getElementById: () => ({ closest: () => popup })
  };
  return { isOpen: () => open };
}
async function runFast(options) {
  const originalTimeout = globalThis.setTimeout;
  globalThis.setTimeout = callback => { queueMicrotask(callback); return 0; };
  try { const state = fixture(options); return { state, result: await readLineStyleOptions() }; }
  finally { globalThis.setTimeout = originalTimeout; }
}
test('scrolls virtualized UI labels and closes without claiming completeness', async () => {
  const { state, result } = await runFast();
  assert.deepEqual(result.fields[0].options.map(item => item.label), ['A', 'B', 'C']);
  assert.equal(result.fields[0].traversalReachedEnd, true);
  assert.equal(result.fields[0].complete, false);
  assert.equal(result.valuesUnchanged, true);
  assert.equal(result.fields[2].status, 'separate-adapter-needed');
  assert.equal(state.isOpen(), false);
});
test('stops after detecting an unexpected value change', async () => {
  const { result, state } = await runFast({ changed: true });
  assert.equal(result.status, 'stopped-state-changed');
  assert.equal(result.valuesUnchanged, false);
  assert.equal(result.fields.length, 1);
  assert.equal(state.isOpen(), false);
});
test('reports failed opening without selecting an option', async () => {
  const { result, state } = await runFast({ openFails: true });
  assert.equal(result.fields[0].status, 'failed');
  assert.equal(result.fields[0].options.length, 0);
  assert.equal(result.valuesUnchanged, true);
  assert.equal(state.isOpen(), false);
});
test('dismisses through outside down when Escape is ignored', async () => {
  const { result, state } = await runFast({ escapeFails: true });
  assert.equal(result.fields[0].closed, true);
  assert.equal(result.fields[1].field, '线宽(mm)');
  assert.equal(result.valuesUnchanged, true);
  assert.equal(state.isOpen(), false);
});
test('stops before the next field when the overlay cannot be dismissed', async () => {
  const { result } = await runFast({ escapeFails: true, outsideFails: true });
  assert.equal(result.status, 'stopped-popup-not-closed');
  assert.equal(result.valuesUnchanged, true);
  assert.equal(result.fields.length, 1);
});
