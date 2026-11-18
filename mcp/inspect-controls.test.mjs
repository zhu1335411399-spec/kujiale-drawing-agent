import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const source = await fs.readFile(new URL('../browser-extension/inspect-controls.js', import.meta.url), 'utf8');
const { inspectLineStyleControls } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const node = (label = '', selectors = {}, attributes = {}) => ({
  innerText: label, textContent: label, tagName: 'DIV', className: '', id: '',
  getClientRects: () => [1], getAttribute: key => attributes[key] ?? null,
  querySelectorAll: key => selectors[key] || [], closest: () => null
});
function fixture(headers = ['颜色', '线样式名称', '线宽(mm)', '线型']) {
  globalThis.location = { origin: 'https://www.kujiale.com', pathname: '/pub/saas/workbench/construction/drawing_config/config/style' };
  globalThis.getComputedStyle = () => ({ visibility: 'visible' });
  const control = node('', {}, { role: 'combobox', 'aria-controls': 'types', 'aria-expanded': 'true' });
  control.tagName = 'INPUT';
  const cells = headers.map(label => node(label === '线型' ? 'CONTINUOUS' : label, {
    'input,select,button,[role="combobox"],.ant-select,.ant-select-selector,[aria-haspopup],[tabindex]': label === '线型' ? [control] : []
  }));
  const row = node('', { td: cells }, { 'data-row-key': 'fixture-row' });
  const root = node('', { 'tbody tr[data-row-key]': [row] });
  const table = node('', { th: headers.map(label => node(label)) });
  table.closest = () => root;
  const popup = node('', { '[role="option"],option': [node('CONTINUOUS', {}, { 'data-value': 'CONTINUOUS' })] });
  globalThis.document = { querySelectorAll: () => [table], getElementById: id => id === 'types' ? popup : null };
}
test('refuses a different origin or page', () => {
  fixture(); location.origin = 'https://untrusted.example';
  assert.equal(inspectLineStyleControls().status, 'not-line-style-page');
});
test('does not mistake a missing table for an empty complete list', () => {
  fixture(); document.querySelectorAll = () => [];
  const result = inspectLineStyleControls();
  assert.equal(result.status, 'table-not-found');
  assert.equal(result.writesExecuted, false);
});
test('binds reordered columns and preserves incomplete popup coverage', () => {
  fixture();
  const result = inspectLineStyleControls();
  assert.equal(result.samples[0].fields[0].displayedText, 'CONTINUOUS');
  assert.equal(result.samples[0].fields[0].controls[0].controls, 'types');
  assert.equal(result.linkedPopups[0].options[0].value, 'CONTINUOUS');
  assert.equal(result.linkedPopups[0].complete, false);
  assert.equal(result.complete, false);
  assert.equal(result.interactionsExecuted, false);
});
test('reports a missing field instead of using another column', () => {
  fixture(['线样式名称', '颜色']);
  const result = inspectLineStyleControls();
  assert.equal(result.samples[0].fields[0].status, 'column-not-found');
  assert.equal(result.samples[0].fields[2].status, 'column-not-found');
});
test('inspects color structure independently from dropdown collection', () => {
  fixture();
  const result = inspectLineStyleControls();
  const color = result.samples[0].fields.find(field => field.field === '颜色');
  assert.equal(result.inspectorBuild, 'color-structure-2');
  assert.equal(color.colorStructure[0].tag, 'div');
  assert.equal(color.complete, false);
});
