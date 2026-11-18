import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const source = await fs.readFile(new URL('../browser-extension/read-color.js', import.meta.url), 'utf8');
const { readLineColorPanel } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
function fixture({ closeFails = false, changed = false, ambiguous = false } = {}) {
  let open = false, clicked = 0;
  const make = (label = '', cls = '') => ({ innerText: label, className: cls, tagName: 'DIV', isConnected: true,
    getClientRects: () => [1], getAttribute: () => null, querySelectorAll: () => [], contains: () => false });
  globalThis.location = { origin: 'https://www.kujiale.com', pathname: '/pub/saas/workbench/construction/drawing_config/config/style', href: 'fixture-url' };
  globalThis.getComputedStyle = node => ({ visibility: 'visible', backgroundColor: node.bg || 'rgba(0, 0, 0, 0)' });
  globalThis.MouseEvent = class { constructor(type) { this.type = type; } };
  const trigger = make('', 'ColorPickerPanel-colorBlock_test'); trigger.bg = 'rgb(0, 127, 255)';
  trigger.click = () => { open = true; clicked++; };
  const cell = make('150'); cell.querySelectorAll = () => ambiguous ? [trigger, trigger] : [trigger];
  const row = make('150'); row.getAttribute = () => 'fixture-row';
  row.querySelectorAll = selector => selector === 'td' ? [cell, make('name')] : selector.startsWith('[class') ? [trigger] : [];
  Object.defineProperty(row, 'innerText', { get: () => changed && clicked ? 'changed' : '150' });
  const root = make(); root.querySelectorAll = () => [row];
  const table = make(); table.querySelectorAll = () => [make('颜色'), make('线样式名称')]; table.closest = () => root;
  const swatch = make('', 'ColorPicker-swatch'); swatch.bg = 'rgb(255, 0, 0)';
  swatch.click = () => { throw new Error('Must never select a color'); };
  const panel = make('', 'ant-popover'); panel.querySelectorAll = () => [swatch];
  panel.getClientRects = () => open ? [1] : [];
  const shortSelector = '.ant-popover,.ant-modal,.ant-dropdown,.ant-select-dropdown,[role="dialog"]';
  globalThis.document = {
    body: { dispatchEvent: event => { assert.ok(['mousedown', 'pointerdown'].includes(event.type)); if (!closeFails) open = false; } },
    querySelector: () => make('fixture-config'),
    querySelectorAll: selector => selector === 'table' ? [table] : selector === shortSelector ? (open ? [panel] : []) : [trigger, ...(open ? [panel] : [])]
  };
  return { isOpen: () => open, clicks: () => clicked };
}
async function run(options) {
  const timeout = globalThis.setTimeout;
  globalThis.setTimeout = callback => { queueMicrotask(callback); return 0; };
  try { const state = fixture(options); return { state, result: await readLineColorPanel() }; }
  finally { globalThis.setTimeout = timeout; }
}
test('observes the panel without selecting a color and verifies dismissal', async () => {
  const { result, state } = await run();
  assert.equal(result.status, 'panel-observed');
  assert.equal(result.panels[0].renderedSwatches[0].color, 'rgb(255, 0, 0)');
  assert.equal(result.valuesUnchanged, true);
  assert.equal(result.closed, true);
  assert.equal(result.complete, false);
  assert.equal(state.clicks(), 1);
});
test('reports failed dismissal', async () => {
  const { result } = await run({ closeFails: true });
  assert.equal(result.status, 'stopped-popup-not-closed');
  assert.equal(result.valuesUnchanged, true);
});
test('detects an unexpected table change', async () => {
  const { result } = await run({ changed: true });
  assert.equal(result.status, 'stopped-state-changed');
  assert.equal(result.valuesUnchanged, false);
});
test('refuses ambiguous triggers without clicking', async () => {
  const state = fixture({ ambiguous: true });
  await assert.rejects(readLineColorPanel(), /ambiguous/);
  assert.equal(state.clicks(), 0);
});
test('refuses a different origin', async () => {
  fixture(); location.origin = 'https://untrusted.example';
  await assert.rejects(readLineColorPanel(), /configuration page/);
});
